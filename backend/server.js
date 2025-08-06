const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// For development, allowing any origin is fine.
// For production, you would restrict this to your domain.
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// A simple in-memory object to store room data.
// For a production app, this would be replaced by a distributed store like Redis.
const rooms = {};

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    // Get the list of users already in the room, if any.
    const otherUsers = rooms[roomId] || [];

    // Add the new user to the room's list.
    rooms[roomId] = [...otherUsers, socket.id];
    socket.join(roomId);

    // ** CRITICAL FOR MULTI-USER **
    // Send the list of existing users back to the new user.
    // This tells them who they need to create peer connections with.
    socket.emit('all-users', otherUsers);

    console.log(`User ${socket.id} joined room ${roomId}.`);
    console.log(`Current users in room ${roomId}:`, rooms[roomId]);
  });

  // This event is for when a user initiates a connection to another user.
  socket.on('sending signal', (payload) => {
    io.to(payload.userToSignal).emit('user joined', {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  // This event is for when a peer, having received an initial signal,
  // sends their own signal back to the original caller to complete the handshake.
  socket.on('returning signal', (payload) => {
    io.to(payload.callerID).emit('receiving returned signal', {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    let roomID;
    // Find the room the user was in by iterating through the rooms object.
    for (const id in rooms) {
      if (rooms[id].includes(socket.id)) {
        roomID = id;
        break;
      }
    }

    // If they were in a room, remove them from the list and notify other users.
    if (roomID) {
      rooms[roomID] = rooms[roomID].filter((id) => id !== socket.id);
      socket.to(roomID).emit('user-left', socket.id);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Signaling server running on port ${PORT}`));