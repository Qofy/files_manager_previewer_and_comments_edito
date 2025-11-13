import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { users } from '$lib/server/users.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper function to verify JWT
function verifyToken(request) {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null;
	}

	const token = authHeader.substring(7);
	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		// Return username - prioritize username field, fallback to userId for legacy tokens
		return decoded.username || decoded.userId;
	} catch (err) {
		console.error('Token verification failed:', err.message);
		return null;
	}
}

// GET /profile - Get current user profile
export async function GET({ request }) {
	const username = verifyToken(request);
	if (!username) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const user = users.get(username);
	if (!user) {
		console.error('User not found in storage:', username);
		console.log('Available users:', Array.from(users.keys()));
		return json({ error: 'User not found' }, { status: 404 });
	}

	// Return user profile without password
	return json({
		id: user.id,
		username: user.username,
		profileImage: user.profileImage,
		createdAt: user.createdAt
	});
}

// PUT /profile - Update user profile (including profile image)
export async function PUT({ request }) {
	const username = verifyToken(request);
	if (!username) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const user = users.get(username);
	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	try {
		const body = await request.json();
		const { profileImage } = body;

		// Update profile image if provided
		if (profileImage !== undefined) {
			user.profileImage = profileImage;
			users.set(username, user);
		}

		return json({
			id: user.id,
			username: user.username,
			profileImage: user.profileImage,
			createdAt: user.createdAt
		});
	} catch (error) {
		console.error('Profile update error:', error);
		return json({ error: 'Failed to update profile' }, { status: 500 });
	}
}
