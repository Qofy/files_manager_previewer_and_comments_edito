import { json } from '@sveltejs/kit';
import { availableTags } from '$lib/server/storage.js';

// GET /tags - Get all available tags
export async function GET() {
	return json(availableTags);
}
