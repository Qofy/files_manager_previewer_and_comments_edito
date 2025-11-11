import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { users } from '$lib/server/users.js';

// In production, use environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const { username, password } = await request.json();

		if (!username || !password) {
			return json({ error: 'Username and password required' }, { status: 400 });
		}

		// Check if user exists
		const user = users.get(username);
		if (!user || user.password !== password) {
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		// Generate JWT token
		const token = jwt.sign(
			{ userId: user.id, username: user.username },
			JWT_SECRET,
			{ expiresIn: '24h' }
		);

		return json({ token, username: user.username });
	} catch (error) {
		console.error('Login error:', error);
		return json({ error: 'Login failed' }, { status: 500 });
	}
}
