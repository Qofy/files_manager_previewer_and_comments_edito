import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Mock business profiles data (shared with parent route)
const profiles = [
	{
		id: '1',
		business_name: 'My Business',
		address: '123 Business St, City, State 12345',
		email: 'hello@mybusiness.com',
		phone: '+1 555 0100',
		tax_id: '12-3456789',
		logo: null
	}
];

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

		const profile = profiles.find((p) => p.id === params.id);
		if (!profile) {
			return json({ error: 'Profile not found' }, { status: 404 });
		}

		return json(profile);
	} catch (error) {
		console.error('Profile error:', error);
		return json({ error: 'Failed to load profile' }, { status: 500 });
	}
}
