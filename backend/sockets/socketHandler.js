const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * socketHandler
 * Sets up Socket.IO real-time event handling.
 * Handles JWT authentication on socket connection,
 * and emits task-update events to all board members in real-time.
 *
 * @param {import('socket.io').Server} io - The Socket.IO server instance
 */
const socketHandler = (io) => {
  // ─── Socket.IO JWT Authentication Middleware ──────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided.'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('name email role');

      if (!user) {
        return next(new Error('Authentication error: User not found.'));
      }

      // Attach user to the socket object for later use
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token.'));
    }
  });

  // ─── Connection Handler ───────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`✅ Socket connected: ${user.name} (${user._id})`);

    // ── Join a project room ──────────────────────────────────────────────────
    // Client emits: socket.emit('join:project', projectId)
    socket.on('join:project', (projectId) => {
      socket.join(`project:${projectId}`);
      console.log(`👤 ${user.name} joined project room: project:${projectId}`);

      // Notify other members in the room
      socket.to(`project:${projectId}`).emit('user:joined', {
        userId: user._id,
        name: user.name,
        message: `${user.name} joined the board.`,
      });
    });

    // ── Leave a project room ─────────────────────────────────────────────────
    socket.on('leave:project', (projectId) => {
      socket.leave(`project:${projectId}`);
      socket.to(`project:${projectId}`).emit('user:left', {
        userId: user._id,
        name: user.name,
        message: `${user.name} left the board.`,
      });
    });

    // ── Task moved between columns ───────────────────────────────────────────
    // Client emits: socket.emit('task:moved', { projectId, taskId, fromStatus, toStatus })
    socket.on('task:moved', ({ projectId, taskId, fromStatus, toStatus }) => {
      // Broadcast to everyone ELSE in the project room (not the sender)
      socket.to(`project:${projectId}`).emit('task:updated', {
        taskId,
        fromStatus,
        toStatus,
        movedBy: { id: user._id, name: user.name },
        timestamp: new Date().toISOString(),
      });
    });

    // ── Task created ─────────────────────────────────────────────────────────
    socket.on('task:created', ({ projectId, task }) => {
      socket.to(`project:${projectId}`).emit('task:new', {
        task,
        createdBy: { id: user._id, name: user.name },
        timestamp: new Date().toISOString(),
      });
    });

    // ── Task deleted ─────────────────────────────────────────────────────────
    socket.on('task:deleted', ({ projectId, taskId }) => {
      socket.to(`project:${projectId}`).emit('task:removed', {
        taskId,
        deletedBy: { id: user._id, name: user.name },
        timestamp: new Date().toISOString(),
      });
    });

    // ── User is typing / editing a task ─────────────────────────────────────
    socket.on('task:editing', ({ projectId, taskId }) => {
      socket.to(`project:${projectId}`).emit('task:being-edited', {
        taskId,
        by: { id: user._id, name: user.name },
      });
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected: ${user.name} — Reason: ${reason}`);
    });
  });
};

module.exports = socketHandler;
