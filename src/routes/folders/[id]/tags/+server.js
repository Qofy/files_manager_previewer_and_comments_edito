import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { foldersStorage } from '$lib/server/storage.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper function to verify JWT
function verifyToken(request) {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null;
	}

	const token = authHeader.split(' ')[1];
	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		return decoded.username;
	} catch {
		return null;
	}
}

// POST /folders/[id]/tags - Add tags to a folder
export async function POST({ request, params }) {
	const username = verifyToken(request);
	if (!username) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = params;
	const folder = foldersStorage.get(id);

	if (!folder) {
		return json({ error: 'Folder not found' }, { status: 404 });
	}

	if (folder.owner !== username) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const { tags } = await request.json();

	if (!Array.isArray(tags)) {
		return json({ error: 'Tags must be an array' }, { status: 400 });
	}

	// Initialize tags array if it doesn't exist
	if (!folder.tags) {
		folder.tags = [];
	}

	// Add new tags (avoid duplicates)
	tags.forEach((tag) => {
		if (!folder.tags.includes(tag)) {
			folder.tags.push(tag);
		}
	});

	folder.updated_at = new Date().toISOString();
	foldersStorage.set(id, folder);

	return json({ folder });
}

// DELETE /folders/[id]/tags - Remove tags from a folder
export async function DELETE({ request, params, url }) {
	const username = verifyToken(request);
	if (!username) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = params;
	const folder = foldersStorage.get(id);

	if (!folder) {
		return json({ error: 'Folder not found' }, { status: 404 });
	}

	if (folder.owner !== username) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const tagToRemove = url.searchParams.get('tag');

	if (!tagToRemove) {
		return json({ error: 'Tag parameter required' }, { status: 400 });
	}

	if (folder.tags) {
		folder.tags = folder.tags.filter((tag) => tag !== tagToRemove);
		folder.updated_at = new Date().toISOString();
		foldersStorage.set(id, folder);
	}

	return json({ folder });
}
