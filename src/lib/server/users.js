// Shared in-memory user store
// In production, replace this with a real database (PostgreSQL, MongoDB, etc.)

export const users = new Map();

// Initialize with a test user for development
users.set('admin', {
	id: '1',
	username: 'admin',
	password: 'admin123', // In production, hash with bcrypt!
	createdAt: new Date().toISOString()
});
