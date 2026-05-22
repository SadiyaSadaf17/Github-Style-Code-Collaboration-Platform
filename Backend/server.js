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

import { searchRoute } from "./APIs/searchAPI.js";

import { activityRoute } from "./APIs/activityAPI.js";

import { healthRoute } from "./APIs/healthAPI.js";

import cors from "cors";

import cookieParser from "cookie-parser";

import session from 'express-session';

import { createServer } from "http";

import { Server } from "socket.io";

import helmet from "helmet";

import compression from "compression";

import passport from "./services/oauthService.js";

import { socketAuthMiddleware } from "./middlewares/socketAuth.js";

import { findRepoById, canReadRepo } from "./services/repoAccessService.js";

import { globalLimiter } from "./middlewares/rateLimiters.js";

import { requestIdMiddleware, requestLoggerMiddleware } from "./middlewares/requestLogger.js";

import { connectRedis } from "./config/redis.js";

import { startWorkers } from "./services/queueService.js";

import logger from "./utils/logger.js";

import "express-async-errors";



config();



const app = exp();

app.set("trust proxy", 1);



app.use(requestIdMiddleware);

app.use(requestLoggerMiddleware);



app.use(helmet({

  crossOriginResourcePolicy: { policy: "cross-origin" }

}));

app.use(compression());

app.use(globalLimiter);



app.use(cors({

  origin: ["http://localhost:5173", "http://localhost:5174"],

  credentials: true

}));



app.use(exp.json({ limit: '10mb' }));

app.use(exp.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());



app.use(session({

  secret: process.env.JWT_SECRET || 'your-session-secret',

  resave: false,

  saveUninitialized: false,

  cookie: {

    secure: process.env.NODE_ENV === 'production',

    httpOnly: true,

    maxAge: 1000 * 60 * 60 * 24

  }

}));



app.use(passport.initialize());

app.use(passport.session());



if (process.env.HEALTH_CHECK_ENABLED !== "false") {

  app.use("/health", healthRoute);

}



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

app.use("/search-api", searchRoute);

app.use("/activity-api", activityRoute);



app.use((req, res) => {

  res.status(404).json({ message: `${req.url} is invalid path` });

});



app.use((err, req, res, next) => {

  const status = err.status || err.statusCode || 500;

  const isProduction = process.env.NODE_ENV === "production";



  let message = err.message || "Unexpected error";

  let details;



  if (err.name === "ValidationError") {

    message = "Validation error";

    details = Object.values(err.errors || {}).map((e) => e.message);

  }



  if (err.name === "CastError") {

    message = "Invalid value for field";

    details = [`${err.path} is invalid`];

  }



  if (err.code === 11000) {

    message = "Duplicate value";

    const fields = Object.keys(err.keyValue || {});

    details = fields.length ? fields.map((f) => `${f} already exists`) : undefined;

  }



  if (err.name === "StrictModeError") {

    message = "Invalid fields provided";

    details = err.path ? [`${err.path} is not allowed`] : undefined;

  }



  const finalStatus = status === 500 && (err.name || err.code) ? 400 : status;



  const response = {

    message,

    status: finalStatus,

  };



  if (details) response.details = details;

  if (!isProduction) {

    response.stack = err.stack;

  }



  logger.error("request error", {

    requestId: req.requestId,

    message: err.message,

    status: finalStatus,

    stack: err.stack,

  });



  res.status(finalStatus).json(response);

});



const server = createServer(app);



const io = new Server(server, {

  cors: {

    origin: ["http://localhost:5173", "http://localhost:5174"],

    methods: ["GET", "POST"],

    credentials: true

  },

  maxHttpBufferSize: 1e8

});



global.io = io;



io.use(socketAuthMiddleware);



io.on('connection', (socket) => {

  logger.info('Socket connected', { socketId: socket.id, userId: socket.data.userId || 'anonymous' });



  socket.on('join-user', (userId) => {

    if (!socket.data.userId || String(socket.data.userId) !== String(userId)) {

      socket.emit('socket:error', { message: 'Unauthorized user room' });

      return;

    }

    socket.join(`user:${userId}`);

  });



  socket.on('leave-user', (userId) => {

    socket.leave(`user:${userId}`);

  });



  socket.on('join-repo', async (repoId) => {

    if (!socket.data.userId) {

      socket.emit('socket:error', { message: 'Authentication required' });

      return;

    }

    try {

      const repo = await findRepoById(repoId);

      if (!repo) {

        socket.emit('socket:error', { message: 'Repository not found' });

        return;

      }

      if (!canReadRepo(repo, socket.data.userId)) {

        socket.emit('socket:error', { message: 'Repository access denied' });

        return;

      }

      socket.join(`repo:${repoId}`);

    } catch {

      socket.emit('socket:error', { message: 'Failed to join repository' });

    }

  });



  socket.on('leave-repo', (repoId) => {

    socket.leave(`repo:${repoId}`);

  });



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



  socket.on('comment:create', (data) => {

    socket.to(`repo:${data.repoId}`).emit('comment:create', data);

  });



  socket.on('comment:update', (data) => {

    socket.to(`repo:${data.repoId}`).emit('comment:update', data);

  });



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

    logger.debug('Socket disconnected', { socketId: socket.id });

  });

});



async function bootstrap() {

  try {

    await connect(process.env.DB_URL);

    logger.info("MongoDB connected");

  } catch (err) {

    logger.error("MongoDB connection failed", { error: err.message });

  }



  await connectRedis();

  await startWorkers();



  const PORT = process.env.PORT || 5001;

  server.listen(PORT, () => {

    logger.info(`Server listening on port ${PORT}`);

  });

}



bootstrap();


