import { requireAuth } from '../../../../lib/auth';
import { dbConnect } from '../../../../lib/db';
import { ClassModel, Group } from '../../../../lib/models';

function allocateSeats(students = [], groups = [], tables = []){
	const totalSeats = tables.reduce((sum, t) => sum + (t.seats||0), 0);
	if (students.length > totalSeats) throw new Error('Not enough seats for all students');
	const orderedTables = [...tables].map(t=>({ id:String(t.id), row:t.row|0, col:t.col|0, seats:t.seats|0, assigned:[] })).sort((a,b)=>a.row-b.row||a.col-b.col);
	function pickBestTable(){
		let best = null;
		for (const t of orderedTables){
			const remaining = t.seats - t.assigned.length;
			if (remaining <= 0) continue;
			if (!best || remaining > best.remaining || (remaining===best.remaining && (t.row < best.t.row || (t.row===best.t.row && t.col < best.t.col)))) best = { t, remaining };
		}
		return best?.t || null;
	}
	const placed = new Set();
	for (const g of groups){
		const members = (g?.memberIds||[]).map(String);
		for (const sid of members){
			if (placed.has(sid)) continue;
			const t = pickBestTable();
			if (!t) throw new Error('No available seat while placing group members');
			t.assigned.push(sid);
			placed.add(sid);
		}
	}
	for (const s of students){
		const sid = String(s.id);
		if (placed.has(sid)) continue;
		const t = pickBestTable();
		if (!t) throw new Error('No seat available for remaining student');
		t.assigned.push(sid);
		placed.add(sid);
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
		const result = allocateSeats(students, groupMap, tables);
		return res.json(result);
	}catch(e){
		return res.status(400).json({ message:e.message });
	}
}

export default requireAuth(handler);
