// --- Core imports ---
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");

// --- App setup ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(cors({
  origin: "https://pluggstugan.netlify.app", // your Netlify frontend
  methods: ["GET", "POST", "DELETE"],
  credentials: true
}));

// --- Create HTTP + Socket.IO server ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://pluggstugan.netlify.app",
    methods: ["GET", "POST", "DELETE"],
    credentials: true
  }
});


app.use(express.json());
app.use(express.static(path.join(__dirname, "")));

let users = [];
let chatrooms = {
  general: { name: "general", messages: [] } // default room
};

// --- Track logged-in users ---
let loggedInUsers = new Set();

// --- User Registration ---
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (users.find((u) => u.username === username)) return res.status(400).send("Exists");
  users.push({ username, password });
  res.status(200).send("OK");
});

// --- Login ---
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const found = users.find((u) => u.username === username && u.password === password);
  if (!found) return res.status(401).send("Invalid");

  if (loggedInUsers.has(username)) {
    return res.status(403).send("Already logged in"); // block second login
  }

  loggedInUsers.add(username); // mark as logged in
  res.status(200).send("OK");
});

// --- Logout ---
app.post("/logout", (req, res) => {
  const { username } = req.body;
  loggedInUsers.delete(username);
  res.status(200).send("Logged out");
});

// --- Create Chatroom ---
app.post("/chatroom", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).send("Missing name");
  if (chatrooms[name]) return res.status(400).send("Exists");
  chatrooms[name] = { name, messages: [] };

  io.emit("chatroomsUpdated"); // notify all clients
  res.status(200).send("OK");
});

// --- Delete Chatroom ---
app.delete("/chatroom/:name", (req, res) => {
  const roomName = req.params.name;
  if (chatrooms[roomName]) {
    delete chatrooms[roomName];
    io.emit("chatroomsUpdated"); // notify all clients
    return res.status(200).send({ message: "Room deleted" });
  }
  res.status(404).send({ message: "Room not found" });
});


// --- Get All Chatrooms ---
app.get("/chatrooms", (req, res) => {
  res.json(Object.keys(chatrooms));
});

// --- Get Messages for a Room ---
app.get("/messages/:room", (req, res) => {
  const room = req.params.room;
  if (!chatrooms[room]) return res.status(404).send("Room not found");
  res.json(chatrooms[room].messages);
});

// --- Get All Registered Users ---
app.get("/users", (req, res) => {
  res.json(users.map(u => u.username));
});

// ✅ --- SOCKET.IO REALTIME CHAT HANDLING ---
let userSockets = {}; // username → socket.id
let userRooms = {};   // username → current room

io.on("connection", (socket) => {
  console.log("✅ User connected");

  // --- Join room ---
  socket.on("joinRoom", ({ room, user }) => {
    socket.join(room);
    userSockets[user] = socket.id;
    userRooms[user] = room;

    console.log(`🔵 ${user} joined ${room}`);
    io.to(room).emit("userJoined", { user });
    io.emit("updateOnlineUsers", getOnlineStatus());
  });

  // --- Leave room ---
  socket.on("leaveRoom", ({ room, user }) => {
    socket.leave(room);
    delete userRooms[user];
    io.to(room).emit("userLeft", { user });
    io.emit("updateOnlineUsers", getOnlineStatus());
  });

  // --- Chat messages ---
  socket.on("chatMessage", ({ room, user, message }) => {
    if (!room || !user || !message) return;
    const msg = { user, message };
    if (!chatrooms[room]) chatrooms[room] = { name: room, messages: [] };
    chatrooms[room].messages.push(msg);

    io.to(room).emit("chatMessage", msg);
  });

  // --- Disconnect ---
  socket.on("disconnect", () => {
    const user = Object.keys(userSockets).find((u) => userSockets[u] === socket.id);
    if (user) {
      console.log(`❌ ${user} disconnected`);
      delete userSockets[user];
      delete userRooms[user];
      loggedInUsers.delete(user); // remove from loggedInUsers
      io.emit("updateOnlineUsers", getOnlineStatus());
    }
  });
});

// --- Helper for online users ---
function getOnlineStatus() {
  return Object.keys(userSockets).map((u) => ({
    user: u,
    online: true,
    room: userRooms[u] || null,
  }));
}

// --- Start server ---
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
