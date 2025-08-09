const express = require('express');
const http = require('http');
const path = require('path'); // Path module is essential for this
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
// WARNING: This will not work if you scale to more than one server instance.
const rooms = {};


// =============================================================================
// CORRECTED PATH: Serve static files from the React app's build folder
// It looks for a 'client/build' directory relative to this file's location.
// =============================================================================
app.use(express.static(path.join(__dirname, 'client/build')));


io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    // Get the list of users already in the room, if any.
    const otherUsers = rooms[roomId] || [];

    // Add the new user to the room's list.
    rooms[roomId] = [...otherUsers, socket.id];
    socket.join(roomId);

    // Send the list of existing users back to the new user.
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

  // This event is for when a peer sends their signal back to the caller.
  socket.on('returning signal', (payload) => {
    io.to(payload.callerID).emit('receiving returned signal', {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    let roomID;
    // Find the room the user was in.
    for (const id in rooms) {
      if (rooms[id].includes(socket.id)) {
        roomID = id;
        break;
      }
    }

    // If they were in a room, remove them and notify other users.
    if (roomID) {
      rooms[roomID] = rooms[roomID].filter((id) => id !== socket.id);
      socket.to(roomID).emit('user-left', socket.id);
    }
  });
});


// =============================================================================
// CORRECTED PATH: The "catchall" handler.
// For any request that doesn't match a file in 'client/build' or an API route,
// send back React's index.html file. This is crucial for single-page apps.
// =============================================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Signaling and Web server running on port ${PORT}`));