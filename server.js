import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';


import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import groupRoutes from './routes/groups.js';
import classRoutes from './routes/classes.js';


dotenv.config();
const app = express();


// Basic config
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));


// Static
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// helper: inject API base and web root meta
const API_BASE = (process.env.API_BASE || '').replace(/\/$/, '');
const WEB_ROOT = (process.env.WEB_ROOT || '').replace(/\/$/, '');
function injectMeta(html){
	let out = html;
	if (API_BASE){
		out = out.replace(
			/<meta name="api-base"[^>]*>/,
			`<meta name="api-base" content="${API_BASE}">`
		);
	}
	if (WEB_ROOT){
		if (out.match(/<meta name="web-root"/)){
			out = out.replace(
				/<meta name="web-root"[^>]*>/,
				`<meta name="web-root" content="${WEB_ROOT}">`
			);
		} else {
			out = out.replace(
				'</head>',
				`    <meta name="web-root" content="${WEB_ROOT}">\n    </head>`
			);
		}
	}
	return out;
}
function sendHtml(res, file){
	try{
		let html = fs.readFileSync(path.join(__dirname, 'public', file), 'utf8');
		html = injectMeta(html);
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		return res.send(html);
	}catch(err){
		return res.status(500).send('Failed to load page');
	}
}


// API routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/classes', classRoutes);


// SPA routes with meta injection
app.get('/', (req, res) => sendHtml(res, 'index.html'));
app.get('/students', (req, res) => sendHtml(res, 'student.html'));
app.get('/class', (req, res) => sendHtml(res, 'class.html'));


const PORT = process.env.PORT || 3000;


mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('MongoDB connected');
        app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    }).catch(err => {
        console.error('Mongo connection error:', err.message);
        process.exit(1);
});