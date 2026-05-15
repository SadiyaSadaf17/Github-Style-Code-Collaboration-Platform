# Implementation Guide

## Project Overview

This is a production-ready GitHub-style code collaboration platform built with the MERN stack. It includes enterprise features like OAuth authentication, RBAC, real-time collaboration, Git integration, and cloud storage.

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6+
- Redis (optional)
- AWS account (for S3)

### Development Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone <repo-url>
   cd github-clone
   
   # Backend
   cd Backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

2. **Configure Environment Variables**
   
   **Backend** (`Backend/.env`):
   ```env
   DB_URL=mongodb://localhost:27017/github-clone
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_REFRESH_SECRET=your-refresh-token-secret-here
   GOOGLE_CLIENT_ID=<google-client-id>
   GOOGLE_CLIENT_SECRET=<google-client-secret>
   GITHUB_CLIENT_ID=<github-client-id>
   GITHUB_CLIENT_SECRET=<github-client-secret>
   AWS_ACCESS_KEY_ID=<aws-access-key>
   AWS_SECRET_ACCESS_KEY=<aws-secret-key>
   AWS_S3_BUCKET=github-clone-files
   FRONTEND_URL=http://localhost:5173
   ```
   
   **Frontend** (`frontend/.env`):
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_GOOGLE_CLIENT_ID=<google-client-id>
   VITE_GITHUB_CLIENT_ID=<github-client-id>
   ```

3. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd Backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000

## Architecture

### Backend Structure

```
Backend/
├── APIs/                 # Route handlers
│   ├── userAPI.js       # User management
│   ├── oauthAPI.js      # OAuth endpoints
│   ├── organizationAPI.js # Organization management
│   ├── repoAPI.js       # Repository operations
│   ├── commitAPI.js     # Commit management
│   ├── pullAPI.js       # Pull requests
│   ├── issueAPI.js      # Issue tracking
│   └── ...
├── models/              # MongoDB schemas
│   ├── userModel.js     # User schema with OAuth support
│   ├── repoModel.js     # Repository schema
│   ├── organizationModel.js # Organization schema
│   └── ...
├── middlewares/         # Express middleware
│   ├── rbac.js          # Role-based access control
│   ├── verifyToken.js   # Token verification
│   └── ...
├── services/            # Business logic
│   ├── oauthService.js  # Passport configuration
│   ├── authService.js   # Authentication logic
│   ├── gitService.js    # Git operations
│   ├── fileService.js   # AWS S3 integration
│   └── ...
└── server.js            # Main server file

```

### Frontend Structure

```
frontend/
├── src/
│   ├── components/      # React components
│   │   ├── Dashboard.jsx
│   │   ├── RepoExplorer.jsx
│   │   ├── FileViewer.jsx
│   │   └── ...
│   ├── contexts/        # React contexts
│   │   ├── SocketContext.js # WebSocket context
│   │   └── ...
│   ├── store/           # Zustand stores
│   │   └── authStore.js # Auth state
│   ├── styles/          # Global styles
│   └── App.jsx          # Root component
└── vite.config.js       # Vite configuration
```

## Database Models

### User Model
```javascript
{
  username: String,           // Unique username
  email: String,              // Unique email
  password: String,           // Hashed password
  name: String,               // Full name
  avatar: String,             // S3 URL
  role: 'ADMIN'|'MAINTAINER'|'CONTRIBUTOR'|'USER',
  oauthProviders: [{          // OAuth integration
    provider: 'google'|'github',
    providerId: String,
    accessToken: String,
    refreshToken: String
  }],
  organizations: [{           // User's organizations
    organization: ObjectId,
    role: 'owner'|'admin'|'member'
  }],
  teams: [{                   // User's teams
    team: ObjectId,
    role: 'maintainer'|'member'
  }],
  contributionStats: {        // Activity tracking
    commits: Number,
    pullRequests: Number,
    issues: Number,
    repositories: Number
  },
  preferences: {              // User preferences
    theme: 'light'|'dark'|'auto',
    notifications: {
      email: Boolean,
      push: Boolean,
      marketing: Boolean
    }
  }
}
```

### Repository Model
```javascript
{
  name: String,               // Repository name
  owner: ObjectId,            // Owner reference
  description: String,        // Repository description
  isPrivate: Boolean,         // Visibility
  defaultBranch: String,      // Main branch
  collaborators: [{           // Team members
    user: ObjectId,
    permission: 'ADMIN'|'PUSH'|'PULL'|'READ'
  }],
  branches: [{                // Branch info
    name: String,
    sha: String,              // Latest commit
    protected: Boolean
  }],
  stats: {
    watchers: Number,
    stars: Number,
    forks: Number
  }
}
```

## Authentication Flow

### OAuth Flow (Google/GitHub)
```
1. User clicks "Login with Google"
2. Frontend redirects to /auth/google
3. Backend redirects to Google OAuth
4. User grants permissions
5. Google redirects to /auth/google/callback
6. Backend fetches user profile
7. Create/update user in database
8. Generate JWT tokens
9. Redirect to frontend with tokens
10. Frontend stores tokens and redirects to dashboard
```

### JWT Token Flow
```
1. User login/OAuth success
2. Backend generates access token (15 min)
3. Backend generates refresh token (7 days)
4. Frontend stores both tokens
5. Frontend includes access token in API requests
6. Backend validates token on each request
7. If access token expires, use refresh token
8. Backend generates new access token
9. Frontend updates stored token
```

## Authorization Levels

### Role Hierarchy
```
ADMIN (System admin)
├── Manage all users
├── Manage all organizations
├── Delete any repository
└── Access all features

MAINTAINER
├── Create repositories
├── Manage teams
├── Approve pull requests
└── Manage issues

CONTRIBUTOR
├── Create pull requests
├── Create issues
├── Push code
└── Read repositories

USER (Default)
├── Read public repositories
├── Create issues
├── Comment
└── View profiles
```

### Repository Permissions
```
ADMIN: Full access
PUSH: Read + Write + Delete
PULL: Read + Create PRs
READ: Read-only
```

## Real-Time Features

### Socket.io Events

**Client Events**:
- `join-repo` - Join repository room
- `leave-repo` - Leave repository room
- `file:edit:start` - Start editing
- `file:edit:update` - Update file content
- `file:edit:end` - Finish editing

**Server Events**:
- `connection` - User connected
- `file:edit:start` - User started editing
- `file:edit:update` - File updated
- `notification:new` - New notification

### Example: Real-Time Collaboration
```javascript
// Frontend
socket.emit('join-repo', { repoId });
socket.emit('file:edit:update', { 
  repoId, 
  filePath, 
  content 
});

// Backend
socket.on('file:edit:update', (data) => {
  socket.to(`repo:${data.repoId}`).emit('file:edit:update', data);
});
```

## API Usage Examples

### Authentication
```bash
# Login
curl -X POST http://localhost:5000/common-api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# Response
{
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### Organization Management
```bash
# Create organization
curl -X POST http://localhost:5000/org-api/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Org","login":"my-org"}'

# Add member
curl -X POST http://localhost:5000/org-api/orgId/members \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"userId":"userId","role":"MEMBER"}'
```

## Deployment

### Docker Deployment
```bash
# Build images
docker-compose build

# Run containers
docker-compose up -d

# View logs
docker-compose logs -f api
```

### Environment Setup for Production
```env
NODE_ENV=production
DB_URL=mongodb+srv://user:pass@cluster.mongodb.net/github-clone
JWT_SECRET=<long-random-string>
FRONTEND_URL=https://yourdomain.com
SSL_CERT=/path/to/cert.pem
SSL_KEY=/path/to/key.pem
```

### Database Migrations
```bash
# Initialize database indexes
npm run db:init

# Migrate data
npm run db:migrate

# Backup database
mongodump --uri="mongodb://..." --out ./backup
```

## Monitoring

### Health Check
```bash
curl http://localhost:5000/health
# Response: { "status": "OK", "timestamp": "..." }
```

### Logs
```bash
# View backend logs
tail -f Backend/logs/app.log

# View specific errors
grep "ERROR" Backend/logs/app.log
```

### Metrics
- API response times
- Database connection pool
- Memory usage
- CPU utilization
- Request rates

## Security Best Practices

1. **Environment Variables**
   - Never commit .env files
   - Use strong secrets
   - Rotate tokens regularly

2. **Database**
   - Enable authentication
   - Use encrypted connections
   - Regular backups
   - Access control

3. **API Security**
   - HTTPS only in production
   - Rate limiting
   - Input validation
   - Output encoding

4. **Authentication**
   - Secure password hashing
   - Token expiration
   - Refresh token rotation
   - Session management

## Testing

### Backend Tests
```bash
cd Backend
npm test
npm test -- --watch
npm test -- --coverage
```

### Frontend Tests
```bash
cd frontend
npm test
npm test -- --watch
```

### E2E Tests
```bash
npm run test:e2e
```

## Troubleshooting

### Database Connection Issues
```bash
# Check MongoDB is running
mongosh
# Check connection string in .env
```

### Token Validation Errors
```
Error: Invalid token
Solution: Check JWT_SECRET matches between request/response
```

### OAuth Callback Fails
```
Solution: Verify callback URLs in OAuth app settings
```

### File Upload Issues
```bash
# Check AWS credentials
# Verify S3 bucket exists
# Check bucket permissions
```

## Performance Optimization

1. **Caching**
   - Redis for session caching
   - API response caching
   - Database query caching

2. **Database**
   - Index frequently queried fields
   - Use aggregation pipelines
   - Implement pagination

3. **Frontend**
   - Code splitting
   - Lazy loading
   - Image optimization
   - Compression

4. **Backend**
   - Connection pooling
   - Request compression
   - CDN for static files
   - Load balancing

## Contributing Guidelines

1. Fork repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## Support

For issues and questions:
- GitHub Issues: [repo-url]/issues
- Email: support@github-clone.com
- Discord: [community-link]

## License

MIT License - See LICENSE file for details