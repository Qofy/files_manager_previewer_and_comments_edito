import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET() {
	return json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		service: 'File Manager & Invoice System'
	});
}
