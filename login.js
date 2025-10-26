// --- Base API URL (your Render backend) ---
const API_URL = "https://pluggstugan.onrender.com"; // ✅ change if your Render URL differs

// --- Event listeners for login and account creation ---
document.getElementById("loginBtn").addEventListener("click", login);
document.getElementById("createBtn").addEventListener("click", createAccount);

// --- Login function ---
async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    showMessage("⚠️ Please enter both fields.");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      localStorage.setItem("user", username);
      showMessage("✅ Login successful! Redirecting...");
      setTimeout(() => {
        window.location.href = "chat.html"; // ← Redirect to main page
      }, 800);
    } else if (res.status === 403) {
      showMessage("⚠️ This account is already logged in elsewhere.");
    } else {
      showMessage("❌ Invalid username or password.");
    }
  } catch (err) {
    console.error("Login error:", err);
    showMessage("❌ Failed to connect. Try again later.");
  }
}

// --- Create account function ---
async function createAccount() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    showMessage("⚠️ Please enter both fields.");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      showMessage("✅ Account created! You can now log in.");
    } else {
      showMessage("⚠️ Username already exists.");
    }
  } catch (err) {
    console.error("Create account error:", err);
    showMessage("❌ Failed to create account. Try again later.");
  }
}

// --- Logout handler ---
async function logout() {
  const username = localStorage.getItem("user");
  if (username) {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
  }
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// --- Logout button (optional if shown elsewhere) ---
document.getElementById("logoutBtn")?.addEventListener("click", logout);

// --- Auto logout on tab close ---
window.addEventListener("beforeunload", async () => {
  const username = localStorage.getItem("user");
  if (username) {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
    } catch (err) {
      console.error("Auto-logout error:", err);
    }
  }
});

// --- Helper for showing small messages on screen ---
function showMessage(text) {
  let msgBox = document.querySelector(".login-message");
  if (!msgBox) {
    msgBox = document.createElement("p");
    msgBox.className = "login-message";
    document.querySelector(".login-container").appendChild(msgBox);
  }
  msgBox.textContent = text;
}
