import { requireAuth } from '../../../lib/auth';
import { dbConnect } from '../../../lib/db';
import { Group } from '../../../lib/models';

async function handler(req, res){
	await dbConnect();
	if (req.method === 'GET'){
		const groups = await Group.find({ teacher: req.user.sub }).populate('members');
		return res.json(groups);
	}
	if (req.method === 'POST'){
		const { name, tag, memberIds } = req.body||{};
		if (!name) return res.status(400).json({ message:'Name required' });
		const g = await Group.create({ name, tag, members: memberIds || [], teacher: req.user.sub });
		const populated = await g.populate('members');
		return res.json(populated);
	}
	return res.status(405).end();
}

export default requireAuth(handler);
