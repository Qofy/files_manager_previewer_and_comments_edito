import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Mock invoices data
const invoices = [
	{
		id: '1',
		client_id: '1',
		client_name: 'Acme Corp',
		profile_id: '1',
		invoice_number: 'INV-2025-001',
		date: '2025-01-15',
		due_date: '2025-02-15',
		amount: 5420.0,
		total: 5420.0,
		paid: false,
		status: 'pending',
		items: [
			{ description: 'Web Development', quantity: 40, rate: 100, unit_price: 100, amount: 4000 },
			{ description: 'UI Design', quantity: 20, rate: 80, unit_price: 80, amount: 1600 }
		]
	},
	{
		id: '2',
		client_id: '2',
		client_name: 'TechStart Inc',
		profile_id: '1',
		invoice_number: 'INV-2025-002',
		date: '2025-01-20',
		due_date: '2025-02-20',
		amount: 8950.0,
		total: 8950.0,
		paid: true,
		status: 'paid',
		items: [
			{ description: 'Consulting Services', quantity: 60, rate: 150, unit_price: 150, amount: 9000 }
		]
	},
	{
		id: '3',
		client_id: '3',
		client_name: 'Global Solutions',
		profile_id: '1',
		invoice_number: 'INV-2025-003',
		date: '2025-02-01',
		due_date: '2025-03-01',
		amount: 12300.0,
		total: 12300.0,
		paid: false,
		status: 'overdue',
		items: [
			{
				description: 'Software Development',
				quantity: 80,
				rate: 120,
				unit_price: 120,
				amount: 9600
			},
			{ description: 'Project Management', quantity: 30, rate: 90, unit_price: 90, amount: 2700 }
		]
	}
];

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, url }) {
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

		// Filter by status if provided
		const status = url.searchParams.get('status');
		let filtered = invoices;

		if (status === 'paid') {
			filtered = invoices.filter((inv) => inv.paid);
		} else if (status === 'unpaid') {
			filtered = invoices.filter((inv) => !inv.paid);
		}

		return json(filtered);
	} catch (error) {
		console.error('Invoices error:', error);
		return json({ error: 'Failed to load invoices' }, { status: 500 });
	}
}

export { invoices };
