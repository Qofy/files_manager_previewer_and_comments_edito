import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

		// Generate mock dashboard data
		const months = [];
		const totals = [];
		const now = new Date();

		// Generate last 12 months of data
		for (let i = 11; i >= 0; i--) {
			const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const monthName = date.toLocaleString('default', { month: 'short' });
			months.push(monthName);

			// Generate random revenue between 5000 and 15000
			const revenue = Math.random() * 10000 + 5000;
			totals.push(parseFloat(revenue.toFixed(2)));
		}

		// Mock spending by category
		const categories = [
			['Software', Math.random() * 2000 + 1000],
			['Marketing', Math.random() * 3000 + 2000],
			['Salaries', Math.random() * 10000 + 8000],
			['Infrastructure', Math.random() * 1500 + 500],
			['Office', Math.random() * 1000 + 500]
		].map(([name, value]) => [name, parseFloat(value.toFixed(2))]);

		// Mock financial totals
		const paid_total = Math.random() * 50000 + 30000;
		const unpaid_total = Math.random() * 20000 + 10000;

		return json({
			months,
			totals,
			categories,
			paid_total: parseFloat(paid_total.toFixed(2)),
			unpaid_total: parseFloat(unpaid_total.toFixed(2))
		});
	} catch (error) {
		console.error('Dashboard summary error:', error);
		return json({ error: 'Failed to load dashboard data' }, { status: 500 });
	}
}
