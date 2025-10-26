const socket = io();

let username = "";

// DOM elements
const usernameBox = document.getElementById("username-box");
const joinBtn = document.getElementById("join-btn");
const usernameInput = document.getElementById("username");
const chatArea = document.getElementById("chat-area");
const form = document.getElementById("chat-form");
const input = document.getElementById("message");
const chatBox = document.getElementById("chat-box");

// User joins chat
joinBtn.addEventListener("click", () => {
  const name = usernameInput.value.trim();
  if (name) {
    username = name;
    usernameBox.style.display = "none";
    chatArea.style.display = "block";
    socket.emit("user_joined", username);
  }
});

// Send message
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim() !== "") {
    const data = { name: username, text: input.value };
    socket.emit("chat message", data);
    input.value = "";
  }
});

// Receive message
socket.on("chat message", (data) => {
  const p = document.createElement("p");
  p.innerHTML = `<strong>${data.name}:</strong> ${data.text}`;
  chatBox.appendChild(p);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// Notify when a user joins
socket.on("user_joined", (name) => {
  const p = document.createElement("p");
  p.innerHTML = `<em>👋 ${name} joined the chat</em>`;
  chatBox.appendChild(p);
});
