import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app"; // Your Express app
import { config } from "./config"; // Your config
import { handleGameEvents } from "./socket/gameEvents"; // Your Socket.IO event handler

const server = http.createServer(app);

// Configure Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: config.clientUrl, // Allow connections from your Next.js frontend
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Pass the Socket.IO instance to your game event handler
handleGameEvents(io);

server.listen(config.port, () => {
  console.log(`Backend server listening on port ${config.port}`);
  console.log(`Accepting connections from frontend: ${config.clientUrl}`);
});
