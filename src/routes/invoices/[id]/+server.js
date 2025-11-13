import { error, json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import { invoices } from '../+server.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, params, url }) {
	try {
		// Verify authentication
		const authHeader = request.headers.get('Authorization');

		if (authHeader && authHeader.startsWith('Bearer ')) {
			const token = authHeader.substring(7);
			try {
				jwt.verify(token, JWT_SECRET);
			} catch {
				throw error(401, 'Invalid token');
			}
		}

		const invoiceId = params.id;

		// Check if requesting JSON data or PDF
		const acceptHeader = request.headers.get('Accept') || '';
		const format = url.searchParams.get('format');

		if (format === 'pdf' || acceptHeader.includes('application/pdf')) {
			// Generate PDF
			const doc = new PDFDocument();
			const chunks = [];

			doc.on('data', (chunk) => chunks.push(chunk));

			const pdfPromise = new Promise((resolve) => {
				doc.on('end', () => {
					resolve(Buffer.concat(chunks));
				});
			});

			// Add content to PDF
			doc.fontSize(25).text(`Invoice: ${invoiceId}`, 100, 100);
			doc.fontSize(12).text('This is a generated sample PDF for demonstration.', 100, 150);
			doc.text('You can add your own PDF files to replace this.', 100, 170);

			// Add more pages to make it more realistic
			doc
				.addPage()
				.fontSize(20)
				.text('Page 2', 100, 100)
				.fontSize(12)
				.text('This is the second page of the document.', 100, 150);

			doc
				.addPage()
				.fontSize(20)
				.text('Page 3', 100, 100)
				.fontSize(12)
				.text('This is the third page of the document.', 100, 150);

			doc.end();

			const pdfBuffer = await pdfPromise;

			return new Response(pdfBuffer, {
				headers: {
					'Content-Type': 'application/pdf',
					'Content-Disposition': `inline; filename="invoice-${invoiceId}.pdf"`,
					'Cache-Control': 'no-cache'
				}
			});
		} else {
			// Return JSON data
			const invoice = invoices.find((inv) => inv.id === invoiceId);
			if (!invoice) {
				return json({ error: 'Invoice not found' }, { status: 404 });
			}
			return json(invoice);
		}
	} catch (err) {
		console.error('Invoice error:', err);
		throw error(500, 'Failed to process request');
	}
}
