import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { filesStorage, foldersStorage } from '$lib/server/storage.js';

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

// Recursive function to get all child folder IDs
function getAllChildFolderIds(folderId, username) {
	const childIds = [folderId];
	const directChildren = Array.from(foldersStorage.values()).filter(
		(folder) => folder.parent_id === folderId && folder.owner === username
	);

	for (const child of directChildren) {
		childIds.push(...getAllChildFolderIds(child.id, username));
	}

	return childIds;
}

// GET /folders/summary - Get folder statistics
export async function GET({ request, url }) {
	const username = verifyToken(request);
	if (!username) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const folderId = url.searchParams.get('folder_id');

	if (!folderId) {
		return json({ error: 'folder_id parameter is required' }, { status: 400 });
	}

	// Verify folder exists and belongs to user
	const folder = foldersStorage.get(folderId);
	if (!folder) {
		return json({ error: 'Folder not found' }, { status: 404 });
	}
	if (folder.owner !== username) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	// Get all child folder IDs (including the folder itself)
	const allFolderIds = getAllChildFolderIds(folderId, username);

	// Count files in these folders
	const filesInFolder = Array.from(filesStorage.values()).filter(
		(file) => file.owner === username && allFolderIds.includes(file.folder_id)
	);

	// Calculate statistics
	const totalFiles = filesInFolder.length;
	const totalSize = filesInFolder.reduce((sum, file) => sum + (file.size || 0), 0);

	// Count subfolders
	const subfolderCount = allFolderIds.length - 1; // Exclude the folder itself

	return json({
		folder_id: folderId,
		folder_name: folder.name,
		folder_path: folder.path,
		total_files: totalFiles,
		total_size: totalSize,
		subfolder_count: subfolderCount,
		last_modified: folder.updated_at
	});
}
