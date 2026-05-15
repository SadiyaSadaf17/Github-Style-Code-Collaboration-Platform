# API Documentation

## Base URL
`http://localhost:5000` (Development)

## Authentication
Most endpoints require Bearer token in Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Authentication APIs

### 1. Local Login
**Endpoint**: `POST /common-api/login`
**Auth**: No
**Description**: Authenticate user with email and password

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "message": "Login successful",
  "payload": {
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "john_doe",
      "email": "user@example.com",
      "role": "USER"
    }
  }
}
```

### 2. Google OAuth
**Endpoint**: `GET /auth/google`
**Auth**: No
**Description**: Initiate Google OAuth login

### 3. Google Callback
**Endpoint**: `GET /auth/google/callback`
**Auth**: No
**Description**: Google OAuth callback

### 4. GitHub OAuth
**Endpoint**: `GET /auth/github`
**Auth**: No
**Description**: Initiate GitHub OAuth login

### 5. GitHub Callback
**Endpoint**: `GET /auth/github/callback`
**Auth**: No
**Description**: GitHub OAuth callback

### 6. Refresh Token
**Endpoint**: `POST /auth/refresh`
**Auth**: No
**Description**: Get new access token using refresh token

**Request Body**:
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response** (200):
```json
{
  "message": "Token refreshed successfully",
  "payload": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "john_doe",
      "email": "user@example.com",
      "role": "USER"
    }
  }
}
```

### 7. Get Profile
**Endpoint**: `GET /auth/profile`
**Auth**: Yes
**Description**: Get current user profile

**Response** (200):
```json
{
  "message": "Profile fetched successfully",
  "payload": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "avatar": "https://...",
    "organizations": [],
    "teams": [],
    "contributionStats": {
      "commits": 42,
      "pullRequests": 15,
      "issues": 8,
      "repositories": 5
    }
  }
}
```

### 8. Logout
**Endpoint**: `POST /auth/logout`
**Auth**: Yes
**Description**: Logout user and clear session

**Response** (200):
```json
{
  "message": "Logged out successfully"
}
```

---

## Organization APIs

### 1. Create Organization
**Endpoint**: `POST /org-api/`
**Auth**: Yes (USER+)
**Description**: Create new organization

**Request Body**:
```json
{
  "name": "My Company",
  "login": "my-company",
  "description": "Company description",
  "website": "https://company.com",
  "email": "org@company.com",
  "location": "San Francisco, CA",
  "avatar": "https://..."
}
```

**Response** (201):
```json
{
  "message": "Organization created successfully",
  "payload": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "My Company",
    "login": "my-company",
    "owner": "507f1f77bcf86cd799439011",
    "members": [
      {
        "user": "507f1f77bcf86cd799439011",
        "role": "OWNER"
      }
    ]
  }
}
```

### 2. List Organizations
**Endpoint**: `GET /org-api?page=1&limit=10`
**Auth**: No
**Description**: Get paginated list of organizations

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response** (200):
```json
{
  "message": "Organizations fetched successfully",
  "payload": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### 3. Get Organization
**Endpoint**: `GET /org-api/:orgIdOrLogin`
**Auth**: No
**Description**: Get organization by ID or login name

**Response** (200):
```json
{
  "message": "Organization fetched successfully",
  "payload": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "My Company",
    "login": "my-company",
    "description": "Company description",
    "members": [...],
    "teams": []
  }
}
```

### 4. Update Organization
**Endpoint**: `PUT /org-api/:orgId`
**Auth**: Yes (ADMIN in org+)
**Description**: Update organization details

**Request Body** (any of):
```json
{
  "description": "New description",
  "website": "https://newurl.com",
  "location": "New York, NY",
  "avatar": "https://..."
}
```

**Response** (200):
```json
{
  "message": "Organization updated successfully",
  "payload": {...}
}
```

### 5. Delete Organization
**Endpoint**: `DELETE /org-api/:orgId`
**Auth**: Yes (OWNER+)
**Description**: Delete organization

**Response** (200):
```json
{
  "message": "Organization deleted successfully",
  "payload": {...}
}
```

### 6. Add Member to Organization
**Endpoint**: `POST /org-api/:orgId/members`
**Auth**: Yes (ADMIN in org+)
**Description**: Add member to organization

**Request Body**:
```json
{
  "userId": "507f1f77bcf86cd799439013",
  "role": "MEMBER"
}
```

**Response** (200):
```json
{
  "message": "Member added successfully",
  "payload": {...}
}
```

### 7. Remove Member from Organization
**Endpoint**: `DELETE /org-api/:orgId/members/:userId`
**Auth**: Yes (ADMIN in org+)
**Description**: Remove member from organization

**Response** (200):
```json
{
  "message": "Member removed successfully",
  "payload": {...}
}
```

### 8. Update Member Role
**Endpoint**: `PATCH /org-api/:orgId/members/:userId`
**Auth**: Yes (ADMIN in org+)
**Description**: Update member role in organization

**Request Body**:
```json
{
  "role": "ADMIN"
}
```

**Response** (200):
```json
{
  "message": "Member role updated successfully",
  "payload": {...}
}
```

### 9. Get Organization Members
**Endpoint**: `GET /org-api/:orgId/members`
**Auth**: No
**Description**: Get all members of organization

**Response** (200):
```json
{
  "message": "Organization members fetched successfully",
  "payload": [
    {
      "user": {
        "_id": "507f1f77bcf86cd799439011",
        "username": "john_doe",
        "email": "john@example.com",
        "avatar": "https://..."
      },
      "role": "OWNER",
      "addedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 10. Get User Organizations
**Endpoint**: `GET /org-api/user/:userId`
**Auth**: No
**Description**: Get all organizations for a user

**Response** (200):
```json
{
  "message": "User organizations fetched successfully",
  "payload": [
    {
      "organization": {...},
      "role": "OWNER"
    }
  ]
}
```

---

## User APIs

### 1. Register User
**Endpoint**: `POST /user-api/users`
**Auth**: No
**Description**: Create new user account

**Request Body**:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response** (201):
```json
{
  "message": "User created",
  "payload": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

### 2. Get User Profile by Username
**Endpoint**: `GET /user-api/users/profile/:username`
**Auth**: No
**Description**: Get user profile by username

**Response** (200):
```json
{
  "message": "User fetched",
  "payload": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "bio": "Software developer",
    "location": "San Francisco",
    "contributionStats": {...}
  }
}
```

### 3. Update User
**Endpoint**: `PATCH /user-api/users/:id`
**Auth**: Yes
**Description**: Update user profile

**Request Body** (any of):
```json
{
  "bio": "New bio",
  "avatar": "https://...",
  "location": "New York",
  "website": "https://example.com"
}
```

**Response** (200):
```json
{
  "message": "User updated successfully",
  "payload": {...}
}
```

### 4. Delete User
**Endpoint**: `DELETE /user-api/users/:id`
**Auth**: Yes
**Description**: Delete user account

**Response** (200):
```json
{
  "message": "User deleted successfully",
  "payload": {...}
}
```

---

## Repository APIs

### 1. Create Repository
**Endpoint**: `POST /repo-api/repos`
**Auth**: Yes (USER+)
**Description**: Create new repository

**Request Body**:
```json
{
  "name": "my-project",
  "description": "Project description",
  "isPrivate": false,
  "defaultBranch": "main"
}
```

### 2. List Repositories
**Endpoint**: `GET /repo-api/repos`
**Auth**: No
**Description**: Get repositories (paginated)

### 3. Get Repository
**Endpoint**: `GET /repo-api/repos/:repoId`
**Auth**: No
**Description**: Get repository details

### 4. Update Repository
**Endpoint**: `PUT /repo-api/repos/:repoId`
**Auth**: Yes (PUSH+)
**Description**: Update repository settings

### 5. Delete Repository
**Endpoint**: `DELETE /repo-api/repos/:repoId`
**Auth**: Yes (ADMIN in repo)
**Description**: Delete repository

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Invalid request",
  "error": "Specific error details"
}
```

### 401 Unauthorized
```json
{
  "message": "Authorization token is required",
  "error": "MISSING_TOKEN"
}
```

### 403 Forbidden
```json
{
  "message": "Access denied: Insufficient permissions",
  "requiredRoles": ["ADMIN"],
  "userRole": "USER"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Server error",
  "error": "Error details"
}
```

---

## Rate Limiting

Rate limits are applied based on user role:

| Role | Requests | Window |
|------|----------|--------|
| ADMIN | 1000 | 15 min |
| MAINTAINER | 500 | 15 min |
| CONTRIBUTOR | 300 | 15 min |
| USER | 100 | 15 min |

---

## Pagination

List endpoints support pagination:

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response**:
```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

---

## WebSocket Events

### Connection
```javascript
socket.on('connection', () => {
  // User connected
});
```

### Repository Events
- `repo:join` - Join repository room
- `repo:leave` - Leave repository room

### File Editing
- `file:edit:start` - Start editing file
- `file:edit:update` - Update file content
- `file:edit:end` - Stop editing file

### Notifications
- `notification:new` - New notification received

---

## Testing Endpoints

### Using cURL

#### Login
```bash
curl -X POST http://localhost:5000/common-api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

#### Get Profile
```bash
curl -X GET http://localhost:5000/auth/profile \
  -H "Authorization: Bearer <token>"
```

#### Create Organization
```bash
curl -X POST http://localhost:5000/org-api/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"My Org","login":"my-org"}'
```

---

## Webhooks

Webhooks support incoming POST requests for:
- Push events
- Pull request events
- Issue events
- Release events

---

## Rate Limit Headers

Responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```