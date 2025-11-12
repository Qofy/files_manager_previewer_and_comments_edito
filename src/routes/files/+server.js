import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-secret-key-change-in-production';

// In-memory files storage (replace with database in production)
const filesStorage = new Map();

// Initialize with sample files
filesStorage.set('1', {
  id: '1',
  name: 'Invoice_2025_Q1.pdf',
  type: 'pdf',
  category: 'documents',
  size: 251904,
  folder_id: '1',
  owner: 'admin',
  uploaded_at: '2025-01-15T10:30:00Z',
  updated_at: '2025-01-15T10:30:00Z'
});

filesStorage.set('2', {
  id: '2',
  name: 'Project_Proposal.pdf',
  type: 'pdf',
  category: 'documents',
  size: 1258291,
  folder_id: '1',
  owner: 'admin',
  uploaded_at: '2025-02-01T14:20:00Z',
  updated_at: '2025-02-01T14:20:00Z'
});

filesStorage.set('3', {
  id: '3',
  name: 'Contract_Template.pdf',
  type: 'pdf',
  category: 'documents',
  size: 184320,
  folder_id: '1',
  owner: 'admin',
  uploaded_at: '2025-02-10T09:15:00Z',
  updated_at: '2025-02-10T09:15:00Z'
});

filesStorage.set('4', {
  id: '4',
  name: 'logo.png',
  type: 'png',
  category: 'images',
  size: 45678,
  folder_id: '2',
  owner: 'admin',
  uploaded_at: '2025-01-20T08:00:00Z',
  updated_at: '2025-01-20T08:00:00Z'
});

filesStorage.set('5', {
  id: '5',
  name: 'banner.jpg',
  type: 'jpg',
  category: 'images',
  size: 123456,
  folder_id: '2',
  owner: 'admin',
  uploaded_at: '2025-01-22T10:30:00Z',
  updated_at: '2025-01-22T10:30:00Z'
});

// Helper function to verify JWT
function verifyToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.username;
  } catch {
    return null;
  }
}

// Helper function to determine file category based on extension
function getFileCategory(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) {
    return 'documents';
  } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return 'images';
  } else if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext)) {
    return 'videos';
  } else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
    return 'audio';
  } else {
    return 'other';
  }
}

// GET /files - List all files for the authenticated user
export async function GET({ request, url }) {
  const username = verifyToken(request);
  if (!username) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get query parameters
  const folder_id = url.searchParams.get('folder_id'); // Filter by folder
  const category = url.searchParams.get('category'); // Filter by category
  const search = url.searchParams.get('search'); // Search by name

  // Filter files by owner and optionally by folder_id and category
  let files = Array.from(filesStorage.values())
    .filter(file => file.owner === username);

  // Apply folder filter
  if (folder_id !== null && folder_id !== undefined) {
    if (folder_id === 'null' || folder_id === '') {
      files = files.filter(file => file.folder_id === null || file.folder_id === undefined);
    } else {
      files = files.filter(file => file.folder_id === folder_id);
    }
  }

  // Apply category filter
  if (category && category !== 'all') {
    files = files.filter(file => file.category === category);
  }

  // Apply search filter
  if (search && search.trim() !== '') {
    const searchLower = search.toLowerCase();
    files = files.filter(file => file.name.toLowerCase().includes(searchLower));
  }

  // Sort by upload date (newest first)
  files.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

  return json({ files });
}

// POST /files - Upload a new file
export async function POST({ request }) {
  const username = verifyToken(request);
  if (!username) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder_id = formData.get('folder_id') || null;

    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    // In production, you would:
    // 1. Save the file to disk or cloud storage
    // 2. Generate a unique file ID
    // 3. Store metadata in database

    const fileId = Date.now().toString();
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    const newFile = {
      id: fileId,
      name: file.name,
      type: fileExtension,
      category: getFileCategory(file.name),
      size: file.size,
      folder_id: folder_id,
      owner: username,
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    filesStorage.set(fileId, newFile);

    return json({ file: newFile }, { status: 201 });
  } catch (error) {
    console.error('File upload error:', error);
    return json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

// Export the storage for use in other endpoints
export { filesStorage };
