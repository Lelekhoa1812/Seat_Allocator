import { dbConnect } from '../../../lib/db';
import { Teacher } from '../../../lib/models';
import { signToken } from '../../../lib/auth';
import bcrypt from 'bcryptjs';

export default async function handler(req, res){
	if (req.method !== 'POST') return res.status(405).end();
	await dbConnect();
	try{
		const { email, password } = req.body||{};
		const t = await Teacher.findOne({ email });
		if (!t) return res.status(400).json({ message:'Invalid credentials' });
		const ok = await bcrypt.compare(password, t.passwordHash);
		if (!ok) return res.status(400).json({ message:'Invalid credentials' });
		const token = signToken({ sub: t._id, email: t.email });
		return res.json({ token });
	}catch(e){
		return res.status(500).json({ message: e.message });
	}
}
