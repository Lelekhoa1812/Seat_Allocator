import { requireAuth } from '../../../lib/auth';
import { dbConnect } from '../../../lib/db';
import { ClassModel } from '../../../lib/models';

async function handler(req, res){
	await dbConnect();
	const { id } = req.query;
	if (req.method === 'GET'){
		const c = await ClassModel.findOne({ _id:id, teacher:req.user.sub }).populate('students');
		return res.json(c);
	}
	if (req.method === 'PUT'){
		const { name, students, tables } = req.body||{};
		const c = await ClassModel.findOneAndUpdate({ _id:id, teacher:req.user.sub }, { name, students, tables }, { new:true });
		return res.json(c);
	}
	if (req.method === 'DELETE'){
		await ClassModel.findOneAndDelete({ _id:id, teacher:req.user.sub });
		return res.json({ ok:true });
	}
	return res.status(405).end();
}

export default requireAuth(handler);
