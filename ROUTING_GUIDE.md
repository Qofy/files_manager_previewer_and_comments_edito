# SvelteKit Routing Guide

## Overview
This application uses SvelteKit's file-based routing system. The file structure in `/src/routes/` directly maps to URL paths.

## Routing Conventions

### File Types
- **`+page.svelte`** - UI component that renders a page
- **`+server.js`** - API endpoint handler (GET, POST, PUT, DELETE)
- **`+layout.svelte`** - Shared layout wrapper for nested routes
- **`[id]/`** - Dynamic route parameter (e.g., `/files/123` → `id = '123'`)

---

## Route Structure

### Root Level Routes

#### `/` - Home Page
**File:** `src/routes/+page.svelte`
- **Purpose:** Landing page / redirect to dashboard or login
- **Functions:** Initial entry point for the application

#### `/+layout.svelte`
**File:** `src/routes/+layout.svelte`
- **Purpose:** Root layout component that wraps all pages
- **Functions:** 
  - Provides global layout structure
  - Can include global navigation or styles
  - Wraps all child routes

---

### Authentication Routes

#### `/login` - Login Page
**File:** `src/routes/login/+page.svelte`
- **Purpose:** User login interface
- **Functions:**
  - Displays login form (username/password)
  - Submits credentials to `/auth/login`
  - Stores JWT token in localStorage
  - Redirects to dashboard on success
- **Components Used:** Form inputs, submit button

#### `/auth/login` - Login API
**File:** `src/routes/auth/login/+server.js`
- **Purpose:** Authentication endpoint
- **HTTP Methods:**
  - `POST` - Authenticate user
- **Functions:**
  - Validates username and password
  - Generates JWT token
  - Returns token and user data
- **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "password"
  }
  ```
- **Response:**
  ```json
  {
    "token": "jwt_token_here",
    "username": "admin"
  }
  ```

#### `/register` - User Registration API
**File:** `src/routes/register/+server.js`
- **Purpose:** New user registration
- **HTTP Methods:**
  - `POST` - Create new user account
- **Functions:**
  - Validates username uniqueness
  - Hashes password
  - Creates user in storage
  - Returns success/error message
- **Request Body:**
  ```json
  {
    "username": "newuser",
    "password": "securepass"
  }
  ```

---

### Dashboard Routes

#### `/dashboard` - Dashboard Page
**File:** `src/routes/dashboard/+page.svelte`
- **Purpose:** Main dashboard view
- **Functions:**
  - Displays analytics and charts
  - Shows burn rate and spending data
  - Includes sidebar navigation
  - Displays user profile menu
- **Components Used:** 
  - `DashboardMain.svelte`
  - `Aside.svelte`
  - `ProfileMenu.svelte`
  - Chart.js for visualizations

#### `/dashboard/summary` - Dashboard Data API
**File:** `src/routes/dashboard/summary/+server.js`
- **Purpose:** Provides dashboard analytics data
- **HTTP Methods:**
  - `GET` - Retrieve dashboard statistics
- **Functions:**
  - Returns monthly spending data
  - Calculates burn rate
  - Aggregates file/folder counts
- **Response:**
  ```json
  {
    "burnRate": 15000,
    "monthlyData": [
      { "month": "Jan", "spent": 12000 },
      { "month": "Feb", "spent": 15000 }
    ]
  }
  ```
- **Authentication:** Requires JWT token

---

### File Management Routes

#### `/files` - File Manager Page
**File:** `src/routes/files/+page.svelte`
- **Purpose:** Main file management interface
- **Functions:**
  - Lists files and folders
  - File upload functionality
  - PDF/image preview viewer
  - Comment system
  - Tag management (add/remove tags)
  - Drag-and-drop file organization
  - Search and filter (by type, tag, date)
  - Folder navigation
- **Features:**
  - Multi-select files
  - Inline file viewer
  - Real-time comments
  - Tag filtering
- **Components Used:**
  - `Aside.svelte`
  - `ProfileMenu.svelte`
  - `TagPill.svelte`
  - `TagSelector.svelte`
  - PDF.js for PDF rendering

#### `/files` - File Operations API
**File:** `src/routes/files/+server.js`
- **Purpose:** File listing and upload
- **HTTP Methods:**
  - `GET` - List files with filters
  - `POST` - Upload new file
- **GET Functions:**
  - Filters files by folder_id, category, tag, search query
  - Returns array of file objects
  - Sorted by upload date
- **Query Parameters:**
  - `folder_id` - Filter by folder
  - `category` - Filter by type (pdf, documents, images, etc.)
  - `tag` - Filter by tag ID
  - `search` - Search by filename
- **POST Functions:**
  - Accepts multipart/form-data
  - Saves file to `uploads/` directory
  - Creates file metadata entry
  - Returns created file object
- **Request (POST):**
  ```
  FormData:
    file: <binary>
    folder_id: "1" (optional)
  ```
- **Authentication:** Requires JWT token

#### `/files/[id]` - File Download/View API
**File:** `src/routes/files/[id]/+server.js`
- **Purpose:** Get specific file or delete it
- **HTTP Methods:**
  - `GET` - Download/stream file
  - `DELETE` - Delete file
- **GET Functions:**
  - Reads file from uploads directory
  - Sets appropriate content-type header
  - Streams file to client
- **DELETE Functions:**
  - Removes file from storage
  - Deletes physical file from disk
  - Returns success message
- **URL:** `/files/123`
- **Authentication:** Requires JWT token

#### `/files/[id]` - File Viewer Page (Legacy)
**File:** `src/routes/files/[id]/+page.svelte`
- **Purpose:** Standalone file viewer page
- **Functions:**
  - View single file in full page
  - PDF rendering
  - Image display
- **Note:** Mostly replaced by inline viewer in main `/files` page

#### `/files/[id]/tags` - File Tag Management API
**File:** `src/routes/files/[id]/tags/+server.js`
- **Purpose:** Add or remove tags from files
- **HTTP Methods:**
  - `POST` - Add tags to file
  - `DELETE` - Remove tag from file
- **POST Functions:**
  - Accepts array of tag IDs
  - Adds tags (prevents duplicates)
  - Updates file metadata
  - Returns updated file
- **DELETE Functions:**
  - Removes specific tag via query parameter
  - Returns updated file
- **Request (POST):**
  ```json
  {
    "tags": ["work", "important"]
  }
  ```
- **URL (DELETE):** `/files/123/tags?tag=work`
- **Authentication:** Requires JWT token

---

### Folder Management Routes

#### `/folders` - Folder Operations API
**File:** `src/routes/folders/+server.js`
- **Purpose:** List and create folders
- **HTTP Methods:**
  - `GET` - List folders
  - `POST` - Create new folder
- **GET Functions:**
  - Filters folders by parent_id and tag
  - Returns folder hierarchy
  - Sorted by creation date
- **Query Parameters:**
  - `parent_id` - Filter by parent folder
  - `tag` - Filter by tag ID
- **POST Functions:**
  - Creates new folder
  - Builds folder path
  - Checks for duplicate names
  - Returns created folder
- **Request (POST):**
  ```json
  {
    "name": "New Folder",
    "parent_id": "1"
  }
  ```
- **Authentication:** Requires JWT token

#### `/folders/[id]/tags` - Folder Tag Management API
**File:** `src/routes/folders/[id]/tags/+server.js`
- **Purpose:** Add or remove tags from folders
- **HTTP Methods:**
  - `POST` - Add tags to folder
  - `DELETE` - Remove tag from folder
- **POST Functions:**
  - Accepts array of tag IDs
  - Adds tags (prevents duplicates)
  - Updates folder metadata
  - Returns updated folder
- **DELETE Functions:**
  - Removes specific tag via query parameter
  - Returns updated folder
- **Request (POST):**
  ```json
  {
    "tags": ["work"]
  }
  ```
- **URL (DELETE):** `/folders/123/tags?tag=work`
- **Authentication:** Requires JWT token

#### `/folders/summary` - Folder Statistics API
**File:** `src/routes/folders/summary/+server.js`
- **Purpose:** Get folder statistics
- **HTTP Methods:**
  - `GET` - Retrieve folder stats
- **Functions:**
  - Counts total folders
  - Calculates folder sizes
  - Returns aggregated data
- **Response:**
  ```json
  {
    "totalFolders": 5,
    "totalSize": 1024000
  }
  ```
- **Authentication:** Requires JWT token

---

### Tag Management Routes

#### `/tags` - Tags API
**File:** `src/routes/tags/+server.js`
- **Purpose:** Get available tags/labels
- **HTTP Methods:**
  - `GET` - List all tags
- **Functions:**
  - Returns predefined tags with colors
  - Used for tag selection UI
- **Response:**
  ```json
  [
    { "id": "work", "name": "Work", "color": "#1967d2" },
    { "id": "personal", "name": "Personal", "color": "#188038" },
    { "id": "important", "name": "Important", "color": "#d93025" },
    { "id": "shared", "name": "Shared", "color": "#f9ab00" },
    { "id": "archived", "name": "Archived", "color": "#5f6368" },
    { "id": "draft", "name": "Draft", "color": "#e37400" }
  ]
  ```
- **Authentication:** Requires JWT token

---

### Comment Routes

#### `/pdf/[id]/comments` - PDF Comments API
**File:** `src/routes/pdf/[id]/comments/+server.js`
- **Purpose:** Manage comments on PDF files
- **HTTP Methods:**
  - `GET` - Get all comments for a file
  - `POST` - Add new comment
- **GET Functions:**
  - Retrieves all comments for file ID
  - Filters by scope (private/public)
  - Returns sorted by timestamp
- **Query Parameters:**
  - `scope` - Filter by private or public comments
- **POST Functions:**
  - Creates new comment with position data
  - Stores page number, x/y coordinates
  - Associates with user
  - Returns created comment
- **Request (POST):**
  ```json
  {
    "page": 1,
    "x": 100,
    "y": 200,
    "text": "Great point!",
    "scope": "private"
  }
  ```
- **Response (GET):**
  ```json
  [
    {
      "id": "1",
      "page": 1,
      "x": 100,
      "y": 200,
      "text": "Great point!",
      "username": "admin",
      "timestamp": "2024-01-15T10:30:00Z",
      "scope": "private"
    }
  ]
  ```
- **Authentication:** Requires JWT token

---

### User Profile Routes

#### `/profile` - User Profile API
**File:** `src/routes/profile/+server.js`
- **Purpose:** Get and update user profile
- **HTTP Methods:**
  - `GET` - Get current user profile
  - `PUT` - Update profile (including image)
- **GET Functions:**
  - Returns user data from JWT token
  - Includes profile image (base64)
  - Shows account creation date
- **Response (GET):**
  ```json
  {
    "id": "1",
    "username": "admin",
    "profileImage": "data:image/jpeg;base64,...",
    "createdAt": "2024-01-01T00:00:00Z"
  }
  ```
- **PUT Functions:**
  - Updates profile image (base64 string)
  - Can set to null to remove image
  - Returns updated profile
- **Request (PUT):**
  ```json
  {
    "profileImage": "data:image/jpeg;base64,..."
  }
  ```
- **Authentication:** Requires JWT token

---

### Invoice Routes

#### `/invoices` - Invoice Management Page
**File:** `src/routes/invoices/+page.svelte`
- **Purpose:** Invoice listing and management UI
- **Functions:**
  - Displays list of invoices
  - Filter by status (paid/unpaid)
  - View invoice details
  - Generate PDF invoices
  - Mark invoices as paid
- **Components Used:**
  - `Aside.svelte`
  - `ProfileMenu.svelte`

#### `/invoices` - Invoice List API
**File:** `src/routes/invoices/+server.js`
- **Purpose:** Get invoice data
- **HTTP Methods:**
  - `GET` - List all invoices
- **Functions:**
  - Returns array of invoice objects
  - Includes client info, items, totals
  - Filters by status if provided
- **Query Parameters:**
  - `status` - Filter by paid/unpaid
- **Response:**
  ```json
  [
    {
      "id": "1",
      "invoice_number": "INV-001",
      "client_id": "1",
      "profile_id": "1",
      "issue_date": "2024-01-15",
      "due_date": "2024-02-15",
      "items": [
        {
          "description": "Service",
          "quantity": 10,
          "unit_price": 100,
          "rate": 100
        }
      ],
      "total": 1000,
      "status": "unpaid"
    }
  ]
  ```
- **Authentication:** Requires JWT token

#### `/invoices/[id]` - Invoice Detail API
**File:** `src/routes/invoices/[id]/+server.js`
- **Purpose:** Get specific invoice (JSON or PDF)
- **HTTP Methods:**
  - `GET` - Get invoice data or PDF
- **Functions:**
  - Returns JSON by default
  - Generates PDF if `format=pdf` query param
  - Also generates PDF if Accept header is `application/pdf`
  - Uses PDFKit for PDF generation
- **URL Examples:**
  - `/invoices/1` → JSON response
  - `/invoices/1?format=pdf` → PDF download
- **Response (JSON):**
  ```json
  {
    "id": "1",
    "invoice_number": "INV-001",
    "client": { "name": "Client Name" },
    "profile": { "name": "Business Name" },
    "items": [...],
    "total": 1000
  }
  ```
- **Authentication:** Requires JWT token

#### `/invoices/[id]/pay` - Mark Invoice Paid API
**File:** `src/routes/invoices/[id]/pay/+server.js`
- **Purpose:** Mark invoice as paid
- **HTTP Methods:**
  - `POST` - Update invoice status
- **Functions:**
  - Changes invoice status to "paid"
  - Updates payment date
  - Returns updated invoice
- **Response:**
  ```json
  {
    "id": "1",
    "status": "paid",
    "paidAt": "2024-01-15T10:30:00Z"
  }
  ```
- **Authentication:** Requires JWT token

---

### Client & Business Profile Routes

#### `/clients` - Client Management API
**File:** `src/routes/clients/+server.js`
- **Purpose:** List and create clients
- **HTTP Methods:**
  - `GET` - List all clients
  - `POST` - Create new client
- **Functions:**
  - Returns client contact information
  - Used in invoice creation
- **Response (GET):**
  ```json
  [
    {
      "id": "1",
      "name": "Client Name",
      "email": "client@example.com",
      "address": "123 Street"
    }
  ]
  ```
- **Authentication:** Requires JWT token

#### `/clients/[id]` - Client Detail API
**File:** `src/routes/clients/[id]/+server.js`
- **Purpose:** Get specific client
- **HTTP Methods:**
  - `GET` - Get client by ID
- **Functions:**
  - Returns single client object
  - Used in invoice display
- **URL:** `/clients/1`
- **Authentication:** Requires JWT token

#### `/profiles` - Business Profile API
**File:** `src/routes/profiles/+server.js`
- **Purpose:** List business profiles
- **HTTP Methods:**
  - `GET` - List all business profiles
- **Functions:**
  - Returns business information
  - Used for "from" section in invoices
- **Note:** These are business profiles, not user profiles
- **Authentication:** Requires JWT token

#### `/profiles/[id]` - Business Profile Detail API
**File:** `src/routes/profiles/[id]/+server.js`
- **Purpose:** Get specific business profile
- **HTTP Methods:**
  - `GET` - Get profile by ID
- **Functions:**
  - Returns single business profile
  - Used in invoice generation
- **URL:** `/profiles/1`
- **Authentication:** Requires JWT token

---

### Utility Routes

#### `/health` - Health Check API
**File:** `src/routes/health/+server.js`
- **Purpose:** Server health monitoring
- **HTTP Methods:**
  - `GET` - Check server status
- **Functions:**
  - Returns server status
  - Used for monitoring/uptime checks
- **Response:**
  ```json
  {
    "status": "ok",
    "timestamp": "2024-01-15T10:30:00Z"
  }
  ```
- **Authentication:** Not required (public endpoint)

#### `/api/files` - Legacy File API
**File:** `src/routes/api/files/+server.js`
- **Purpose:** Legacy endpoint (deprecated)
- **Functions:**
  - Old file listing endpoint
  - Kept for backwards compatibility
- **Note:** Use `/files` instead

---

## Authentication Flow

### How JWT Authentication Works in Routes:

1. **User logs in** at `/login`
2. **Credentials sent** to `POST /auth/login`
3. **Server validates** and returns JWT token
4. **Token stored** in browser's localStorage
5. **All subsequent requests** include token in header:
   ```javascript
   headers: {
     'Authorization': 'Bearer ' + token
   }
   ```
6. **API endpoints verify** token before processing request
7. **Invalid/missing token** returns 401 Unauthorized

### Protected Routes:
All routes except `/login`, `/auth/login`, `/register`, and `/health` require authentication.

---

## Data Flow Examples

### File Upload Flow:
1. User selects file in `/files` page
2. `+page.svelte` calls `handleUpload()`
3. Sends POST to `/files` API
4. `+server.js` saves file to disk
5. Creates metadata entry
6. Returns success, page reloads file list

### Comment Flow:
1. User clicks on PDF in viewer
2. Comment modal opens
3. User enters text and submits
4. POST to `/pdf/[id]/comments`
5. Comment saved with position data
6. Page refreshes comments list
7. Comment displayed at click location

### Tag Management Flow:
1. User clicks tag button on file/folder
2. `TagSelector` dropdown opens
3. User checks/unchecks tags
4. POST to `/files/[id]/tags` or `/folders/[id]/tags`
5. Backend updates metadata
6. Component receives updated data
7. Tag pills update in UI

---

## File Structure Summary

```
src/routes/
├── +page.svelte                          # Home page
├── +layout.svelte                        # Root layout
├── login/+page.svelte                    # Login UI
├── auth/login/+server.js                 # Login API
├── register/+server.js                   # Registration API
├── dashboard/
│   ├── +page.svelte                      # Dashboard UI
│   └── summary/+server.js                # Dashboard data API
├── files/
│   ├── +page.svelte                      # File manager UI
│   ├── +server.js                        # File list/upload API
│   └── [id]/
│       ├── +page.svelte                  # File viewer (legacy)
│       ├── +server.js                    # File get/delete API
│       └── tags/+server.js               # File tag management API
├── folders/
│   ├── +server.js                        # Folder list/create API
│   ├── summary/+server.js                # Folder stats API
│   └── [id]/tags/+server.js              # Folder tag management API
├── tags/+server.js                       # Tags list API
├── pdf/[id]/comments/+server.js          # PDF comments API
├── profile/+server.js                    # User profile API
├── invoices/
│   ├── +page.svelte                      # Invoice list UI
│   ├── +server.js                        # Invoice list API
│   └── [id]/
│       ├── +server.js                    # Invoice detail/PDF API
│       └── pay/+server.js                # Mark paid API
├── clients/
│   ├── +server.js                        # Client list API
│   └── [id]/+server.js                   # Client detail API
├── profiles/
│   ├── +server.js                        # Business profile list API
│   └── [id]/+server.js                   # Business profile detail API
├── health/+server.js                     # Health check API
└── api/files/+server.js                  # Legacy file API
```

---

## Quick Reference

### Common Patterns

**Get user's files:**
```javascript
GET /files?folder_id=1&category=documents&tag=work
```

**Upload file:**
```javascript
POST /files
FormData: { file: <binary>, folder_id: "1" }
```

**Add tags:**
```javascript
POST /files/123/tags
Body: { tags: ["work", "important"] }
```

**Filter by tag:**
```javascript
GET /files?tag=work
GET /folders?tag=personal
```

**Get comments:**
```javascript
GET /pdf/123/comments?scope=private
```

**Add comment:**
```javascript
POST /pdf/123/comments
Body: { page: 1, x: 100, y: 200, text: "Note", scope: "private" }
```

**Update profile image:**
```javascript
PUT /profile
Body: { profileImage: "data:image/jpeg;base64,..." }
```

---

## Notes

- All API endpoints return JSON (except file downloads and PDF generation)
- All authenticated endpoints require `Authorization: Bearer <token>` header
- Dynamic routes use `[id]` syntax and access via `params.id`
- Query parameters accessed via `url.searchParams.get('param')`
- Files stored in `uploads/` directory (physical files)
- Metadata stored in memory using Map structures (should use database in production)
