import jwt from 'jsonwebtoken';
import { dbConnect } from './db';

export function signToken(payload){
	return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(handler){
	return async (req, res) => {
		const header = req.headers.authorization || '';
		const token = header.startsWith('Bearer ') ? header.slice(7) : null;
		if (!token) return res.status(401).json({ message:'Missing token' });
		try{
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			req.user = decoded;
			await dbConnect();
			return handler(req, res);
		}catch(e){
			return res.status(401).json({ message:'Invalid token' });
		}
	};
}
