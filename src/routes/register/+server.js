import { json } from '@sveltejs/kit';
import { users } from '$lib/server/users.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const { username, password } = await request.json();

		if (!username || !password) {
			return json({ error: 'Username and password required' }, { status: 400 });
		}

		if (username.length < 3) {
			return json({ error: 'Username must be at least 3 characters' }, { status: 400 });
		}

		if (password.length < 6) {
			return json({ error: 'Password must be at least 6 characters' }, { status: 400 });
		}

		// Check if user already exists
		if (users.has(username)) {
			return json({ error: 'Username already exists' }, { status: 409 });
		}

		// Create new user
		const user = {
			id: Date.now().toString(),
			username,
			password, // In production, hash this with bcrypt!
			createdAt: new Date().toISOString(),
			profileImage: null
		};

		users.set(username, user);

		return json(
			{
				message: 'User registered successfully',
				username: user.username
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Registration error:', error);
		return json({ error: 'Registration failed' }, { status: 500 });
	}
}
