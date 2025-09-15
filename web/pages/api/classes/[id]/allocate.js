import { requireAuth } from '../../../../lib/auth';
import { dbConnect } from '../../../../lib/db';
import { ClassModel, Group } from '../../../../lib/models';

function allocateSeats(students = [], groups = [], tables = [], options = {}){
	const strategy = options.strategy || 'spread_groups';
	const frontWeight = Number(options.frontWeight||0); // optional bias for lower row indexes

	const groupByMember = new Map();
	for (const g of groups){
		for (const sid of (g.memberIds||[])){
			const arr = groupByMember.get(String(sid)) || [];
			arr.push(g.id);
			groupByMember.set(String(sid), arr);
		}
	}

	const totalSeats = tables.reduce((sum, t) => sum + (t.seats||0), 0);
	if (students.length > totalSeats) throw new Error('Not enough seats for all students');

	const orderedTables = [...tables]
		.map(t=>({ id:String(t.id), row:t.row|0, col:t.col|0, seats:t.seats|0, assigned:[] }))
		.sort((a,b)=> a.row - b.row || a.col - b.col);

	function tableScore(t, sid){
		const remaining = t.seats - t.assigned.length;
		if (remaining <= 0) return -Infinity;
		let score = remaining * 10; // prefer more capacity
		// optional bias: earlier rows higher score
		score += Math.max(0, 5 - t.row) * frontWeight;
		if (strategy === 'spread_groups'){
			const memberGroups = groupByMember.get(String(sid)) || [];
			// penalize if any teammate already at this table
			if (memberGroups.length){
				const teammateHere = t.assigned.some(aid => {
					const gA = groupByMember.get(String(aid)) || [];
					return gA.some(id => memberGroups.includes(id));
				});
				if (teammateHere) score -= 8; // push to different table if possible
			}
		}
		return score;
	}

	function pickBestTableFor(sid){
		let best = null;
		for (const t of orderedTables){
			const s = tableScore(t, sid);
			if (s === -Infinity) continue;
			if (!best || s > best.s || (s===best.s && (t.row < best.t.row || (t.row===best.t.row && t.col < best.t.col)))){
				best = { t, s };
			}
		}
		return best?.t || null;
	}

	const placed = new Set();
	if (strategy === 'round_robin'){
		// simple RR by table order
		let idx = 0;
		for (const s of students){
			let loops = 0;
			while (loops < orderedTables.length){
				const t = orderedTables[idx % orderedTables.length];
				if (t.assigned.length < t.seats){ t.assigned.push(String(s.id)); placed.add(String(s.id)); break; }
				idx++; loops++;
			}
		}
	} else {
		// spread_groups (default) with best-table heuristic
		for (const s of students){
			const sid = String(s.id);
			const t = pickBestTableFor(sid);
			if (!t) throw new Error('No seat available');
			t.assigned.push(sid);
			placed.add(sid);
		}
	}

	return { tables: orderedTables.map(t=>({ id:t.id, row:t.row, col:t.col, seats:t.seats, assigned:[...t.assigned] })) };
}

async function handler(req, res){
	await dbConnect();
	const { id } = req.query;
	if (req.method !== 'POST') return res.status(405).end();
	const c = await ClassModel.findOne({ _id:id, teacher:req.user.sub }).populate('students');
	if (!c) return res.status(404).json({ message:'Class not found' });
	const groups = await Group.find({ teacher:req.user.sub, members: { $in: c.students.map(s=>s._id) } }).populate('members');
	const students = c.students.map(s=>({ id:String(s._id), name:s.name }));
	const groupMap = groups.map(g=>({ id:String(g._id), name:g.name, memberIds:g.members.map(m=>String(m._id)) }));
	const tables = c.tables.map(t=>({ id:String(t._id), row:t.row, col:t.col, seats:t.seats }));
	try{
		const result = allocateSeats(students, groupMap, tables, req.body||{});
		return res.json(result);
	}catch(e){
		return res.status(400).json({ message:e.message });
	}
}

export default requireAuth(handler);
