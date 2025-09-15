import express from 'express';
import { auth } from '../middleware/auth.js';
import Group from '../models/Group.js';


const router = express.Router();
router.use(auth);


router.get('/', async (req, res) => {
const groups = await Group.find({ teacher: req.user.sub }).populate('members');
res.json(groups);
});


router.post('/', async (req, res) => {
const { name, tag, memberIds } = req.body;
if (!name) return res.status(400).json({ message: 'Name required' });
const g = await Group.create({ name, tag, members: memberIds || [], teacher: req.user.sub });
const populated = await g.populate('members');
res.json(populated);
});


router.put('/:id', async (req, res) => {
const { name, tag, memberIds } = req.body;
const g = await Group.findOneAndUpdate({ _id: req.params.id, teacher: req.user.sub }, { name, tag, members: memberIds || [] }, { new: true }).populate('members');
res.json(g);
});


router.delete('/:id', async (req, res) => {
await Group.findOneAndDelete({ _id: req.params.id, teacher: req.user.sub });
res.json({ ok: true });
});


export default router;