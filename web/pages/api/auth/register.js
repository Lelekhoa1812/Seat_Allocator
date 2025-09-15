import { dbConnect } from '../../../lib/db';
import { Teacher } from '../../../lib/models';
import bcrypt from 'bcryptjs';

export default async function handler(req, res){
	if (req.method !== 'POST') return res.status(405).end();
	await dbConnect();
	try{
		const { email, password } = req.body||{};
		if (!email || !password) return res.status(400).json({ message:'Email & password required' });
		const existing = await Teacher.findOne({ email });
		if (existing) return res.status(400).json({ message:'Email already registered' });
		const passwordHash = await bcrypt.hash(password, 10);
		const t = await Teacher.create({ email, passwordHash });
		return res.json({ id: t._id, email: t.email });
	}catch(e){
		return res.status(500).json({ message: e.message });
	}
}
