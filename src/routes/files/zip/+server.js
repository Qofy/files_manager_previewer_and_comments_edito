import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import archiver from 'archiver';
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

// GET /files/zip?file_ids=id1,id2,id3 - Download multiple files as a zip
export async function GET({ request, url }) {
	const username = verifyToken(request);
	if (!username) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const fileIdsParam = url.searchParams.get('file_ids');

	if (!fileIdsParam) {
		return json({ error: 'file_ids parameter is required' }, { status: 400 });
	}

	const fileIds = fileIdsParam.split(',').map((id) => id.trim());

	if (fileIds.length === 0) {
		return json({ error: 'No file IDs provided' }, { status: 400 });
	}

	// Verify all files exist and belong to the user
	const filesToZip = [];
	for (const fileId of fileIds) {
		const file = filesStorage.get(fileId);
		if (!file) {
			return json({ error: `File not found: ${fileId}` }, { status: 404 });
		}
		if (file.owner !== username) {
			return json({ error: `Not authorized: ${fileId}` }, { status: 403 });
		}
		filesToZip.push(file);
	}

	// Create a zip archive
	const archive = archiver('zip', {
		zlib: { level: 9 } // Compression level
	});

	// Set response headers
	const headers = new Headers();
	headers.set('Content-Type', 'application/zip');
	headers.set('Content-Disposition', `attachment; filename="files-${Date.now()}.zip"`);

	// In a real implementation, you would:
	// 1. Read actual file contents from disk/storage
	// 2. Add each file to the archive
	// 3. Stream the archive to the response

	// For this example, we'll add placeholder content
	for (const file of filesToZip) {
		// In production, read the actual file content from your storage
		const content = `This is a placeholder for file: ${file.name}\nIn production, this would be the actual file content.`;
		archive.append(content, { name: file.name });
	}

	// Finalize the archive
	archive.finalize();

	// Return the archive as a stream
	return new Response(archive, { headers });
}
