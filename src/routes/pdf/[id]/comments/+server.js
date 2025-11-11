import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Mock comments storage
const commentsStore = new Map();

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, params, url }) {
	try {
		// Verify authentication (optional for public comments)
		const authHeader = request.headers.get('Authorization');

		if (authHeader && authHeader.startsWith('Bearer ')) {
			const token = authHeader.substring(7);
			try {
				jwt.verify(token, JWT_SECRET);
			} catch {
				// Allow anonymous access
			}
		}

		const fileId = params.id;
		const scope = url.searchParams.get('scope') || 'private';
		const key = `${fileId}_${scope}`;

		const comments = commentsStore.get(key) || [];

		return json(comments);
	} catch (error) {
		console.error('Get comments error:', error);
		return json({ error: 'Failed to load comments' }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, params }) {
	try {
		// Verify authentication
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.substring(7);
		let userId;
		try {
			const decoded = jwt.verify(token, JWT_SECRET);
			userId = decoded.username || decoded.userId;
		} catch {
			return json({ error: 'Invalid token' }, { status: 401 });
		}

		const fileId = params.id;
		const body = await request.json();
		const { page, x, y, text, scope = 'private' } = body;

		if (!text || text.trim().length === 0) {
			return json({ error: 'Comment text is required' }, { status: 400 });
		}

		const comment = {
			id: Date.now().toString(),
			file_id: fileId,
			user_id: userId,
			page,
			x,
			y,
			text: text.trim(),
			scope,
			created_at: new Date().toISOString()
		};

		const key = `${fileId}_${scope}`;
		const comments = commentsStore.get(key) || [];
		comments.push(comment);
		commentsStore.set(key, comments);

		return json(comment, { status: 201 });
	} catch (error) {
		console.error('Create comment error:', error);
		return json({ error: 'Failed to create comment' }, { status: 500 });
	}
}
