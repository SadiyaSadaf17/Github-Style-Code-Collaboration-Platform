import exp from "express";
import { config } from "dotenv";
import { connect } from "mongoose";
import { userRoute } from "./APIs/userAPI.js";
import { commonRouter } from "./APIs/commonAPI.js";
import { fileRoute } from "./APIs/fileRoute.js";
import { repoRoute } from "./APIs/repoAPI.js";
import { commitRoute } from "./APIs/commitAPI.js";
import { pullRoute } from "./APIs/pullAPI.js";
import { issueRoute } from "./APIs/issueAPI.js";
import {commentRoute} from "./APIs/commentAPI.js";
import { notificationRoute } from "./APIs/notificationAPI.js";
import oauthRouter from "./APIs/oauthAPI.js";
import { organizationRouter } from "./APIs/organizationAPI.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from 'express-session';
import { createServer } from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import passport from "./services/oauthService.js";
import "express-async-errors";

config(); //process.env

//Create express application
const app = exp();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

//use cors middleware (dynamic origin for local dev)
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));

//add body parser middleware
app.use(exp.json({ limit: '10mb' }));
app.use(exp.urlencoded({ extended: true, limit: '10mb' }));
//add cookie parser middleware
app.use(cookieParser());

// Session configuration for Passport
app.use(session({
  secret: process.env.JWT_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

//connect APIs
app.use("/user-api", userRoute);
app.use("/common-api", commonRouter);
app.use("/auth", oauthRouter);
app.use("/org-api", organizationRouter);
app.use("/repo-api",repoRoute);
app.use("/file-api",fileRoute);
app.use("/commit-api",commitRoute);
app.use("/pull-api",pullRoute);
app.use("/issue-api",issueRoute);
app.use("/comment-api",commentRoute);
app.use("/notification-api",notificationRoute);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true
  },
  maxHttpBufferSize: 1e8 // 100MB for large file transfers
});

// Make io globally available for services
global.io = io;

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user room for notifications
  socket.on('join-user', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`User ${socket.id} joined user room ${userId}`);
  });

  // Leave user room
  socket.on('leave-user', (userId) => {
    socket.leave(`user:${userId}`);
    console.log(`User ${socket.id} left user room ${userId}`);
  });

  // Join repository room
  socket.on('join-repo', (repoId) => {
    socket.join(`repo:${repoId}`);
    console.log(`User ${socket.id} joined repo ${repoId}`);
  });

  // Leave repository room
  socket.on('leave-repo', (repoId) => {
    socket.leave(`repo:${repoId}`);
    console.log(`User ${socket.id} left repo ${repoId}`);
  });

  // File editing events
  socket.on('file:edit:start', (data) => {
    socket.to(`repo:${data.repoId}`).emit('file:edit:start', {
      ...data,
      userId: socket.id
    });
  });

  socket.on('file:edit:update', (data) => {
    socket.to(`repo:${data.repoId}`).emit('file:edit:update', {
      ...data,
      userId: socket.id,
      socketId: socket.id,
    });
  });

  socket.on('file:edit:end', (data) => {
    socket.to(`repo:${data.repoId}`).emit('file:edit:end', {
      ...data,
      userId: socket.id
    });
  });

  // Comment events
  socket.on('comment:create', (data) => {
    socket.to(`repo:${data.repoId}`).emit('comment:create', data);
  });

  socket.on('comment:update', (data) => {
    socket.to(`repo:${data.repoId}`).emit('comment:update', data);
  });

  // Presence events
  socket.on('presence:join', (data) => {
    socket.to(`repo:${data.repoId}`).emit('presence:join', {
      ...data,
      socketId: socket.id
    });
  });

  socket.on('presence:leave', (data) => {
    socket.to(`repo:${data.repoId}`).emit('presence:leave', {
      ...data,
      socketId: socket.id
    });
  });

  // Typing indicators
  socket.on('typing:start', (data) => {
    socket.to(`repo:${data.repoId}`).emit('typing:start', {
      ...data,
      socketId: socket.id
    });
  });

  socket.on('typing:stop', (data) => {
    socket.to(`repo:${data.repoId}`).emit('typing:stop', {
      ...data,
      socketId: socket.id
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const connnectDB=async()=>{
    try{
        await connect(process.env.DB_URL);
        console.log("DB connection success");
    }
    catch (err) {
    console.log("Err in DB connection", err);
  }
}

connnectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT,()=>{
    console.log(`server started on port ${PORT}`)
})


//dealing with invalid path
app.use((req, res, next) => {
  console.log(req.url);
  res.json({ message: `${req.url} is invalid path` });
});

//error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  let message = err.message || "Unexpected error";
  let details;

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    message = "Validation error";
    details = Object.values(err.errors || {}).map((e) => e.message);
  }

  // Mongoose cast errors (e.g. invalid ObjectId)
  if (err.name === "CastError") {
    message = "Invalid value for field";
    details = [`${err.path} is invalid`];
  }

  // Duplicate key errors
  if (err.code === 11000) {
    message = "Duplicate value";
    const fields = Object.keys(err.keyValue || {});
    details = fields.length ? fields.map((f) => `${f} already exists`) : undefined;
  }

  // Strict mode "throw" errors from schema
  if (err.name === "StrictModeError") {
    message = "Invalid fields provided";
    details = err.path ? [`${err.path} is not allowed`] : undefined;
  }

  // Default to 400 for known client errors without explicit status
  const finalStatus = status === 500 && (err.name || err.code) ? 400 : status;

  const response = {
    message,
    status: finalStatus,
  };

  if (details) response.details = details;
  if (!isProduction) {
    response.stack = err.stack;
  }

  console.log("err :", err);
  res.status(finalStatus).json(response);
});