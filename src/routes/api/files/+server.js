import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Mock files data
const files = [
	{
		id: 'sample-invoice-2025.pdf',
		name: 'Invoice_2025_Q1.pdf',
		type: 'pdf',
		size: '245 KB',
		uploaded_at: '2025-01-15T10:30:00Z',
		uploaded_by: 'admin'
	},
	{
		id: 'project-proposal.pdf',
		name: 'Project_Proposal.pdf',
		type: 'pdf',
		size: '1.2 MB',
		uploaded_at: '2025-02-01T14:20:00Z',
		uploaded_by: 'admin'
	},
	{
		id: 'contract-template.pdf',
		name: 'Contract_Template.pdf',
		type: 'pdf',
		size: '180 KB',
		uploaded_at: '2025-02-10T09:15:00Z',
		uploaded_by: 'admin'
	},
	{
		id: 'annual-report-2024.pdf',
		name: 'Annual_Report_2024.pdf',
		type: 'pdf',
		size: '3.5 MB',
		uploaded_at: '2025-01-05T16:45:00Z',
		uploaded_by: 'admin'
	},
	{
		id: 'meeting-notes.pdf',
		name: 'Meeting_Notes_Jan.pdf',
		type: 'pdf',
		size: '92 KB',
		uploaded_at: '2025-01-25T11:00:00Z',
		uploaded_by: 'admin'
	}
];

/** @type {import('./$types').RequestHandler} */
export async function GET({ request }) {
	try {
		// Verify authentication
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.substring(7);
		try {
			jwt.verify(token, JWT_SECRET);
		} catch {
			return json({ error: 'Invalid token' }, { status: 401 });
		}

		// Return files sorted by upload date (newest first)
		const sortedFiles = [...files].sort((a, b) => 
			new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
		);

		return json(sortedFiles);
	} catch (error) {
		console.error('Files list error:', error);
		return json({ error: 'Failed to load files' }, { status: 500 });
	}
}
