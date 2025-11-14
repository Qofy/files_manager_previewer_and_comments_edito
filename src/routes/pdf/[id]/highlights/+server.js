import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Mock highlights storage
const highlightsStore = new Map();

export async function GET({ request, params, url }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                jwt.verify(token, JWT_SECRET);
            } catch {
                // Allow anonymous access
            }
        }

        const fileId = params.id;
        const scope = url.searchParams.get('scope') || 'private';
        const key = `${fileId}_${scope}`;

        const highlights = highlightsStore.get(key) || [];
        return json(highlights);
    } catch (error) {
        console.error('Get highlights error:', error);
        return json({ error: 'Failed to load highlights' }, { status: 500 });
    }
}

export async function POST({ request, params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        let userId;
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.username || decoded.userId;
        } catch {
            return json({ error: 'Invalid token' }, { status: 401 });
        }

        const fileId = params.id;
        const body = await request.json();
        const { text, page, x, y, rangeRect, color, id } = body;

        const highlight = {
            id: id || Date.now().toString(),
            file_id: fileId,
            user_id: userId,
            text,
            page,
            x,
            y,
            rangeRect,
            color,
            comment: null,
            created_at: new Date().toISOString()
        };

        const key = `${fileId}_private`;
        const highlights = highlightsStore.get(key) || [];
        highlights.push(highlight);
        highlightsStore.set(key, highlights);

        return json(highlight, { status: 201 });
    } catch (error) {
        console.error('Create highlight error:', error);
        return json({ error: 'Failed to create highlight' }, { status: 500 });
    }
}