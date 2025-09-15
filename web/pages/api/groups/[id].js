import { requireAuth } from '../../../lib/auth';
import { dbConnect } from '../../../lib/db';
import { Group } from '../../../lib/models';

async function handler(req, res){
	await dbConnect();
	const { id } = req.query;
	if (req.method === 'PUT'){
		const { name, tag, memberIds } = req.body||{};
		const g = await Group.findOneAndUpdate({ _id:id, teacher:req.user.sub }, { name, tag, members: memberIds || [] }, { new:true }).populate('members');
		return res.json(g);
	}
	if (req.method === 'DELETE'){
		await Group.findOneAndDelete({ _id:id, teacher:req.user.sub });
		return res.json({ ok:true });
	}
	return res.status(405).end();
}

export default requireAuth(handler);
