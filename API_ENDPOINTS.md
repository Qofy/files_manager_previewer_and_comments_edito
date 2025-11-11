# API Endpoints Documentation

## Authentication Endpoints

### POST /auth/login
Login with username and password to receive a JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "admin"
}
```

### POST /register
Register a new user account.

**Request:**
```json
{
  "username": "newuser",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "username": "newuser"
}
```

---

## Dashboard Endpoints

### GET /health
Check server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-11T10:48:53.193Z",
  "service": "File Manager & Invoice System"
}
```

### GET /dashboard/summary
Get dashboard summary data including burn rate and spending analytics.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "months": ["Dec", "Jan", "Feb", ...],
  "totals": [13251.11, 11841.32, ...],
  "categories": [
    ["Software", 2459.57],
    ["Marketing", 3008.08],
    ...
  ],
  "paid_total": 51708.99,
  "unpaid_total": 13035.5
}
```

---

## Client Endpoints

### GET /clients
Get list of all clients.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": "1",
    "name": "Acme Corp",
    "email": "contact@acme.com",
    "phone": "+1 555 0100"
  },
  ...
]
```

---

## Invoice Endpoints

### GET /invoices
Get list of invoices, optionally filtered by status.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): `paid`, `unpaid`

**Response:**
```json
[
  {
    "id": "1",
    "client_id": "1",
    "client_name": "Acme Corp",
    "invoice_number": "INV-2025-001",
    "date": "2025-01-15",
    "due_date": "2025-02-15",
    "amount": 5420.00,
    "paid": false,
    "status": "pending",
    "items": [...]
  },
  ...
]
```

### GET /invoices/:id
Get details of a specific invoice.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "1",
  "client_id": "1",
  "client_name": "Acme Corp",
  "invoice_number": "INV-2025-001",
  ...
}
```

### POST /invoices/:id/pay
Mark an invoice as paid.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Invoice marked as paid",
  "invoice": {...}
}
```

---

## File & PDF Endpoints

### GET /files/:id
Get a file by ID (for PDF viewing).

**Headers:** `Authorization: Bearer <token>` (optional)

**Note:** This endpoint needs file storage implementation.

### GET /pdf/:id/comments
Get comments for a PDF file.

**Headers:** `Authorization: Bearer <token>` (optional for public comments)

**Query Parameters:**
- `scope`: `private` or `public`

**Response:**
```json
[
  {
    "id": "1234567890",
    "file_id": "sample.pdf",
    "user_id": "admin",
    "page": 1,
    "x": 0.5,
    "y": 0.3,
    "text": "Great point!",
    "scope": "private",
    "created_at": "2025-11-11T10:00:00Z"
  },
  ...
]
```

### POST /pdf/:id/comments
Add a comment to a PDF file.

**Headers:** 
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Request:**
```json
{
  "page": 1,
  "x": 0.5,
  "y": 0.3,
  "text": "This is a comment",
  "scope": "private"
}
```

**Response:**
```json
{
  "id": "1234567890",
  "file_id": "sample.pdf",
  "user_id": "admin",
  "page": 1,
  "x": 0.5,
  "y": 0.3,
  "text": "This is a comment",
  "scope": "private",
  "created_at": "2025-11-11T10:00:00Z"
}
```

---

## Default Test Credentials

**Username:** `admin`  
**Password:** `admin123`

---

## Notes

- All authenticated endpoints require `Authorization: Bearer <token>` header
- JWT tokens expire after 24 hours
- All data is currently stored in memory (will be lost on server restart)
- For production, implement:
  - Real database (PostgreSQL, MongoDB, etc.)
  - Password hashing (bcrypt)
  - File storage system
  - Rate limiting
  - Input validation and sanitization
