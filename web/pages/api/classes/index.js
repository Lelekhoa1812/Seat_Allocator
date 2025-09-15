import { requireAuth } from '../../../lib/auth';
import { dbConnect } from '../../../lib/db';
import { ClassModel } from '../../../lib/models';

async function handler(req, res){
	await dbConnect();
	if (req.method === 'GET'){
		const classes = await ClassModel.find({ teacher: req.user.sub }).sort({ createdAt:-1 });
		return res.json(classes);
	}
	if (req.method === 'POST'){
		const { name } = req.body||{};
		if (!name) return res.status(400).json({ message:'Name required' });
		const c = await ClassModel.create({ name, students:[], tables:[], teacher:req.user.sub });
		return res.json(c);
	}
	return res.status(405).end();
}

export default requireAuth(handler);
