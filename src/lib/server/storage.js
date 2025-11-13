// In-memory storage (replace with database in production)
export const foldersStorage = new Map();
export const filesStorage = new Map();

// Predefined tags/labels
export const availableTags = [
	{ id: 'work', name: 'Work', color: '#1967d2' },
	{ id: 'personal', name: 'Personal', color: '#188038' },
	{ id: 'important', name: 'Important', color: '#d93025' },
	{ id: 'shared', name: 'Shared', color: '#f9ab00' },
	{ id: 'archived', name: 'Archived', color: '#5f6368' },
	{ id: 'draft', name: 'Draft', color: '#e37400' }
];

// Initialize with default folders
foldersStorage.set('1', {
	id: '1',
	name: 'Documents',
	path: '/Documents',
	parent_id: null,
	owner: 'admin',
	tags: ['work'],
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
});

foldersStorage.set('2', {
	id: '2',
	name: 'Images',
	path: '/Images',
	parent_id: null,
	owner: 'admin',
	tags: ['work', 'shared'],
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
});

foldersStorage.set('3', {
	id: '3',
	name: 'Projects',
	path: '/Projects',
	parent_id: null,
	owner: 'admin',
	tags: ['important'],
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
});

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

// Initialize with sample files
filesStorage.set('1', {
	id: '1',
	name: 'Project Proposal.pdf',
	type: 'application/pdf',
	category: 'document',
	size: 1024000,
	folder_id: '1',
	owner: 'admin',
	tags: ['work', 'important'],
	uploaded_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
});

filesStorage.set('2', {
	id: '2',
	name: 'Team Photo.jpg',
	type: 'image/jpeg',
	category: 'image',
	size: 512000,
	folder_id: '2',
	owner: 'admin',
	tags: ['personal', 'shared'],
	uploaded_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
});

filesStorage.set('3', {
	id: '3',
	name: 'App Mockup.png',
	type: 'image/png',
	category: 'image',
	size: 256000,
	folder_id: '3',
	owner: 'admin',
	tags: ['work', 'draft'],
	uploaded_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
});

filesStorage.set('4', {
	id: '4',
	name: 'Meeting Notes.txt',
	type: 'text/plain',
	category: 'document',
	size: 2048,
	folder_id: '1',
	owner: 'admin',
	tags: ['work'],
	uploaded_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
});

filesStorage.set('5', {
	id: '5',
	name: 'Invoice Template.xlsx',
	type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	category: 'spreadsheet',
	size: 102400,
	folder_id: '1',
	owner: 'admin',
	tags: ['work', 'important'],
	uploaded_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
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

// Additional sample PDF files for testing
filesStorage.set('sample-invoice-2025.pdf', {
	id: 'sample-invoice-2025.pdf',
	name: 'Sample_Invoice_2025.pdf',
	type: 'pdf',
	category: 'documents',
	size: 245000,
	folder_id: '1',
	owner: 'admin',
	uploaded_at: '2025-01-15T10:30:00Z',
	updated_at: '2025-01-15T10:30:00Z'
});

filesStorage.set('project-proposal.pdf', {
	id: 'project-proposal.pdf',
	name: 'Project_Proposal.pdf',
	type: 'pdf',
	category: 'documents',
	size: 1200000,
	folder_id: '1',
	owner: 'admin',
	uploaded_at: '2025-02-01T14:20:00Z',
	updated_at: '2025-02-01T14:20:00Z'
});

filesStorage.set('contract-template.pdf', {
	id: 'contract-template.pdf',
	name: 'Contract_Template.pdf',
	type: 'pdf',
	category: 'documents',
	size: 180000,
	folder_id: '1',
	owner: 'admin',
	uploaded_at: '2025-02-10T09:15:00Z',
	updated_at: '2025-02-10T09:15:00Z'
});

filesStorage.set('annual-report-2024.pdf', {
	id: 'annual-report-2024.pdf',
	name: 'Annual_Report_2024.pdf',
	type: 'pdf',
	category: 'documents',
	size: 3500000,
	folder_id: '1',
	owner: 'admin',
	uploaded_at: '2025-01-05T16:45:00Z',
	updated_at: '2025-01-05T16:45:00Z'
});

filesStorage.set('meeting-notes.pdf', {
	id: 'meeting-notes.pdf',
	name: 'Meeting_Notes_Jan.pdf',
	type: 'pdf',
	category: 'documents',
	size: 92000,
	folder_id: '1',
	owner: 'admin',
	uploaded_at: '2025-01-25T11:00:00Z',
	updated_at: '2025-01-25T11:00:00Z'
});
