import express from 'express';
import { auth } from '../middleware/auth.js';
import Student from '../models/Student.js';


const router = express.Router();


router.use(auth);


router.get('/', async (req, res) => {
const students = await Student.find({ teacher: req.user.sub }).sort({ createdAt: -1 });
res.json(students);
});


router.post('/', async (req, res) => {
const { name, extId } = req.body;
if (!name) return res.status(400).json({ message: 'Name required' });
const s = await Student.create({ name, extId, teacher: req.user.sub });
res.json(s);
});


router.put('/:id', async (req, res) => {
const { name, extId } = req.body;
const s = await Student.findOneAndUpdate({ _id: req.params.id, teacher: req.user.sub }, { name, extId }, { new: true });
res.json(s);
});


router.delete('/:id', async (req, res) => {
await Student.findOneAndDelete({ _id: req.params.id, teacher: req.user.sub });
res.json({ ok: true });
});


export default router;