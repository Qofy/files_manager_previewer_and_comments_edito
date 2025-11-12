import { error, json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { filesStorage } from '$lib/server/storage.js';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

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

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, params }) {
	try {
		// Verify authentication (optional)
		const authHeader = request.headers.get('Authorization');

		if (authHeader && authHeader.startsWith('Bearer ')) {
			const token = authHeader.substring(7);
			try {
				jwt.verify(token, JWT_SECRET);
			} catch {
				// Token invalid but allow for demo
				console.log('Invalid token, but allowing access for demo');
			}
		}

		const fileId = params.id;

		if (!fileId) {
			throw error(400, 'File ID is required');
		}

		// Get file metadata from storage
		const fileMetadata = filesStorage.get(fileId);

		if (!fileMetadata) {
			throw error(404, 'File not found');
		}

		console.log('Serving file:', fileId, fileMetadata.name);

		// Check if actual file exists on disk
		const filePath = path.join(UPLOAD_DIR, fileId);

		if (fs.existsSync(filePath)) {
			// Serve the actual file
			const fileBuffer = fs.readFileSync(filePath);
			const contentType = getContentType(fileMetadata.type);

			return new Response(fileBuffer, {
				status: 200,
				headers: {
					'Content-Type': contentType,
					'Content-Disposition': `inline; filename="${fileMetadata.name}"`,
					'Content-Length': fileBuffer.length.toString(),
					'Cache-Control': 'no-cache'
				}
			});
		}

		// If file is stored as base64 data in metadata
		if (fileMetadata.data) {
			const fileBuffer = Buffer.from(fileMetadata.data, 'base64');
			const contentType = getContentType(fileMetadata.type);

			return new Response(fileBuffer, {
				status: 200,
				headers: {
					'Content-Type': contentType,
					'Content-Disposition': `inline; filename="${fileMetadata.name}"`,
					'Content-Length': fileBuffer.length.toString(),
					'Cache-Control': 'no-cache'
				}
			});
		}

		// Fallback: Generate sample PDF for demonstration
		if (fileMetadata.type === 'pdf') {
			console.log('Generating sample PDF for:', fileId);
			const pdfBuffer = await generateSamplePDF(fileMetadata);

			return new Response(pdfBuffer, {
				status: 200,
				headers: {
					'Content-Type': 'application/pdf',
					'Content-Disposition': `inline; filename="${fileMetadata.name}"`,
					'Content-Length': pdfBuffer.length.toString(),
					'Cache-Control': 'no-cache'
				}
			});
		}

		// For non-PDF files without content
		throw error(404, 'File content not found. Please upload the file again.');
	} catch (err) {
		console.error('File serving error:', err);
		if (err.status) {
			throw err;
		}
		throw error(500, `Failed to serve file: ${err.message}`);
	}
}

// Helper function to generate a sample PDF for demonstration
async function generateSamplePDF(fileMetadata) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument();
		const chunks = [];

		doc.on('data', (chunk) => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', (err) => reject(err));

		// Add content to PDF
		doc.fontSize(25).text(fileMetadata.name || 'Sample Document', 100, 100);
		doc.moveDown();
		doc.fontSize(14).text('This is a sample document.', 100, 150);
		doc.fontSize(12).text('The actual file content has not been uploaded yet.', 100, 180);
		doc.moveDown();
		doc.text(`File ID: ${fileMetadata.id}`, 100, 220);
		doc.text(`Generated at: ${new Date().toLocaleString()}`, 100, 240);

		// Add a second page
		doc.addPage();
		doc.fontSize(20).text('Page 2', 100, 100);
		doc.fontSize(12).text('Upload a real file to see its actual content here.', 100, 150);
		doc.text('This is just a placeholder document.', 100, 170);

		doc.end();
	});
}

// Helper function to get content type based on file extension
function getContentType(fileType) {
	const contentTypes = {
		// Documents
		pdf: 'application/pdf',
		doc: 'application/msword',
		docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

		// Images
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		gif: 'image/gif',
		webp: 'image/webp',
		svg: 'image/svg+xml',
		bmp: 'image/bmp',

		// Video
		mp4: 'video/mp4',
		webm: 'video/webm',
		ogg: 'video/ogg',

		// Audio
		mp3: 'audio/mpeg',
		wav: 'audio/wav',
		oga: 'audio/ogg',

		// Text
		txt: 'text/plain',
		md: 'text/markdown',
		json: 'application/json',
		csv: 'text/csv',
		log: 'text/plain',

		// Archives
		zip: 'application/zip',
		rar: 'application/x-rar-compressed',
		tar: 'application/x-tar',
		gz: 'application/gzip'
	};

	return contentTypes[fileType.toLowerCase()] || 'application/octet-stream';
}

// DELETE /files/[id] - Delete a file
export async function DELETE({ request, params }) {
	const username = verifyToken(request);
	if (!username) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const fileId = params.id;

	if (!fileId) {
		return json({ error: 'File ID is required' }, { status: 400 });
	}

	// Get the file
	const file = filesStorage.get(fileId);

	if (!file) {
		return json({ error: 'File not found' }, { status: 404 });
	}

	// Check ownership
	if (file.owner !== username) {
		return json({ error: 'Not authorized to delete this file' }, { status: 403 });
	}

	// Delete the actual file from disk
	const filePath = path.join(UPLOAD_DIR, fileId);
	if (fs.existsSync(filePath)) {
		fs.unlinkSync(filePath);
		console.log('Deleted file from disk:', filePath);
	}

	// Delete the file metadata
	filesStorage.delete(fileId);

	console.log('File deleted successfully:', fileId);

	return json({
		success: true,
		message: 'File deleted successfully',
		file_id: fileId
	});
}
