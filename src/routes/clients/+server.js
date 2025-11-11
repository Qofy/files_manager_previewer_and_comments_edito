import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Mock clients data
const clients = [
	{ id: '1', name: 'Acme Corp', email: 'contact@acme.com', phone: '+1 555 0100' },
	{ id: '2', name: 'TechStart Inc', email: 'info@techstart.com', phone: '+1 555 0200' },
	{ id: '3', name: 'Global Solutions', email: 'hello@global.com', phone: '+1 555 0300' },
	{ id: '4', name: 'Innovation Labs', email: 'contact@innovation.com', phone: '+1 555 0400' }
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

		return json(clients);
	} catch (error) {
		console.error('Clients error:', error);
		return json({ error: 'Failed to load clients' }, { status: 500 });
	}
}
