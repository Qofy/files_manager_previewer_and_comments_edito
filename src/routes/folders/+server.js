/* eslint-disable no-unused-vars */
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
	} catch (error) {
		return null;
	}
}

// GET /folders - List all folders for the authenticated user
export async function GET({ request, url }) {
	const username = verifyToken(request);
	if (!username) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Get query parameters
	const parent_id = url.searchParams.get('parent_id'); // Filter by parent folder
	const tag = url.searchParams.get('tag'); // Filter by tag

	// Filter folders by owner and optionally by parent_id
	let folders = Array.from(foldersStorage.values())
		.filter((folder) => folder.owner === username)
		.filter((folder) => {
			if (parent_id === null) return true;
			if (parent_id === 'null' || parent_id === '') {
				return folder.parent_id === null;
			}
			return folder.parent_id === parent_id;
		});

	// Apply tag filter
	if (tag && tag !== 'all') {
		folders = folders.filter((folder) => folder.tags && folder.tags.includes(tag));
	}

	folders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

	return json({ folders });
}

// POST /folders - Create a new folder
export async function POST({ request }) {
	const username = verifyToken(request);
	if (!username) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { name, parent_id = null } = body;

	// Validate input
	if (!name || name.trim() === '') {
		return json({ error: 'Folder name is required' }, { status: 400 });
	}

	// Build the folder path
	let path = '/';
	if (parent_id) {
		const parentFolder = foldersStorage.get(parent_id);
		if (!parentFolder) {
			return json({ error: 'Parent folder not found' }, { status: 404 });
		}
		if (parentFolder.owner !== username) {
			return json({ error: 'Not authorized to access parent folder' }, { status: 403 });
		}
		path = `${parentFolder.path}/${name}`;
	} else {
		path = `/${name}`;
	}

	// Check if folder with same path already exists
	const existingFolder = Array.from(foldersStorage.values()).find(
		(folder) => folder.path === path && folder.owner === username
	);

	if (existingFolder) {
		return json(
			{ error: 'Folder with this name already exists in this location' },
			{ status: 400 }
		);
	}

	// Create new folder
	const folderId = Date.now().toString();
	const newFolder = {
		id: folderId,
		name: name.trim(),
		path,
		parent_id,
		owner: username,
		tags: [],
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};

	foldersStorage.set(folderId, newFolder);

	return json({ folder: newFolder }, { status: 201 });
}
