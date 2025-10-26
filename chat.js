const socket = io();

// --- Auth check ---
const user = localStorage.getItem("user");
if (!user) window.location.href = "index.html";

// --- Elements ---
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const usernameDisplay = document.getElementById("usernameDisplay");
usernameDisplay.textContent = user;


const userAvatar = document.getElementById("userAvatar");
if (user && user.length > 0) {
  userAvatar.textContent = user.charAt(0); // first letter
}

const chatContainer = document.getElementById("chatContainer");
const friendlistContainer = document.getElementById("friendlistContainer");
const chatroomsContainer = document.getElementById("chatroomsContainer");
const notepadContainer = document.getElementById("notepadContainer");
const profileContainer = document.getElementById("profileContainer");
const settingsContainer = document.getElementById("settingsContainer");

const profileName = document.getElementById("profileName");
const profileAge = document.getElementById("profileAge");
const profileGender = document.getElementById("profileGender");
const profileUniversity = document.getElementById("profileUniversity");
const profileAnonymous = document.getElementById("profileAnonymous");

const editName = document.getElementById("editName");
const editAge = document.getElementById("editAge");
const editGender = document.getElementById("editGender");
const editUniversity = document.getElementById("editUniversity");

const editBtn = document.getElementById("editProfileBtn");
const saveBtn = document.getElementById("saveProfileBtn");
const cancelBtn = document.getElementById("cancelProfileBtn");

const translations = {
  sv: { chatrooms: "Stugor", messages: "Meddelanden", friends: "Vänner", profile: "Min profil", create_room: "Skapa en ny stuga" },
  en: { chatrooms: "Chatrooms", messages: "Messages", friends: "Friends", profile: "My profile", create_room: "Create new room" }
};


let currentRoom = localStorage.getItem("currentRoom") || "general";
document.getElementById("currentRoomTitle").textContent = `Chatroom: ${currentRoom}`;

/* ---------- Helper Functions ---------- */
function dmRoomName(user1, user2) {
  return [user1, user2].sort().join("_");
}

function hideAllPanels() {
  chatContainer.style.display = "none";
  friendlistContainer.style.display = "none";
  chatroomsContainer.style.display = "none";
  notepadContainer.style.display = "none";
  profileContainer.style.display = "none";
  settingsContainer.style.display = "none";
}

function showProfile() {
  hideAllPanels();
  profileContainer.style.display = "block";
}

function showSettings() {
  hideAllPanels();
  settingsContainer.style.display = "block";
}

/* ---------- Chatrooms ---------- */
async function loadChatrooms() {
  try {
    const res = await fetch("/chatrooms");
    if (!res.ok) return;
    const rooms = await res.json();
    const roomList = document.getElementById("roomList");
    roomList.innerHTML = "";

    // Get user's created rooms (stored locally)
    const createdRooms = JSON.parse(localStorage.getItem("createdRooms_" + user)) || [];

    rooms.forEach(room => {
      const li = document.createElement("li");
      li.classList.add("room-item");
      li.textContent = room;
      li.dataset.room = room;
      li.style.cursor = "pointer";
      li.style.background = room === currentRoom ? "#d7e8ff" : "#f1f7fd";
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.padding = "0.5rem 1rem";
      li.style.borderRadius = "10px";
      li.style.marginBottom = "0.5rem";

      // Room click
      li.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-room-btn")) return; // avoid joining when clicking delete
        joinRoom(room);
        Array.from(roomList.children).forEach(r => r.style.background = "#f1f7fd");
        li.style.background = "#d7e8ff";
      });

      // --- DELETE button (only show if user created it) ---
      if (createdRooms.includes(room)) {
        const delBtn = document.createElement("button");
        delBtn.textContent = "❌";
        delBtn.className = "delete-room-btn";
        delBtn.style.background = "transparent";
        delBtn.style.border = "none";
        delBtn.style.cursor = "pointer";
        delBtn.style.fontSize = "1.1rem";

        delBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (!confirm(`Delete study room "${room}"?`)) return;
          try {
            const res = await fetch(`/chatroom/${room}`, { method: "DELETE" });
            if (res.ok) {
              // Remove from user's created list
              const updatedRooms = createdRooms.filter(r => r !== room);
              localStorage.setItem("createdRooms_" + user, JSON.stringify(updatedRooms));
              loadChatrooms();
            } else {
              alert("Failed to delete room.");
            }
          } catch (err) {
            console.error("Delete room error:", err);
          }
        });

        li.appendChild(delBtn);
      }

      roomList.appendChild(li);
    });
  } catch (err) {
    console.error("loadChatrooms:", err);
  }
}


/* ---------- Join Room ---------- */
function joinRoom(roomName, isDirect = false, otherUser = "") {
  if (currentRoom) socket.emit("leaveRoom", { room: currentRoom, user });

  currentRoom = roomName;
  localStorage.setItem("currentRoom", roomName);

  hideAllPanels();              // hide everything first
  chatContainer.style.display = "block";      // show chat messages
  chatroomsContainer.style.display = "block"; // optional: keep chatrooms list visible
  notepadContainer.style.display = "block";   // show notepad only now

  if (isDirect && otherUser) {
    chatBox.innerHTML = `<p class="system-message">Joined chat with ${otherUser}</p>`;
    document.getElementById("currentRoomTitle").textContent = `Chat with ${otherUser}`;
  } else {
    chatBox.innerHTML = `<p class="system-message">Joined ${roomName}</p>`;
    document.getElementById("currentRoomTitle").textContent = `Chatroom: ${roomName}`;
  }

  socket.emit("joinRoom", { room: roomName, user });
  loadMessages();
}


/* ---------- Messages ---------- */
async function loadMessages() {
  try {
    const res = await fetch(`/messages/${currentRoom}`);
    if (!res.ok) {
      chatBox.innerHTML = `<p class="system-message">No messages or failed to load.</p>`;
      return;
    }
    const messages = await res.json();
    chatBox.innerHTML = messages
      .map(m => `<div class="message"><strong>${m.user}:</strong> ${m.message || m.text}</div>`)
      .join("");
    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    console.error("Error loading messages:", err);
  }
}

function sendMessage() {
  const message = input.value.trim();
  if (!message || !currentRoom) return;
  const profile = JSON.parse(localStorage.getItem("profile_" + user)) || {};
  const displayName = profile.anonymous ? "Anonymous" : user;
  socket.emit("chatMessage", { room: currentRoom, user: displayName, message });
  input.value = "";
}

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keypress", e => { if (e.key === "Enter") sendMessage(); });

socket.on("chatMessage", data => {
  const msg = document.createElement("div");
  msg.classList.add("message");
  msg.innerHTML = `<strong>${data.user}:</strong> ${data.message}`;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on("systemMessage", msg => {
  const sys = document.createElement("div");
  sys.classList.add("system-message");
  sys.textContent = msg;
  chatBox.appendChild(sys);
  chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on("chatroomsUpdated", loadChatrooms);
socket.on("userJoined", ({ user: joinedUser }) => {
  const sys = document.createElement("div");
  sys.classList.add("system-message");
  sys.textContent = `${joinedUser} joined`;
  chatBox.appendChild(sys);
  chatBox.scrollTop = chatBox.scrollHeight;
});
socket.on("userLeft", ({ user: leftUser }) => {
  const sys = document.createElement("div");
  sys.classList.add("system-message");
  sys.textContent = `${leftUser} disconnected`;
  chatBox.appendChild(sys);
  chatBox.scrollTop = chatBox.scrollHeight;
});



// socket.on("userJoined", ({ user: joinedUser }) => {
//   if (joinedUser === user) return; // skip yourself
//   const sys = document.createElement("div");
//   sys.classList.add("system-message");
//   sys.textContent = `${joinedUser} joined`;
//   chatBox.appendChild(sys);
//   chatBox.scrollTop = chatBox.scrollHeight;
// });

// socket.on("userLeft", ({ user: leftUser }) => {
//   if (leftUser === user) return; // skip yourself
//   const sys = document.createElement("div");
//   sys.classList.add("system-message");
//   sys.textContent = `${leftUser} disconnected`;
//   chatBox.appendChild(sys);
//   chatBox.scrollTop = chatBox.scrollHeight;
// });


/* ---------- Create Chatroom ---------- */
document.getElementById("createRoomBtn").addEventListener("click", async () => {
  const name = document.getElementById("newRoomInput").value.trim();
  if (!name) return;
  try {
    const res = await fetch("/chatroom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      document.getElementById("newRoomInput").value = "";

      // Save room as user's own created room
      let createdRooms = JSON.parse(localStorage.getItem("createdRooms_" + user)) || [];
      if (!createdRooms.includes(name)) {
        createdRooms.push(name);
        localStorage.setItem("createdRooms_" + user, JSON.stringify(createdRooms));
      }

      loadChatrooms();
    } else {
      alert("Room already exists or invalid name");
    }
  } catch (err) {
    console.error("createRoom error:", err);
  }
});


/* ---------- Friendlist ---------- */
function getFriends() { return JSON.parse(localStorage.getItem("friends_" + user)) || []; }
function saveFriends(friends) { localStorage.setItem("friends_" + user, JSON.stringify(friends)); }

let onlineUsers = [];
socket.on("updateOnlineUsers", list => {
  onlineUsers = list;
  loadFriends();
  updateFriendsStudyRooms(); // ✅ add this line
});

function loadFriends() {
  const friendsOnlineList = document.getElementById("friendsOnlineList");
  const friendsOfflineList = document.getElementById("friendsOfflineList");

  const friends = getFriends();
  friendsOnlineList.innerHTML = "";
  friendsOfflineList.innerHTML = "";

  if (!friends.length) {
    friendsOfflineList.innerHTML = "<p>No friends added yet.</p>";
    return;
  }

  friends.forEach((friend, index) => {
    const info = onlineUsers.find(u => u.user === friend);
    const isOnline = !!info;
    const friendRoom = info?.room || "—";

    const li = document.createElement("li");
    li.className = "friend-item";
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.padding = "0.5rem";
    li.style.background = isOnline ? "#e8fce8" : "#f1f7fd";
    li.style.marginBottom = "0.3rem";
    li.style.borderRadius = "8px";

    li.innerHTML = `
      <div>
        <span class="friend-name" style="cursor:pointer;font-weight:600;">${friend}</span>
        <small style="margin-left:6px;color:#555;">(${isOnline ? "Online" : "Offline"})</small>
      </div>
      <div>
        <small style="color:#2c6ed5;">${isOnline ? `Room: ${friendRoom}` : ""}</small>
        <button style="background:red;color:white;border:none;padding:0.2rem 0.5rem;border-radius:6px;cursor:pointer;margin-left:8px;">Delete</button>
      </div>
    `;

    // Delete friend
    li.querySelector("button").addEventListener("click", () => {
      friends.splice(index, 1);
      saveFriends(friends);
      loadFriends();
    });

    // Direct Message
    li.querySelector(".friend-name").addEventListener("click", () => {
      const dmRoom = dmRoomName(user, friend);
      joinRoom(dmRoom, true, friend);
    });

    // Append to correct list
    if (isOnline) friendsOnlineList.appendChild(li);
    else friendsOfflineList.appendChild(li);
  });
}

function updateFriendsStudyRooms() {
  const panel = document.getElementById("friendsStudyRooms");
  panel.innerHTML = "";

  const friends = getFriends();
  const onlineFriendsInRooms = onlineUsers.filter(u => friends.includes(u.user) && u.room);

  if (onlineFriendsInRooms.length === 0) {
    panel.innerHTML = "<p>No online friends in study rooms yet.</p>";
    return;
  }

  onlineFriendsInRooms.forEach(({ user: friendName, room }) => {
    const nameToShow = friendName || "(Unknown user)"; // ✅ Prevent blanks

    const div = document.createElement("div");
    div.className = "friend-room-entry";
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.padding = "0.4rem 0.6rem";
    div.style.marginBottom = "0.3rem";
    div.style.background = "#f1f7fd";
    div.style.color = "black";
    div.style.borderRadius = "8px";
    div.style.cursor = "pointer";

    div.innerHTML = `
      <span><strong>${nameToShow}</strong></span>
      <span style="color:#2c6ed5;">${room}</span>
    `;

    // ✅ Click to join same room
    div.addEventListener("click", () => {
      joinRoom(room);
    });

    panel.appendChild(div);
  });
}



document.getElementById("addFriendBtn").addEventListener("click", async () => {
  const inputEl = document.getElementById("newFriendInput");
  const newFriend = inputEl.value.trim();
  if (!newFriend) return alert("Enter a friend name!");
  if (newFriend === user) return alert("You cannot add yourself!");

  try {
    const res = await fetch("/users");
    const allUsers = await res.json();
    if (!allUsers.includes(newFriend)) return alert("That user does not exist!");

    const friends = getFriends();
    if (friends.includes(newFriend)) return alert("Friend already added!");

    friends.push(newFriend);
    saveFriends(friends);
    inputEl.value = "";
    loadFriends();
    alert(`${newFriend} added to your friendlist!`);
  } catch (err) {
    console.error("Error checking users:", err);
  }
});

/* ---------- Logout ---------- */
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("user");
  window.location.href = "index.html";
});


document.getElementById("chatroomsLink").addEventListener("click", (e) => {
  e.preventDefault();
  hideAllPanels();
  chatroomsContainer.style.display = "block"; // only show chatrooms list
  notepadContainer.style.display = "none";
  chatContainer.style.display = "none"; // hide messages until room join
  loadChatrooms();
});

document.getElementById("messagesLink").addEventListener("click", (e) => {
  e.preventDefault();
  hideAllPanels();
  chatContainer.style.display = "block";
  joinRoom(currentRoom);
});

document.getElementById("friendlistLink").addEventListener("click", (e) => {
  e.preventDefault();
  hideAllPanels();
  friendlistContainer.style.display = "block";
  loadFriends();
});

document.getElementById("usernameDisplay").addEventListener("click", showProfile);
document.getElementById("settingsLink").addEventListener("click", showSettings);


/* ---------- Socket Reconnect ---------- */
socket.on("connect", () => {
  if (currentRoom) socket.emit("joinRoom", { room: currentRoom, user });
});

/* ---------- Notepad ---------- */
const notepad = document.getElementById("notepad");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const autosaveStatus = document.getElementById("autosaveStatus");

function loadNote() {
  const noteKey = "notepad_" + user;
  notepad.value = localStorage.getItem(noteKey) || "";
}
loadNote();

saveNoteBtn.addEventListener("click", () => {
  const noteKey = "notepad_" + user;
  localStorage.setItem(noteKey, notepad.value);
  autosaveStatus.textContent = "Saved ✓";
  setTimeout(() => (autosaveStatus.textContent = ""), 1500);
});

notepad.addEventListener("input", () => {
  const noteKey = "notepad_" + user;
  localStorage.setItem(noteKey, notepad.value);
  autosaveStatus.textContent = "Autosaved ✓";
  setTimeout(() => (autosaveStatus.textContent = ""), 1500);
});

/* ---------- Profile ---------- */
function loadProfile() {
  const profile = JSON.parse(localStorage.getItem("profile_" + user)) || {};
  profileName.textContent = profile.name || user;
  profileAge.textContent = profile.age || "";
  profileGender.textContent = profile.gender || "";
  profileUniversity.textContent = profile.university || "";
  profileAnonymous.checked = profile.anonymous || false;

  editName.value = profile.name || "";
  editAge.value = profile.age || "";
  editGender.value = profile.gender || "";
  editUniversity.value = profile.university || "";
}

editBtn.addEventListener("click", () => {
  [profileName, profileAge, profileGender, profileUniversity].forEach(el => el.style.display = "none");
  [editName, editAge, editGender, editUniversity, saveBtn, cancelBtn].forEach(el => el.style.display = "inline-block");
  editBtn.style.display = "none";
});

saveBtn.addEventListener("click", () => {
  const updatedProfile = {
    name: editName.value.trim(),
    age: editAge.value.trim(),
    gender: editGender.value,
    university: editUniversity.value.trim(),
    anonymous: profileAnonymous.checked
  };
  localStorage.setItem("profile_" + user, JSON.stringify(updatedProfile));
  loadProfile();
  [profileName, profileAge, profileGender, profileUniversity].forEach(el => el.style.display = "inline");
  [editName, editAge, editGender, editUniversity, saveBtn, cancelBtn].forEach(el => el.style.display = "none");
  editBtn.style.display = "inline";
});

cancelBtn.addEventListener("click", loadProfile);

// === Study Room Center Mode Toggle ===

// When user clicks "Study Rooms" in navbar
document.getElementById('chatroomsLink').addEventListener('click', (e) => {
  e.preventDefault();
  document.body.classList.add('study-select');
  hideAllPanels(); // hide everything else
  chatroomsContainer.style.display = 'block'; // show room list
});

// When user clicks a room
document.getElementById('roomList').addEventListener('click', (e) => {
  if (e.target.tagName === 'LI') {
    document.body.classList.remove('study-select');
    joinRoom(e.target.dataset.room || e.target.textContent.trim());
  }
});

// --- Ensure Study Mode Ends When Navigating ---
function resetToDefaultLayout() {
  document.body.classList.remove("study-select");
}



document.getElementById("friendlistLink").addEventListener("click", (e) => {
  e.preventDefault();
  resetToDefaultLayout();
  hideAllPanels();
  friendlistContainer.style.display = "block";
  loadFriends();
});

document.getElementById("messagesLink").addEventListener("click", (e) => {
  e.preventDefault();
  resetToDefaultLayout();
  hideAllPanels();
  chatContainer.style.display = "block";
  joinRoom(currentRoom);
});

document.getElementById("settingsLink").addEventListener("click", (e) => {
  e.preventDefault();
  resetToDefaultLayout();
  hideAllPanels();
  settingsContainer.style.display = "block";
});



/* ---------- Init ---------- */
loadChatrooms();
loadFriends();
loadProfile();


// // --- Backend base URL ---
// const API_URL = "https://chat-backend-cf63.onrender.com";
// const socket = io(API_URL); // ✅ connect socket.io to backend

// // --- Auth check ---
// const user = localStorage.getItem("user");
// if (!user) window.location.href = "index.html";

// // --- Elements ---
// const chatBox = document.getElementById("chatBox");
// const input = document.getElementById("messageInput");
// const sendBtn = document.getElementById("sendBtn");
// const usernameDisplay = document.getElementById("usernameDisplay");
// usernameDisplay.textContent = user;

// const userAvatar = document.getElementById("userAvatar");
// if (user && user.length > 0) userAvatar.textContent = user.charAt(0);

// const chatContainer = document.getElementById("chatContainer");
// const friendlistContainer = document.getElementById("friendlistContainer");
// const chatroomsContainer = document.getElementById("chatroomsContainer");
// const notepadContainer = document.getElementById("notepadContainer");
// const profileContainer = document.getElementById("profileContainer");
// const settingsContainer = document.getElementById("settingsContainer");

// const profileName = document.getElementById("profileName");
// const profileAge = document.getElementById("profileAge");
// const profileGender = document.getElementById("profileGender");
// const profileUniversity = document.getElementById("profileUniversity");
// const profileAnonymous = document.getElementById("profileAnonymous");

// const editName = document.getElementById("editName");
// const editAge = document.getElementById("editAge");
// const editGender = document.getElementById("editGender");
// const editUniversity = document.getElementById("editUniversity");

// const editBtn = document.getElementById("editProfileBtn");
// const saveBtn = document.getElementById("saveProfileBtn");
// const cancelBtn = document.getElementById("cancelProfileBtn");

// let currentRoom = localStorage.getItem("currentRoom") || "general";
// document.getElementById("currentRoomTitle").textContent = `Chatroom: ${currentRoom}`;

// /* ---------- Helper Functions ---------- */
// function dmRoomName(user1, user2) {
//   return [user1, user2].sort().join("_");
// }

// function hideAllPanels() {
//   chatContainer.style.display = "none";
//   friendlistContainer.style.display = "none";
//   chatroomsContainer.style.display = "none";
//   notepadContainer.style.display = "none";
//   profileContainer.style.display = "none";
//   settingsContainer.style.display = "none";
// }

// function showProfile() {
//   hideAllPanels();
//   profileContainer.style.display = "block";
// }

// function showSettings() {
//   hideAllPanels();
//   settingsContainer.style.display = "block";
// }

// /* ---------- Chatrooms ---------- */
// async function loadChatrooms() {
//   try {
//     const res = await fetch(`${API_URL}/chatrooms`);
//     if (!res.ok) return;
//     const rooms = await res.json();
//     const roomList = document.getElementById("roomList");
//     roomList.innerHTML = "";

//     const createdRooms = JSON.parse(localStorage.getItem("createdRooms_" + user)) || [];

//     rooms.forEach(room => {
//       const li = document.createElement("li");
//       li.classList.add("room-item");
//       li.textContent = room;
//       li.dataset.room = room;
//       li.style.cursor = "pointer";
//       li.style.background = room === currentRoom ? "#d7e8ff" : "#f1f7fd";
//       li.style.display = "flex";
//       li.style.justifyContent = "space-between";
//       li.style.alignItems = "center";
//       li.style.padding = "0.5rem 1rem";
//       li.style.borderRadius = "10px";
//       li.style.marginBottom = "0.5rem";

//       li.addEventListener("click", (e) => {
//         if (e.target.classList.contains("delete-room-btn")) return;
//         joinRoom(room);
//         Array.from(roomList.children).forEach(r => r.style.background = "#f1f7fd");
//         li.style.background = "#d7e8ff";
//       });

//       if (createdRooms.includes(room)) {
//         const delBtn = document.createElement("button");
//         delBtn.textContent = "❌";
//         delBtn.className = "delete-room-btn";
//         delBtn.style.background = "transparent";
//         delBtn.style.border = "none";
//         delBtn.style.cursor = "pointer";
//         delBtn.style.fontSize = "1.1rem";

//         delBtn.addEventListener("click", async (e) => {
//           e.stopPropagation();
//           if (!confirm(`Delete study room "${room}"?`)) return;
//           try {
//             const res = await fetch(`${API_URL}/chatroom/${room}`, { method: "DELETE" });
//             if (res.ok) {
//               const updatedRooms = createdRooms.filter(r => r !== room);
//               localStorage.setItem("createdRooms_" + user, JSON.stringify(updatedRooms));
//               loadChatrooms();
//             } else {
//               alert("Failed to delete room.");
//             }
//           } catch (err) {
//             console.error("Delete room error:", err);
//           }
//         });

//         li.appendChild(delBtn);
//       }

//       roomList.appendChild(li);
//     });
//   } catch (err) {
//     console.error("loadChatrooms:", err);
//   }
// }

// /* ---------- Join Room ---------- */
// function joinRoom(roomName, isDirect = false, otherUser = "") {
//   if (currentRoom) socket.emit("leaveRoom", { room: currentRoom, user });

//   currentRoom = roomName;
//   localStorage.setItem("currentRoom", roomName);

//   hideAllPanels();
//   chatContainer.style.display = "block";
//   chatroomsContainer.style.display = "block";
//   notepadContainer.style.display = "block";

//   if (isDirect && otherUser) {
//     chatBox.innerHTML = `<p class="system-message">Joined chat with ${otherUser}</p>`;
//     document.getElementById("currentRoomTitle").textContent = `Chat with ${otherUser}`;
//   } else {
//     chatBox.innerHTML = `<p class="system-message">Joined ${roomName}</p>`;
//     document.getElementById("currentRoomTitle").textContent = `Chatroom: ${roomName}`;
//   }

//   socket.emit("joinRoom", { room: roomName, user });
//   loadMessages();
// }

// /* ---------- Messages ---------- */
// async function loadMessages() {
//   try {
//     const res = await fetch(`${API_URL}/messages/${currentRoom}`);
//     if (!res.ok) {
//       chatBox.innerHTML = `<p class="system-message">No messages or failed to load.</p>`;
//       return;
//     }
//     const messages = await res.json();
//     chatBox.innerHTML = messages
//       .map(m => `<div class="message"><strong>${m.user}:</strong> ${m.message || m.text}</div>`)
//       .join("");
//     chatBox.scrollTop = chatBox.scrollHeight;
//   } catch (err) {
//     console.error("Error loading messages:", err);
//   }
// }

// function sendMessage() {
//   const message = input.value.trim();
//   if (!message || !currentRoom) return;
//   const profile = JSON.parse(localStorage.getItem("profile_" + user)) || {};
//   const displayName = profile.anonymous ? "Anonymous" : user;
//   socket.emit("chatMessage", { room: currentRoom, user: displayName, message });
//   input.value = "";
// }

// sendBtn.addEventListener("click", sendMessage);
// input.addEventListener("keypress", e => { if (e.key === "Enter") sendMessage(); });

// socket.on("chatMessage", data => {
//   const msg = document.createElement("div");
//   msg.classList.add("message");
//   msg.innerHTML = `<strong>${data.user}:</strong> ${data.message}`;
//   chatBox.appendChild(msg);
//   chatBox.scrollTop = chatBox.scrollHeight;
// });

// socket.on("systemMessage", msg => {
//   const sys = document.createElement("div");
//   sys.classList.add("system-message");
//   sys.textContent = msg;
//   chatBox.appendChild(sys);
//   chatBox.scrollTop = chatBox.scrollHeight;
// });

// socket.on("chatroomsUpdated", loadChatrooms);
// socket.on("userJoined", ({ user: joinedUser }) => {
//   const sys = document.createElement("div");
//   sys.classList.add("system-message");
//   sys.textContent = `${joinedUser} joined`;
//   chatBox.appendChild(sys);
//   chatBox.scrollTop = chatBox.scrollHeight;
// });
// socket.on("userLeft", ({ user: leftUser }) => {
//   const sys = document.createElement("div");
//   sys.classList.add("system-message");
//   sys.textContent = `${leftUser} disconnected`;
//   chatBox.appendChild(sys);
//   chatBox.scrollTop = chatBox.scrollHeight;
// });

// /* ---------- Create Chatroom ---------- */
// document.getElementById("createRoomBtn").addEventListener("click", async () => {
//   const name = document.getElementById("newRoomInput").value.trim();
//   if (!name) return;
//   try {
//     const res = await fetch(`${API_URL}/chatroom`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ name }),
//     });
//     if (res.ok) {
//       document.getElementById("newRoomInput").value = "";
//       let createdRooms = JSON.parse(localStorage.getItem("createdRooms_" + user)) || [];
//       if (!createdRooms.includes(name)) {
//         createdRooms.push(name);
//         localStorage.setItem("createdRooms_" + user, JSON.stringify(createdRooms));
//       }
//       loadChatrooms();
//     } else {
//       alert("Room already exists or invalid name");
//     }
//   } catch (err) {
//     console.error("createRoom error:", err);
//   }
// });

// /* ---------- Friends + Online Users ---------- */
// function getFriends() { return JSON.parse(localStorage.getItem("friends_" + user)) || []; }
// function saveFriends(friends) { localStorage.setItem("friends_" + user, JSON.stringify(friends)); }

// let onlineUsers = [];
// socket.on("updateOnlineUsers", list => {
//   onlineUsers = list;
//   loadFriends();
//   updateFriendsStudyRooms();
// });

// async function loadFriends() {
//   const friendsOnlineList = document.getElementById("friendsOnlineList");
//   const friendsOfflineList = document.getElementById("friendsOfflineList");

//   const friends = getFriends();
//   friendsOnlineList.innerHTML = "";
//   friendsOfflineList.innerHTML = "";

//   if (!friends.length) {
//     friendsOfflineList.innerHTML = "<p>No friends added yet.</p>";
//     return;
//   }

//   friends.forEach((friend, index) => {
//     const info = onlineUsers.find(u => u.user === friend);
//     const isOnline = !!info;
//     const friendRoom = info?.room || "—";

//     const li = document.createElement("li");
//     li.className = "friend-item";
//     li.style.display = "flex";
//     li.style.justifyContent = "space-between";
//     li.style.alignItems = "center";
//     li.style.padding = "0.5rem";
//     li.style.background = isOnline ? "#e8fce8" : "#f1f7fd";
//     li.style.marginBottom = "0.3rem";
//     li.style.borderRadius = "8px";

//     li.innerHTML = `
//       <div>
//         <span class="friend-name" style="cursor:pointer;font-weight:600;">${friend}</span>
//         <small style="margin-left:6px;color:#555;">(${isOnline ? "Online" : "Offline"})</small>
//       </div>
//       <div>
//         <small style="color:#2c6ed5;">${isOnline ? `Room: ${friendRoom}` : ""}</small>
//         <button style="background:red;color:white;border:none;padding:0.2rem 0.5rem;border-radius:6px;cursor:pointer;margin-left:8px;">Delete</button>
//       </div>
//     `;

//     li.querySelector("button").addEventListener("click", () => {
//       friends.splice(index, 1);
//       saveFriends(friends);
//       loadFriends();
//     });

//     li.querySelector(".friend-name").addEventListener("click", () => {
//       const dmRoom = dmRoomName(user, friend);
//       joinRoom(dmRoom, true, friend);
//     });

//     if (isOnline) friendsOnlineList.appendChild(li);
//     else friendsOfflineList.appendChild(li);
//   });
// }

// function updateFriendsStudyRooms() {
//   const panel = document.getElementById("friendsStudyRooms");
//   panel.innerHTML = "";

//   const friends = getFriends();
//   const onlineFriendsInRooms = onlineUsers.filter(u => friends.includes(u.user) && u.room);

//   if (onlineFriendsInRooms.length === 0) {
//     panel.innerHTML = "<p>No online friends in study rooms yet.</p>";
//     return;
//   }

//   onlineFriendsInRooms.forEach(({ user: friendName, room }) => {
//     const div = document.createElement("div");
//     div.className = "friend-room-entry";
//     div.style.display = "flex";
//     div.style.justifyContent = "space-between";
//     div.style.alignItems = "center";
//     div.style.padding = "0.4rem 0.6rem";
//     div.style.marginBottom = "0.3rem";
//     div.style.background = "#f1f7fd";
//     div.style.borderRadius = "8px";
//     div.style.cursor = "pointer";
//     div.innerHTML = `<span><strong>${friendName}</strong></span><span style="color:#2c6ed5;">${room}</span>`;
//     div.addEventListener("click", () => joinRoom(room));
//     panel.appendChild(div);
//   });
// }

// document.getElementById("addFriendBtn").addEventListener("click", async () => {
//   const inputEl = document.getElementById("newFriendInput");
//   const newFriend = inputEl.value.trim();
//   if (!newFriend) return alert("Enter a friend name!");
//   if (newFriend === user) return alert("You cannot add yourself!");
//   try {
//     const res = await fetch(`${API_URL}/users`);
//     const allUsers = await res.json();
//     if (!allUsers.includes(newFriend)) return alert("That user does not exist!");
//     const friends = getFriends();
//     if (friends.includes(newFriend)) return alert("Friend already added!");
//     friends.push(newFriend);
//     saveFriends(friends);
//     inputEl.value = "";
//     loadFriends();
//     alert(`${newFriend} added to your friendlist!`);
//   } catch (err) {
//     console.error("Error checking users:", err);
//   }
// });

// /* ---------- Logout ---------- */
// document.getElementById("logoutBtn").addEventListener("click", async () => {
//   try {
//     await fetch(`${API_URL}/logout`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ username: user }),
//     });
//   } catch (err) {
//     console.warn("Logout error:", err);
//   }
//   localStorage.removeItem("user");
//   window.location.href = "index.html";
// });

// /* ---------- Navigation Links ---------- */
// document.getElementById("chatroomsLink").addEventListener("click", (e) => {
//   e.preventDefault();
//   hideAllPanels();
//   chatroomsContainer.style.display = "block";
//   notepadContainer.style.display = "none";
//   chatContainer.style.display = "none";
//   loadChatrooms();
// });

// document.getElementById("messagesLink").addEventListener("click", (e) => {
//   e.preventDefault();
//   hideAllPanels();
//   chatContainer.style.display = "block";
//   joinRoom(currentRoom);
// });

// document.getElementById("friendlistLink").addEventListener("click", (e) => {
//   e.preventDefault();
//   hideAllPanels();
//   friendlistContainer.style.display = "block";
//   loadFriends();
// });

// document.getElementById("usernameDisplay").addEventListener("click", showProfile);
// document.getElementById("settingsLink").addEventListener("click", showSettings);

// /* ---------- Reconnect ---------- */
// socket.on("connect", () => {
//   if (currentRoom) socket.emit("joinRoom", { room: currentRoom, user });
// });

// /* ---------- Notepad ---------- */
// const notepad = document.getElementById("notepad");
// const saveNoteBtn = document.getElementById("saveNoteBtn");
// const autosaveStatus = document.getElementById("autosaveStatus");

// function loadNote() {
//   const noteKey = "notepad_" + user;
//   notepad.value = localStorage.getItem(noteKey) || "";
// }
// loadNote();

// saveNoteBtn.addEventListener("click", () => {
//   const noteKey = "notepad_" + user;
//   localStorage.setItem(noteKey, notepad.value);
//   autosaveStatus.textContent = "Saved ✓";
//   setTimeout(() => (autosaveStatus.textContent = ""), 1500);
// });

// notepad.addEventListener("input", () => {
//   const noteKey = "notepad_" + user;
//   localStorage.setItem(noteKey, notepad.value);
//   autosaveStatus.textContent = "Autosaved ✓";
//   setTimeout(() => (autosaveStatus.textContent = ""), 1500);
// });


// /* ---------- Profile ---------- */
// function loadProfile() {
//   const profile = JSON.parse(localStorage.getItem("profile_" + user)) || {};
//   profileName.textContent = profile.name || user;
//   profileAge.textContent = profile.age || "";
//   profileGender.textContent = profile.gender || "";
//   profileUniversity.textContent = profile.university || "";
//   profileAnonymous.checked = profile.anonymous || false;

//   editName.value = profile.name || "";
//   editAge.value = profile.age || "";
//   editGender.value = profile.gender || "";
//   editUniversity.value = profile.university || "";
// }

// editBtn.addEventListener("click", () => {
//   [profileName, profileAge, profileGender, profileUniversity].forEach(el => el.style.display = "none");
//   [editName, editAge, editGender, editUniversity, saveBtn, cancelBtn].forEach(el => el.style.display = "inline-block");
//   editBtn.style.display = "none";
// });

// saveBtn.addEventListener("click", async () => {
//   const updatedProfile = {
//     name: editName.value.trim(),
//     age: editAge.value.trim(),
//     gender: editGender.value,
//     university: editUniversity.value.trim(),
//     anonymous: profileAnonymous.checked
//   };

//   // Save locally
//   localStorage.setItem("profile_" + user, JSON.stringify(updatedProfile));

//   // OPTIONAL: sync to backend (if you want to persist profiles server-side later)
//   try {
//     const API_URL = "https://chat-backend-cf63.onrender.com";
//     await fetch(`${API_URL}/profile`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ username: user, profile: updatedProfile })
//     });
//   } catch (err) {
//     console.warn("Profile sync failed:", err);
//   }

//   loadProfile();
//   [profileName, profileAge, profileGender, profileUniversity].forEach(el => el.style.display = "inline");
//   [editName, editAge, editGender, editUniversity, saveBtn, cancelBtn].forEach(el => el.style.display = "none");
//   editBtn.style.display = "inline";
// });

// cancelBtn.addEventListener("click", loadProfile);


// /* ---------- Study Room Center Mode Toggle ---------- */

// // When user clicks "Study Rooms" in navbar
// document.getElementById("chatroomsLink").addEventListener("click", (e) => {
//   e.preventDefault();
//   document.body.classList.add("study-select");
//   hideAllPanels(); // hide everything else
//   chatroomsContainer.style.display = "block"; // show room list
// });

// // When user clicks a room
// document.getElementById("roomList").addEventListener("click", (e) => {
//   if (e.target.tagName === "LI") {
//     document.body.classList.remove("study-select");
//     joinRoom(e.target.dataset.room || e.target.textContent.trim());
//   }
// });

// // --- Ensure Study Mode Ends When Navigating ---
// function resetToDefaultLayout() {
//   document.body.classList.remove("study-select");
// }

// document.getElementById("friendlistLink").addEventListener("click", (e) => {
//   e.preventDefault();
//   resetToDefaultLayout();
//   hideAllPanels();
//   friendlistContainer.style.display = "block";
//   loadFriends();
// });

// document.getElementById("messagesLink").addEventListener("click", (e) => {
//   e.preventDefault();
//   resetToDefaultLayout();
//   hideAllPanels();
//   chatContainer.style.display = "block";
//   joinRoom(currentRoom);
// });

// document.getElementById("settingsLink").addEventListener("click", (e) => {
//   e.preventDefault();
//   resetToDefaultLayout();
//   hideAllPanels();
//   settingsContainer.style.display = "block";
// });

// /* ---------- Init ---------- */
// loadChatrooms();
// loadFriends();
// loadProfile();
