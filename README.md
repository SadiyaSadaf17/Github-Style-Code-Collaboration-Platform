# GitHub Clone - Code Collaboration Platform

A production-ready, enterprise-grade code collaboration platform built with the MERN stack, featuring real-time collaboration, Git integration, cloud storage, and comprehensive DevOps tooling.

## 🚀 Features

### Core Features
- **User Authentication**: JWT-based auth with OAuth (Google/GitHub)
- **Repository Management**: Create, fork, and manage Git repositories
- **Real-time Collaboration**: Live code editing with Socket.io
- **Git Operations**: Full Git functionality (commit, branch, merge, pull requests)
- **File Management**: Cloud storage with AWS S3
- **Issue Tracking**: Create and manage issues with labels and milestones
- **Pull Requests**: Code review workflow with comments and approvals
- **Notifications**: Real-time notifications via email and in-app
- **User Profiles**: Comprehensive user profiles with contribution stats

### Enterprise Features
- **Role-Based Access Control (RBAC)**: Granular permissions system
- **Organizations & Teams**: Multi-tenant architecture
- **Advanced Search**: Full-text search across code, issues, and users
- **API Rate Limiting**: Protection against abuse
- **Audit Logging**: Comprehensive activity tracking
- **Docker Deployment**: Containerized production deployment
- **Monitoring & Health Checks**: System monitoring and alerting

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time features
- **JWT** for authentication
- **AWS S3** for file storage
- **Redis** for caching (optional)
- **Nodemailer** for email notifications

### Frontend
- **React 18** with Vite
- **Zustand** for state management
- **Monaco Editor** for code editing
- **Socket.io Client** for real-time updates
- **Tailwind CSS** for styling
- **React Router** for navigation

### DevOps
- **Docker** & Docker Compose
- **Nginx** reverse proxy
- **PM2** process manager
- **GitHub Actions** CI/CD

## 📋 Prerequisites

- Node.js 18+
- MongoDB 6+
- Redis (optional, for caching)
- AWS account (for S3 storage)
- Docker & Docker Compose

## 🚀 Quick Start

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/github-clone.git
   cd github-clone
   ```

2. **Backend Setup**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   npm install
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your configuration
   npm install
   npm run dev
   ```

4. **Database Setup**
   ```bash
   # Make sure MongoDB is running
   mongosh
   use github-clone
   ```

### Production Deployment

1. **Using Docker Compose**
   ```bash
   # Copy environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   cp docker-compose.yml .env

   # Edit environment variables
   # Then run:
   docker-compose up -d
   ```

2. **Manual Deployment**
   ```bash
   # Backend
   cd backend
   npm ci --production
   npm start

   # Frontend
   cd frontend
   npm run build
   # Serve dist/ with nginx
   ```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DB_URL=mongodb://localhost:27017/github-clone

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-refresh-token-secret-here

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=github-clone-files

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=GitHub Clone
```

## 📁 Project Structure

```
├── backend/
│   ├── APIs/           # Route handlers
│   ├── middlewares/    # Express middlewares
│   ├── models/         # MongoDB schemas
│   ├── services/       # Business logic services
│   ├── server.js       # Main server file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── contexts/   # React contexts
│   │   ├── store/      # Zustand stores
│   │   └── styles/     # Global styles
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 🔐 Authentication

The platform supports multiple authentication methods:

- **Local Authentication**: Email/password with bcrypt hashing
- **OAuth Integration**: Google and GitHub OAuth
- **JWT Tokens**: Access and refresh token system
- **Role-Based Access**: Admin, maintainer, contributor roles

## 🌐 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/oauth/google` - Google OAuth
- `POST /api/auth/oauth/github` - GitHub OAuth

### Repository Endpoints
- `GET /api/repos` - List repositories
- `POST /api/repos` - Create repository
- `GET /api/repos/:id` - Get repository details
- `PUT /api/repos/:id` - Update repository

### Real-time Events
- `repo:join` - Join repository room
- `file:update` - File content update
- `cursor:move` - Cursor position update
- `user:join` - User joined repository

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 📊 Monitoring

- **Health Checks**: `/health` endpoint
- **Metrics**: Prometheus metrics endpoint
- **Logging**: Winston logging with multiple transports
- **Error Tracking**: Sentry integration

## 🚀 Deployment

### Docker Deployment
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Deployment
- **AWS**: ECS, EKS, or Elastic Beanstalk
- **GCP**: Cloud Run or GKE
- **Azure**: Container Instances or AKS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by GitHub's collaboration features
- Built with modern web technologies
- Community-driven development

## 📞 Support

For support, email support@github-clone.com or join our Discord community.

---

**Note**: This is a comprehensive code collaboration platform. For production use, ensure proper security configurations and monitoring setup.