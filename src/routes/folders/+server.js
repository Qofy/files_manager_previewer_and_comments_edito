import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-secret-key-change-in-production';

// In-memory folder storage (replace with database in production)
const foldersStorage = new Map();

// Initialize with default folders
foldersStorage.set('1', {
	id: '1',
	name: 'Documents',
	path: '/Documents',
	parent_id: null,
	owner: 'admin',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
});

foldersStorage.set('2', {
	id: '2',
	name: 'Images',
	path: '/Images',
	parent_id: null,
	owner: 'admin',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
});

foldersStorage.set('3', {
	id: '3',
	name: 'Projects',
	path: '/Projects',
	parent_id: null,
	owner: 'admin',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
});

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

	// Filter folders by owner and optionally by parent_id
	const folders = Array.from(foldersStorage.values())
		.filter((folder) => folder.owner === username)
		.filter((folder) => {
			if (parent_id === null) return true;
			if (parent_id === 'null' || parent_id === '') {
				return folder.parent_id === null;
			}
			return folder.parent_id === parent_id;
		})
		.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};

	foldersStorage.set(folderId, newFolder);

	return json({ folder: newFolder }, { status: 201 });
}

// Export the storage for use in other endpoints
export { foldersStorage };
