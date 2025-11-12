import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { filesStorage } from '$lib/server/storage.js';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
	fs.mkdirSync(UPLOAD_DIR, { recursive: true });
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

// Helper function to determine file category based on extension
function getFileCategory(filename) {
	const ext = filename.split('.').pop().toLowerCase();

	if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) {
		return 'documents';
	} else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
		return 'images';
	} else if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext)) {
		return 'videos';
	} else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
		return 'audio';
	} else {
		return 'other';
	}
}

// GET /files - List all files for the authenticated user
export async function GET({ request, url }) {
	const username = verifyToken(request);
	if (!username) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Get query parameters
	const folder_id = url.searchParams.get('folder_id'); // Filter by folder
	const category = url.searchParams.get('category'); // Filter by category
	const search = url.searchParams.get('search'); // Search by name

	console.log('Files API called - folder_id:', folder_id, 'username:', username);

	// Filter files by owner
	let files = Array.from(filesStorage.values()).filter((file) => file.owner === username);

	console.log('Total files for user:', files.length);

	// Apply folder filter only if folder_id parameter is explicitly provided
	if (folder_id !== null) {
		if (folder_id === 'null' || folder_id === '') {
			// Show only files not in any folder
			files = files.filter((file) => file.folder_id === null || file.folder_id === undefined);
		} else {
			// Show files in specific folder
			files = files.filter((file) => file.folder_id === folder_id);
		}
		console.log('Files after folder filter:', files.length);
	}
	// If folder_id is null (not provided), show ALL files regardless of folder

	// Apply category filter
	if (category && category !== 'all') {
		files = files.filter((file) => file.category === category);
	}

	// Apply search filter
	if (search && search.trim() !== '') {
		const searchLower = search.toLowerCase();
		files = files.filter((file) => file.name.toLowerCase().includes(searchLower));
	}

	// Sort by upload date (newest first)
	files.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

	return json({ files });
}

// POST /files - Upload a new file
export async function POST({ request }) {
	const username = verifyToken(request);
	if (!username) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file');
		const folder_id = formData.get('folder_id') || null;

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		// Generate unique file ID
		const fileId = Date.now().toString();
		const fileExtension = file.name.split('.').pop().toLowerCase();

		// Save file to disk
		const filePath = path.join(UPLOAD_DIR, fileId);
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		fs.writeFileSync(filePath, buffer);

		const newFile = {
			id: fileId,
			name: file.name,
			type: fileExtension,
			category: getFileCategory(file.name),
			size: file.size,
			folder_id: folder_id,
			owner: username,
			uploaded_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};

		filesStorage.set(fileId, newFile);

		console.log('File uploaded successfully:', fileId, file.name);

		return json({ file: newFile }, { status: 201 });
	} catch (error) {
		console.error('File upload error:', error);
		return json({ error: 'Failed to upload file' }, { status: 500 });
	}
}
