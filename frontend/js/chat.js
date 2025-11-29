// --- DOM elements ---
const input = document.getElementById("chat-input");
const sendBtn = document.getElementById("chat-send-btn");
const heroSection = document.getElementById("hero-section");
const chatContainer = document.getElementById("chat-container");

const sidebar = document.querySelector(".sidebar");
const historyList = document.querySelector(".history-list");
const newChatBtn = document.querySelector(".new-chat-btn");

// Local storage structure
let chats = JSON.parse(localStorage.getItem("chats") || "[]");
let currentChatId = localStorage.getItem("currentChatId") || null;


// =========================
// Render sidebar chat list
// =========================
function renderSidebar() {
    historyList.innerHTML = "";

    chats.forEach(chat => {
        const item = document.createElement("a");
        item.href = "#";
        item.className = "chat-item";
        if (chat.id === currentChatId) item.classList.add("active");

        item.innerHTML = `
            <div class="chat-title">${chat.title}</div>
            <div class="chat-preview">
                ${(chat.messages[0] || "").slice(0, 40)}
            </div>
        `;

        item.onclick = () => switchChat(chat.id);
        historyList.appendChild(item);
    });
}


// =========================
// Render messages in chat
// =========================
function renderChatMessages() {
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) {
        chatContainer.innerHTML = "";
        return;
    }

    chatContainer.innerHTML = chat.messages
        .map(msg => `
            <div class="msg user-msg">
                ${msg}
            </div>
        `)
        .join("");

    chatContainer.style.display = "block";
}


// =========================
// Create new chat
// =========================
function createNewChat() {
    const id = "chat-" + Date.now();
    const chat = {
        id,
        title: "New Chat",
        messages: []
    };
    chats.unshift(chat);
    currentChatId = id;

    save();
    renderSidebar();
    renderChatMessages();
}


// =========================
// Switch chat
// =========================
function switchChat(id) {
    currentChatId = id;

    save();
    renderSidebar();
    renderChatMessages();
}


// =========================
// Save to localStorage
// =========================
function save() {
    localStorage.setItem("chats", JSON.stringify(chats));
    localStorage.setItem("currentChatId", currentChatId);
}


// =========================
// Enable/disable send button
// =========================
input.addEventListener("input", () => {
    const hasText = input.value.trim().length > 0;
    sendBtn.disabled = !hasText;
    sendBtn.classList.toggle("active", hasText);
});

textarea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

sendBtn.addEventListener("click", () => {
  const text = textarea.value.trim();
  if (!text) return;

  console.log("Message sent:", text);

  textarea.value = "";
  textarea.style.height = "auto";
  sendBtn.disabled = true;
  sendBtn.classList.remove("active");
});
