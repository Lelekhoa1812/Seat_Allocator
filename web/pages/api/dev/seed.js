import { dbConnect } from '../../../lib/db';
import { Teacher, Student, Group, ClassModel } from '../../../lib/models';
import bcrypt from 'bcryptjs';

/**
 * Seed endpoint
 * Usage: POST /api/dev/seed?secret=YOUR_SECRET
 * Set env SEED_SECRET to enable on production.
 */
export default async function handler(req, res){
	if (req.method !== 'POST') return res.status(405).end();
	const secret = process.env.SEED_SECRET || 'dev';
	if ((req.query.secret||'') !== secret) return res.status(401).json({ message:'Unauthorized' });
	await dbConnect();

	const email = 'abc@gmail.com';
	const password = '12345678';

	// Idempotent: clear previous data for this teacher
	let teacher = await Teacher.findOne({ email });
	if (!teacher){
		const passwordHash = await bcrypt.hash(password, 10);
		teacher = await Teacher.create({ email, passwordHash });
	}

	await Promise.all([
		Student.deleteMany({ teacher: teacher._id }),
		Group.deleteMany({ teacher: teacher._id }),
		ClassModel.deleteMany({ teacher: teacher._id })
	]);

	// Create 20 students
	const names = [
		'Ava Johnson','Liam Smith','Olivia Brown','Noah Jones','Emma Garcia',
		'Mason Miller','Sophia Davis','Logan Rodriguez','Isabella Martinez','Lucas Hernandez',
		'Mia Lopez','Ethan Gonzalez','Charlotte Wilson','James Anderson','Amelia Thomas',
		'Benjamin Taylor','Harper Moore','Elijah Jackson','Evelyn Martin','Oliver Lee'
	];
	const students = await Student.insertMany(names.map((name, i)=>({ name, extId: String(1000+i), teacher: teacher._id })));

	// Create overlapping groups (each student in ~2 groups)
	const groupNames = ['Alpha','Bravo','Charlie','Delta','Echo','Foxtrot'];
	const groups = await Group.insertMany(groupNames.map(n=>({ name: n, tag: n[0], members: [], teacher: teacher._id })));
	// Assign two groups per student
	for (const s of students){
		const a = Math.floor(Math.random()*groups.length);
		let b = Math.floor(Math.random()*groups.length);
		if (b===a) b = (b+1)%groups.length;
		groups[a].members.push(s._id);
		groups[b].members.push(s._id);
	}
	await Promise.all(groups.map(g=>Group.findByIdAndUpdate(g._id, { members: g.members })));

	// Create a classroom with 7 tables (21 seats total)
	const tables = Array.from({ length: 7 }).map((_,i)=>({ row: Math.floor(i/3), col: i%3, seats: 3 }));
	const classroom = await ClassModel.create({ name: 'Demo Class A', students: students.map(s=>s._id), tables, teacher: teacher._id });

	return res.json({
		ok: true,
		teacher: { id: teacher._id, email },
		students: { count: students.length },
		groups: { count: groups.length },
		classroom: { id: classroom._id, tables: classroom.tables.length }
	});
}
