const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const app = express();
const server = http.createServer(app);

// --- Configuration ---
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// --- Security and Middleware ---
app.use(helmet());
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// --- Socket.IO Setup with Redis Adapter for Scalability ---
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

const pubClient = createClient({ url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}` });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  console.log('Connected to Redis and using Redis adapter.');
}).catch((err) => {
    console.error('Could not connect to Redis:', err);
});

// --- API Routes ---
app.get('/', (req, res) => {
  res.send({ status: 'ok', message: 'Signaling server is running.' });
});

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('join-room', (roomId, userId) => {
    console.log(`[Socket.IO] User ${userId} is joining room ${roomId}`);
    socket.join(roomId);
    // Notify other users in the room that a new user has joined
    socket.to(roomId).emit('user-joined', userId);
  });

  socket.on('signal', ({ room, type, sdp, candidate }) => {
    // Forward the signal to other users in the same room
    // The signal can be an offer, answer, or ICE candidate
    console.log(`[Socket.IO] Relaying signal of type '${type}' to room ${room}`);
    socket.to(room).emit('signal', { type, sdp, candidate, from: socket.id });
  });

  socket.on('disconnecting', () => {
    // When a user disconnects, notify others in the rooms they were in
    socket.rooms.forEach(roomId => {
      if (roomId !== socket.id) {
        console.log(`[Socket.IO] User ${socket.id} is leaving room ${roomId}`);
        socket.to(roomId).emit('user-left', socket.id);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// --- Server Startup ---
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});