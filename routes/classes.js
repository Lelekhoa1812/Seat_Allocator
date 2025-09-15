import express from 'express';
import { auth } from '../middleware/auth.js';
import ClassModel from '../models/Class.js';
import Group from '../models/Group.js';
import Student from '../models/Student.js';


// Import allocation for Node (UMD support)
import { allocateSeats } from '../public/js/logic.js';


const router = express.Router();
router.use(auth);


router.get('/', async (req, res) => {
const classes = await ClassModel.find({ teacher: req.user.sub }).sort({ createdAt: -1 });
res.json(classes);
});


router.post('/', async (req, res) => {
const { name } = req.body;
if (!name) return res.status(400).json({ message: 'Name required' });
const c = await ClassModel.create({ name, students: [], tables: [], teacher: req.user.sub });
res.json(c);
});


router.get('/:id', async (req, res) => {
const c = await ClassModel.findOne({ _id: req.params.id, teacher: req.user.sub }).populate('students');
res.json(c);
});


router.put('/:id', async (req, res) => {
const { name, students, tables } = req.body;
const c = await ClassModel.findOneAndUpdate({ _id: req.params.id, teacher: req.user.sub }, { name, students, tables }, { new: true });
res.json(c);
});


router.delete('/:id', async (req, res) => {
await ClassModel.findOneAndDelete({ _id: req.params.id, teacher: req.user.sub });
res.json({ ok: true });
});


router.post('/:id/allocate', async (req, res) => {
const c = await ClassModel.findOne({ _id: req.params.id, teacher: req.user.sub }).populate('students');
if (!c) return res.status(404).json({ message: 'Class not found' });
const groups = await Group.find({ teacher: req.user.sub, members: { $in: c.students.map(s => s._id) } }).populate('members');


// Convert to plain arrays for the allocator
const students = c.students.map(s => ({ id: String(s._id), name: s.name }));
const groupMap = groups.map(g => ({ id: String(g._id), name: g.name, memberIds: g.members.map(m => String(m._id)) }));
const tables = c.tables.map(t => ({ id: String(t._id), row: t.row, col: t.col, seats: t.seats }));


try {
const result = allocateSeats(students, groupMap, tables);
res.json(result);
} catch (e) {
res.status(400).json({ message: e.message });
}
});


export default router;