import { error, json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
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

		console.log('Generating PDF for:', fileId);

		// Generate a PDF document
		const doc = new PDFDocument();
		const chunks = [];

		// Collect PDF data chunks
		doc.on('data', (chunk) => chunks.push(chunk));

		// Create promise that resolves when PDF is complete
		const pdfPromise = new Promise((resolve, reject) => {
			doc.on('end', () => {
				resolve(Buffer.concat(chunks));
			});
			doc.on('error', (err) => {
				reject(err);
			});
		});

		// Add content to PDF
		doc.fontSize(25).text(`Document: ${fileId}`, 100, 100);
		doc.moveDown();
		doc.fontSize(14).text('This is a dynamically generated PDF document.', 100, 150);
		doc.fontSize(12).text('You can replace this with actual file storage logic.', 100, 180);

		// Add more content
		doc.moveDown();
		doc.text(`Generated at: ${new Date().toLocaleString()}`, 100, 210);
		doc.text(`File ID: ${fileId}`, 100, 230);

		// Add a second page
		doc.addPage();
		doc.fontSize(20).text('Page 2', 100, 100);
		doc.fontSize(12).text('This document has multiple pages for testing.', 100, 150);
		doc.text('You can add comments by clicking anywhere on the pages.', 100, 170);

		// Add a third page
		doc.addPage();
		doc.fontSize(20).text('Page 3', 100, 100);
		doc.fontSize(12).text('Third page content goes here.', 100, 150);

		// Finalize the PDF
		doc.end();

		// Wait for PDF generation to complete
		const pdfBuffer = await pdfPromise;

		console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');

		// Return the PDF
		return new Response(pdfBuffer, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `inline; filename="${fileId}"`,
				'Content-Length': pdfBuffer.length.toString(),
				'Cache-Control': 'no-cache'
			}
		});
	} catch (err) {
		console.error('File generation error:', err);
		throw error(500, `Failed to generate file: ${err.message}`);
	}
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

	// Delete the file
	filesStorage.delete(fileId);

	// In production, you would also:
	// 1. Delete the actual file from disk/cloud storage
	// 2. Delete associated comments and metadata from database
	// 3. Update folder statistics

	return json({
		success: true,
		message: 'File deleted successfully',
		file_id: fileId
	});
}
