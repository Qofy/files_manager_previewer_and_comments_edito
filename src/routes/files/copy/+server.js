import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { filesStorage } from '$lib/server/storage.js';

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

// POST /files/copy - Copy files to a different folder
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

	// target_folder_id can be null (copy to root)

	const copiedFiles = [];
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

		// Create a copy of the file with a new ID
		const newFileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const copiedFile = {
			...file,
			id: newFileId,
			name: `${file.name} (copy)`,
			folder_id: target_folder_id,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};

		filesStorage.set(newFileId, copiedFile);
		copiedFiles.push(copiedFile);
	}

	return json({
		success: true,
		copied_count: copiedFiles.length,
		copied_files: copiedFiles,
		errors: errors.length > 0 ? errors : undefined
	});
}
