import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Teacher from '../models/Teacher.js';


const router = express.Router();


router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email & password required' });
        const existing = await Teacher.findOne({ email });
        if (existing) return res.status(400).json({ message: 'Email already registered' });
        const passwordHash = await bcrypt.hash(password, 10);
        const t = await Teacher.create({ email, passwordHash });
        return res.json({ id: t._id, email: t.email });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const t = await Teacher.findOne({ email });
        if (!t) return res.status(400).json({ message: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, t.passwordHash);
        if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ sub: t._id, email: t.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});


router.get('/me', (req, res) => {
    // This route can be protected if you want; keeping open for simplicity
    res.json({ ok: true });
});


export default router;