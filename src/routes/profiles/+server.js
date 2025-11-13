import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Mock business profiles data (for invoices)
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

		return json(profiles);
	} catch (error) {
		console.error('Profiles error:', error);
		return json({ error: 'Failed to load profiles' }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
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

		const body = await request.json();
		const newProfile = {
			id: Date.now().toString(),
			...body
		};
		profiles.push(newProfile);

		return json(newProfile, { status: 201 });
	} catch (error) {
		console.error('Create profile error:', error);
		return json({ error: 'Failed to create profile' }, { status: 500 });
	}
}
