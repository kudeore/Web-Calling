const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // Allows connections from any origin
    methods: ['GET', 'POST'],
  },
});

// Healthcheck route for Google Cloud Run
app.get('/', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// A simple JavaScript object to store room data in memory.
const rooms = {};

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    const otherUsers = rooms[roomId] || [];
    rooms[roomId] = [...otherUsers, socket.id];
    socket.join(roomId);

    socket.emit('all-users', otherUsers);
    console.log(`User ${socket.id} joined room ${roomId}.`);
  });

  socket.on('sending signal', (payload) => {
    io.to(payload.userToSignal).emit('user joined', {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  socket.on('returning signal', (payload) => {
    io.to(payload.callerID).emit('receiving returned signal', {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    let roomID;
    for (const id in rooms) {
      if (rooms[id].includes(socket.id)) {
        roomID = id;
        break;
      }
    }
    if (roomID) {
      rooms[roomID] = rooms[roomID].filter((id) => id !== socket.id);
      socket.to(roomID).emit('user-left', socket.id);
    }
  });
});

// Google Cloud Run provides the PORT environment variable.
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Signaling server running on port ${PORT}`));