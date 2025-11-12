import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-secret-key-change-in-production';

// Import files storage (we'll need to export it from the files endpoint)
let filesStorage;
try {
	const filesModule = await import('../+server.js');
	filesStorage = filesModule.filesStorage;
} catch (e) {
	filesStorage = new Map();
}

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

// POST /files/move - Move files to a different folder
export async function POST({ request }) {
	const username = verifyToken(request);
	if (!username) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { file_ids, target_folder_id } = body;

	// Validate input
	if (!Array.isArray(file_ids) || file_ids.length === 0) {
		return json({ error: 'file_ids must be a non-empty array' }, { status: 400 });
	}

	// target_folder_id can be null (move to root)

	const movedFiles = [];
	const errors = [];

	for (const fileId of file_ids) {
		const file = filesStorage.get(fileId);

		if (!file) {
			errors.push({ file_id: fileId, error: 'File not found' });
			continue;
		}

		if (file.owner !== username) {
			errors.push({ file_id: fileId, error: 'Not authorized' });
			continue;
		}

		// Update the file's folder_id
		file.folder_id = target_folder_id;
		file.updated_at = new Date().toISOString();
		filesStorage.set(fileId, file);

		movedFiles.push(file);
	}

	return json({
		success: true,
		moved_count: movedFiles.length,
		moved_files: movedFiles,
		errors: errors.length > 0 ? errors : undefined
	});
}
