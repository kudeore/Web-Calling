import React, { useEffect } from 'react';
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to backend:", socket.id);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return <div>Zoom Clone Frontend Running</div>
}

export default App;
