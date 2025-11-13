import { error, json } from '@sveltejs/kit';
import { filesStorage } from '$lib/server/storage.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
	try {
		const fileId = params.id;

		if (!fileId) {
			throw error(400, 'File ID is required');
		}

		// Get file metadata from storage
		const fileMetadata = filesStorage.get(fileId);

		if (!fileMetadata) {
			throw error(404, 'File not found');
		}

		// Return only the metadata (not the actual file content)
		// Remove sensitive data like owner info if needed
		const publicMetadata = {
			id: fileMetadata.id,
			name: fileMetadata.name,
			type: fileMetadata.type,
			size: fileMetadata.size,
			category: fileMetadata.category,
			uploaded_at: fileMetadata.uploaded_at,
			folder_id: fileMetadata.folder_id,
			tags: fileMetadata.tags || []
		};

		return json(publicMetadata);
	} catch (err) {
		console.error('Share metadata error:', err);
		if (err.status) {
			throw err;
		}
		throw error(500, `Failed to load file metadata: ${err.message}`);
	}
}
