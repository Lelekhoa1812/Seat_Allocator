import { requireAuth } from '../../../lib/auth';
import { dbConnect } from '../../../lib/db';
import { Student } from '../../../lib/models';

async function handler(req, res){
	await dbConnect();
	const { id } = req.query;
	if (req.method === 'PUT'){
		const { name, extId } = req.body||{};
		const s = await Student.findOneAndUpdate({ _id:id, teacher:req.user.sub }, { name, extId }, { new:true });
		return res.json(s);
	}
	if (req.method === 'DELETE'){
		await Student.findOneAndDelete({ _id:id, teacher:req.user.sub });
		return res.json({ ok:true });
	}
	return res.status(405).end();
}

export default requireAuth(handler);
