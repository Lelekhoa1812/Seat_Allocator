import { requireAuth } from '../../../lib/auth';
import { dbConnect } from '../../../lib/db';
import { Student } from '../../../lib/models';

async function handler(req, res){
	await dbConnect();
	if (req.method === 'GET'){
		const students = await Student.find({ teacher: req.user.sub }).sort({ createdAt:-1 });
		return res.json(students);
	}
	if (req.method === 'POST'){
		const { name, extId } = req.body||{};
		if (!name) return res.status(400).json({ message:'Name required' });
		const s = await Student.create({ name, extId, teacher: req.user.sub });
		return res.json(s);
	}
	return res.status(405).end();
}

export default requireAuth(handler);
