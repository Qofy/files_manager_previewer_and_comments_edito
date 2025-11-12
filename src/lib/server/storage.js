// In-memory storage (replace with database in production)
export const foldersStorage = new Map();
export const filesStorage = new Map();

// Initialize with default folders
foldersStorage.set('1', {
	id: '1',
	name: 'Documents',
	path: '/Documents',
	parent_id: null,
	owner: 'admin',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
});

foldersStorage.set('2', {
	id: '2',
	name: 'Images',
	path: '/Images',
	parent_id: null,
	owner: 'admin',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
});

foldersStorage.set('3', {
	id: '3',
	name: 'Projects',
	path: '/Projects',
	parent_id: null,
	owner: 'admin',
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
