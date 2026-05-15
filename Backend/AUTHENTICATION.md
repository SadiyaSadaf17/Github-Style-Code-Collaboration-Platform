# Authentication & Authorization Architecture

## Overview
The GitHub Clone platform implements a comprehensive authentication and authorization system featuring:
- Local authentication (email/password)
- OAuth 2.0 integration (Google & GitHub)
- JWT-based token system
- Role-Based Access Control (RBAC)
- Repository and Organization-level permissions

## Authentication System

### 1. Local Authentication
**Endpoint**: `POST /common-api/login`
- Email/password authentication
- bcrypt password hashing (12 rounds)
- Returns JWT access and refresh tokens

### 2. OAuth Integration

#### Google OAuth
- **Provider**: Google OAuth 2.0
- **Endpoint**: `GET /auth/google`
- **Callback**: `/auth/google/callback`
- **Scopes**: profile, email
- **Flow**:
  1. User initiates login via Google
  2. Redirected to Google login page
  3. Upon success, user profile fetched
  4. User created/updated in database
  5. JWT tokens generated and returned
  6. Redirect to frontend with tokens

#### GitHub OAuth
- **Provider**: GitHub OAuth 2.0
- **Endpoint**: `GET /auth/github`
- **Callback**: `/auth/github/callback`
- **Scopes**: user:email, read:user
- **Flow**: Same as Google OAuth

### 3. Token Management

#### Access Token
- **Type**: JWT
- **Expiration**: 15 minutes (configurable)
- **Contains**: userId, email, role
- **Usage**: All authenticated API requests

```javascript
// Token payload
{
  userId: "507f1f77bcf86cd799439011",
  email: "user@example.com",
  role: "USER",
  iat: 1234567890,
  exp: 1234569690
}
```

#### Refresh Token
- **Type**: JWT
- **Expiration**: 7 days (configurable)
- **Contains**: userId
- **Usage**: Obtain new access token

**Endpoint**: `POST /auth/refresh`

### 4. User Model Extensions

```javascript
{
  oauthProviders: [{
    provider: 'google' | 'github',
    providerId: String,
    accessToken: String,
    refreshToken: String
  }],
  role: 'ADMIN' | 'MAINTAINER' | 'CONTRIBUTOR' | 'USER',
  organizations: [{
    organization: ObjectId,
    role: 'owner' | 'admin' | 'member'
  }],
  teams: [{
    team: ObjectId,
    role: 'maintainer' | 'member'
  }]
}
```

## Role-Based Access Control (RBAC)

### Role Hierarchy
```
ADMIN
  └── MAINTAINER
      └── CONTRIBUTOR
          └── USER
```

Each role can perform actions of lower roles:
- **ADMIN**: Full system access, user management
- **MAINTAINER**: Create/manage repositories, approve PRs
- **CONTRIBUTOR**: Push code, create issues/PRs
- **USER**: Read repositories, create issues

### RBAC Middleware

#### 1. Token Authentication
**Middleware**: `authenticateToken`
- Verifies JWT token validity
- Extracts user information
- Attaches to request object

```javascript
// In routes:
router.get('/protected', authenticateToken, (req, res) => {
  // req.user available
});
```

#### 2. Role Authorization
**Middleware**: `authorizeRoles(...allowedRoles)`
- Checks if user has required role
- Considers role hierarchy

```javascript
// Only ADMIN and MAINTAINER can access
router.post('/admin-endpoint', 
  authenticateToken, 
  authorizeRoles('ADMIN', 'MAINTAINER'),
  (req, res) => { }
);
```

#### 3. Repository Permissions
**Middleware**: `checkRepoPermission(requiredPermission)`
- Checks user access to specific repository
- Validates collaborator permissions

**Permission Levels**:
- **ADMIN**: Full access
- **PUSH**: Read + Write + Delete
- **PULL**: Read + Create PRs
- **READ**: Read-only access

```javascript
router.put('/repos/:repoId', 
  authenticateToken,
  checkRepoPermission('PUSH'),
  (req, res) => { }
);
```

#### 4. Organization Permissions
**Middleware**: `checkOrgPermission(requiredRole)`
- Checks user access to specific organization
- Validates member roles

**Roles**:
- **OWNER**: Full organization control
- **ADMIN**: Manage members and settings
- **MEMBER**: Standard member access

```javascript
router.post('/orgs/:orgId/teams',
  authenticateToken,
  checkOrgPermission('ADMIN'),
  (req, res) => { }
);
```

#### 5. Owner Check
**Middleware**: `isOwner`
- Ensures user can only access their own resources
- Admins bypass this check

```javascript
router.get('/users/:userId/profile',
  authenticateToken,
  isOwner,
  (req, res) => { }
);
```

### Rate Limiting by Role

Different rate limits based on user role:

```javascript
{
  ADMIN: { windowMs: 15min, maxRequests: 1000 },
  MAINTAINER: { windowMs: 15min, maxRequests: 500 },
  CONTRIBUTOR: { windowMs: 15min, maxRequests: 300 },
  USER: { windowMs: 15min, maxRequests: 100 }
}
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/common-api/login` | No | Local login |
| GET | `/auth/google` | No | Google OAuth |
| GET | `/auth/google/callback` | No | Google callback |
| GET | `/auth/github` | No | GitHub OAuth |
| GET | `/auth/github/callback` | No | GitHub callback |
| POST | `/auth/refresh` | No | Refresh access token |
| GET | `/auth/profile` | Yes | Get user profile |
| POST | `/auth/logout` | Yes | Logout |

### Request Examples

#### Login
```bash
curl -X POST http://localhost:5000/common-api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com", "password":"password123"}'
```

#### Refresh Token
```bash
curl -X POST http://localhost:5000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"eyJhbGc..."}'
```

#### Protected Request
```bash
curl -X GET http://localhost:5000/auth/profile \
  -H "Authorization: Bearer eyJhbGc..."
```

## Environment Configuration

### Required Environment Variables

```env
# OAuth (Google)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# OAuth (GitHub)
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-refresh-token-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Session
SESSION_SECRET=your-session-secret

# Frontend
FRONTEND_URL=http://localhost:5173
```

## Security Considerations

### 1. Token Security
- Tokens stored in httpOnly cookies on client
- CSRF protection enabled
- Short expiration times
- Refresh token rotation

### 2. Password Security
- Minimum 8 characters (recommended 12+)
- bcrypt hashing with 12 rounds
- Rate limiting on login attempts
- Account lockout after failed attempts

### 3. OAuth Security
- State parameter validation
- Redirect URI whitelisting
- HTTPS required in production
- Scope limiting

### 4. Session Security
- Secure cookie flags
- HttpOnly attribute enabled
- SameSite cookie policy
- Session timeout (24 hours)

## Error Handling

### Common Error Responses

```javascript
// 401 Unauthorized
{
  message: "Authorization token is required",
  error: "MISSING_TOKEN"
}

// 403 Forbidden
{
  message: "Access denied: Insufficient permissions",
  requiredRoles: ["ADMIN", "MAINTAINER"],
  userRole: "USER"
}

// 404 Not Found
{
  message: "User not found"
}

// 500 Internal Server Error
{
  message: "Permission check failed",
  error: "Database connection error"
}
```

## Best Practices

1. **Token Management**
   - Always use HTTPS in production
   - Store tokens securely
   - Implement token refresh logic
   - Clear tokens on logout

2. **Permission Checking**
   - Check permissions on every request
   - Use middleware for repeated checks
   - Log permission denials
   - Audit sensitive operations

3. **User Management**
   - Implement account lockout
   - Track login history
   - Require password changes periodically
   - Validate email addresses

4. **OAuth Flow**
   - Validate state parameter
   - Handle token expiration
   - Implement error handling
   - Log OAuth events

## Testing

### Test Local Authentication
```bash
npm test -- authService.test.js
```

### Test RBAC
```bash
npm test -- rbac.test.js
```

### Test OAuth
```bash
npm test -- oauthService.test.js
```

## Troubleshooting

### Issue: Token validation fails
- Check JWT_SECRET environment variable
- Verify token expiration
- Ensure token format is correct

### Issue: OAuth callback fails
- Verify callback URL matches OAuth app settings
- Check CLIENT_ID and CLIENT_SECRET
- Ensure FRONTEND_URL is correct

### Issue: Permission denied
- Verify user role
- Check repository/organization permissions
- Validate user email in database

## References

- [Passport.js Documentation](http://www.passportjs.org/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OAuth 2.0 Security](https://tools.ietf.org/html/rfc6749)
- [Express.js Middleware](https://expressjs.com/en/guide/using-middleware.html)