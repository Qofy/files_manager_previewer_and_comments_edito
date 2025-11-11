import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { invoices } from '../+server.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, params }) {
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

		const invoice = invoices.find((inv) => inv.id === params.id);

		if (!invoice) {
			return json({ error: 'Invoice not found' }, { status: 404 });
		}

		return json(invoice);
	} catch (error) {
		console.error('Invoice detail error:', error);
		return json({ error: 'Failed to load invoice' }, { status: 500 });
	}
}
