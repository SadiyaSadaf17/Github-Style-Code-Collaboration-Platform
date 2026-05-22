# Project Status Summary

**Last updated:** Phase 4 platform ops complete

## Current state

The platform is a **working MERN collaboration prototype** with GitHub-like UI. Backend and frontend core flows are integrated; advanced GitHub-parity features roll out in phases.

### Working end-to-end

- User auth (email + OAuth Google/GitHub)
- Repository CRUD, collaborators, public explore
- MongoDB-backed files, commits, issues, pull requests (diff + comments)
- Real-time notifications, PR/issue/file socket events
- Monaco collaborative editing (full-buffer sync)
- Dashboard, repo explorer, file viewer, settings, profile

### Phase 4 completed (Platform ops)

- [x] Winston structured logging + request IDs (`X-Request-Id`)
- [x] HTTP request logging middleware
- [x] Redis client with graceful fallback when `REDIS_URL` unset
- [x] Redis search result caching (`cachedGlobalSearch`)
- [x] BullMQ job queue (email, search warm, notification cleanup) — inline fallback without Redis
- [x] Audit log model + security events (login, logout, user/repo delete, PR merge)
- [x] Health endpoints: `/health`, `/health/live`, `/health/ready`, `/health/audit` (admin)
- [x] Tiered rate limits (global, auth, search)
- [x] Email sends queued when Redis/BullMQ available

**Setup:** Run `npm install` in `Backend/` (adds `bullmq`). Optional: local Redis at `REDIS_URL`.

### Phase 3 completed (Search + social)

- [x] Global search API (`/search-api?q=`) — repos, issues, PRs, users, code
- [x] Search results page with recent searches (`/search`)
- [x] Command palette + header wired to search
- [x] Follow / unfollow users
- [x] Activity feed API + recording on repo/issue/PR/commit events
- [x] Dashboard following feed + profile activity tab
- [x] Contribution heatmap on profiles

### Phase 2 completed (Explorer + editor)

- [x] Virtualized file tree, tabs, `RepoCodeWorkspace`
- [x] Context menu rename/delete, file move API
- [x] Monaco remote selections + reconnect/unsaved banners
- [x] Command palette (Ctrl+K / Ctrl+P)

### Phase 1 completed (GitHub core)

- [x] Star / watch / fork
- [x] Issue labels + open/close
- [x] PR diff review + merge with file deletions
- [x] README markdown preview

### Phase 0 completed (Stabilization)

- [x] Org API + RBAC fixes
- [x] Unified `api.js` client
- [x] Socket JWT auth + authorized rooms
- [x] Refresh token rotation + revoke on logout

## Known gaps (future)

- Organization management UI
- Real Git integration (not MongoDB file store)
- Monaco OT/CRDT (still full-buffer sync)
- Orphan `pullRequestModel.js` (active model is `pullModel.js`)
- Automated test coverage
- Horizontal socket scaling (Redis adapter for Socket.io)

## Key paths

| Area | Paths |
|------|--------|
| Server | `Backend/server.js` |
| Logging | `Backend/utils/logger.js`, `Backend/middlewares/requestLogger.js` |
| Redis / cache | `Backend/config/redis.js`, `Backend/services/cacheService.js` |
| Jobs | `Backend/services/queueService.js`, `Backend/workers/jobHandlers.js` |
| Audit | `Backend/models/auditLogModel.js`, `Backend/services/auditService.js` |
| Health | `Backend/APIs/healthAPI.js` |
| Frontend API | `frontend/src/services/api.js` |
