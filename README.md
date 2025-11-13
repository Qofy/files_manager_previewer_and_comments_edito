# File Manager, Previewer & Comments Editor

A full-featured file management system with PDF/image preview capabilities, commenting system, invoice management, and user authentication built with SvelteKit.

## 🚀 Features

- **File Management**: Upload, organize, and manage files in folders
- **Tag/Label System**: Google Drive-style tags for organizing files and folders with color coding
- **Multi-format Preview**: View PDFs, images, videos, audio files, and text documents
- **Commenting System**: Add location-based comments on PDFs with user avatars and timestamps
- **User Authentication**: JWT-based authentication with profile image support
- **Invoice Management**: Create and manage invoices with client information
- **Dashboard**: Analytics with burn rate charts and spending visualization
- **Responsive Design**: Modern, clean UI with sidebar navigation

## 📁 Project Structure

```
├── src/
│   ├── app.html                    # Main HTML template
│   ├── lib/                        # Shared library code
│   │   ├── assets/                 # Static assets (images, icons)
│   │   ├── components/             # Reusable Svelte components
│   │   │   ├── ProfileMenu.svelte  # User profile menu with image upload
│   │   │   ├── TagPill.svelte      # Tag display component
│   │   │   └── TagSelector.svelte  # Tag selection dropdown
│   │   ├── pages/                  # Page components
│   │   │   ├── Aside.svelte        # Sidebar navigation component
│   │   │   └── DashboardMain.svelte # Dashboard main content
│   │   ├── server/                 # Server-side code
│   │   │   ├── storage.js          # In-memory data storage (files/folders/tags)
│   │   │   └── users.js            # User data storage
│   │   └── utils/                  # Utility functions
│   │       ├── api.js              # API client wrapper
│   │       └── auth.js             # Authentication utilities
│   └── routes/                     # SvelteKit routes (file-based routing)
│       ├── +layout.svelte          # Root layout component
│       ├── +page.svelte            # Home page
│       ├── api/                    # Legacy API routes
│       │   └── files/              # File listing endpoint
│       ├── auth/                   # Authentication endpoints
│       │   └── login/              # Login endpoint
│       ├── clients/                # Client management
│       │   ├── [id]/               # Get specific client by ID
│       │   └── +server.js          # List/create clients
│       ├── dashboard/              # Dashboard data
│       │   └── summary/            # Dashboard analytics endpoint
│       ├── files/                  # File management
│       │   ├── [id]/               # File operations (get, delete)
│       │   │   ├── tags/           # Add/remove tags from files
│       │   │   └── +page.svelte    # File viewer page (legacy)
│       │   ├── +page.svelte        # Main file manager UI with tags
│       │   └── +server.js          # File upload/list/filter (supports tag filtering)
│       ├── folders/                # Folder management
│       │   ├── [id]/               # Folder operations
│       │   │   └── tags/           # Add/remove tags from folders
│       │   ├── summary/            # Folder statistics
│       │   └── +server.js          # Create/list folders (supports tag filtering)
│       ├── health/                 # Health check endpoint
│       ├── invoices/               # Invoice management
│       │   ├── [id]/               # Invoice operations
│       │   │   ├── pay/            # Mark invoice as paid
│       │   │   └── +server.js      # Get invoice (JSON or PDF)
│       │   ├── +page.svelte        # Invoice UI
│       │   └── +server.js          # List invoices
│       ├── login/                  # Login page
│       │   └── +page.svelte        # Login UI
│       ├── pdf/                    # PDF comment endpoints
│       │   └── [id]/
│       │       └── comments/       # Get/post comments on PDFs
│       ├── profile/                # User profile management
│       │   └── +server.js          # Get/update user profile & image
│       ├── profiles/               # Business profiles (for invoices)
│       │   ├── [id]/               # Get specific business profile
│       │   └── +server.js          # List/create business profiles
│       ├── register/               # User registration
│       │   └── +server.js          # Registration endpoint
│       └── tags/                   # Tag management
│           └── +server.js          # Get available tags
├── static/                         # Static files served directly
│   └── robots.txt                  # SEO robots configuration
├── uploads/                        # User-uploaded files storage
├── .svelte-kit/                    # SvelteKit build output (generated)
├── node_modules/                   # NPM dependencies
├── API_ENDPOINTS.md                # API documentation
├── PROFILE_IMAGE_FEATURE.md        # Profile image feature docs
├── eslint.config.js                # ESLint configuration
├── jsconfig.json                   # JavaScript configuration
├── package.json                    # Project dependencies
├── svelte.config.js                # Svelte/SvelteKit configuration
└── vite.config.js                  # Vite build configuration
```

## 🗂️ Key Directories Explained

### `/src/routes/` - Application Routes

SvelteKit uses file-based routing. Each folder represents a URL path:

- **`+page.svelte`**: Page UI component
- **`+server.js`**: API endpoint (GET, POST, PUT, DELETE)
- **`+layout.svelte`**: Shared layout wrapper
- **`[id]/`**: Dynamic route parameter (e.g., `/files/123`)

### `/src/lib/` - Shared Code

- **`components/`**: Reusable UI components
- **`pages/`**: Complex page sections (Aside, Dashboard)
- **`server/`**: Server-side data storage and business logic
- **`utils/`**: Helper functions (API client, auth)

### `/uploads/` - File Storage

Physical storage for uploaded files. Files are saved with timestamp-based IDs.

### `/static/` - Static Assets

Files served directly without processing (robots.txt, favicon, etc.)

## 🔌 API Endpoints

### Authentication
- `POST /auth/login` - Login with username/password
- `POST /register` - Register new user account

### Files & Folders
- `GET /files` - List files (with filters: category, folder, search, tag)
- `POST /files` - Upload file
- `GET /files/[id]` - Get file content
- `DELETE /files/[id]` - Delete file
- `POST /files/[id]/tags` - Add tags to a file
- `DELETE /files/[id]/tags?tag=<tagId>` - Remove tag from a file
- `GET /folders` - List folders (with filter: tag)
- `POST /folders` - Create folder
- `POST /folders/[id]/tags` - Add tags to a folder
- `DELETE /folders/[id]/tags?tag=<tagId>` - Remove tag from a folder
- `GET /folders/summary` - Folder statistics

### Tags
- `GET /tags` - Get available tags/labels

### Comments
- `GET /pdf/[id]/comments` - Get comments for a file
- `POST /pdf/[id]/comments` - Add comment to file

### User Profile
- `GET /profile` - Get current user profile
- `PUT /profile` - Update profile (including profile image)

### Invoices
- `GET /invoices` - List invoices (filter by status)
- `GET /invoices/[id]` - Get invoice data (JSON or PDF)
- `POST /invoices/[id]/pay` - Mark invoice as paid

### Business Data
- `GET /clients` - List clients
- `GET /clients/[id]` - Get specific client
- `GET /profiles` - List business profiles
- `GET /profiles/[id]` - Get specific business profile
- `GET /dashboard/summary` - Dashboard analytics data

### Health
- `GET /health` - Server health check

## 🛠️ Configuration Files

- **`package.json`**: Dependencies and scripts
  - `lucide-svelte`: Modern icon library
  - `pdfkit`: PDF generation
  - `jsonwebtoken`: JWT authentication
  - `chart.js`: Data visualization

- **`svelte.config.js`**: SvelteKit configuration
- **`vite.config.js`**: Vite bundler settings
- **`eslint.config.js`**: Code linting rules
- **`jsconfig.json`**: JavaScript/IDE settings

## 🎨 Key Features Implementation

### Tag/Label System (Google Drive-style)
- **Predefined Tags**: 6 color-coded tags (Work, Personal, Important, Shared, Archived, Draft)
- **Tag Components**:
  - `TagPill.svelte`: Displays tags with colors
  - `TagSelector.svelte`: Dropdown for adding/removing tags
- **Filtering**: Filter files and folders by tag
- **Tag Operations**:
  - Add multiple tags to files/folders via `POST /files/[id]/tags` or `POST /folders/[id]/tags`
  - Remove tags via `DELETE /files/[id]/tags?tag=<tagId>`
- **Color Coding**: Each tag has a unique color for visual organization
- **Storage**: Tags stored as arrays in file/folder metadata

### File Upload & Storage
Files are uploaded via `POST /files` and stored in the `uploads/` directory with metadata in memory (Map structure). Each file has:
- ID (timestamp-based)
- Name, type, category
- Size, folder association
- Tags array for organization
- Upload date and owner

### PDF Viewing with Comments
- Uses PDF.js library loaded via CDN
- Canvas-based rendering for each page
- Click to add location-based comments (x, y coordinates)
- Comments stored with page number, position, text, and timestamp

### Profile Image Upload
- Images uploaded as base64 strings
- Stored in user profile data
- Displayed in dashboard header and file comments
- Max size: 2MB

### Authentication Flow
1. User logs in via `/login`
2. Server generates JWT token
3. Token stored in localStorage
4. Included in all API requests via Authorization header
5. Server verifies token on protected routes

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Installation

```sh
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`

## 📝 Development Notes

### Data Storage
Currently uses in-memory storage (Map structures) for:
- Users
- Files metadata
- Folders
- Invoices
- Clients
- Business profiles

**For production**: Replace with a real database (PostgreSQL, MongoDB, etc.)

### File Storage
Files are stored in the `uploads/` directory. For production, consider:
- Cloud storage (S3, Google Cloud Storage)
- CDN for faster delivery
- Image optimization

### Security Considerations
- Passwords are stored in plain text (use bcrypt in production)
- JWT secret should be in environment variables
- Add rate limiting
- Implement input validation
- Add CSRF protection

## 🔧 Environment Variables

Create a `.env` file:

```env
JWT_SECRET=your-secret-key-here
```

## 📚 Additional Documentation

- **API_ENDPOINTS.md**: Detailed API documentation with request/response examples
- **PROFILE_IMAGE_FEATURE.md**: Profile image upload feature documentation

## 🤝 Contributing

This is a demonstration project. For production use:
1. Replace in-memory storage with a database
2. Implement proper password hashing
3. Add comprehensive error handling
4. Set up automated testing
5. Configure production environment

## 📄 License

MIT License - Feel free to use this project as a template for your own applications.
