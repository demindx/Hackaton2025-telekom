// ================== ELEMENTS ==================
const input = document.getElementById("chat-input");
const sendBtn = document.getElementById("chat-send-btn");
const chatContainer = document.getElementById("chat-container");
const heroSection = document.getElementById("hero-section");
const historyList = document.querySelector(".history-list");
const newChatBtn = document.querySelector(".new-chat-btn");

// ================== STATE ==================
let chats = [];
let activeChatId = null;

// ================== LOCAL STORAGE HELPERS ==================
function loadChats() {
  try {
    const raw = localStorage.getItem("chats");
    chats = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to parse chats from localStorage", e);
    chats = [];
  }
}

function saveChats() {
  localStorage.setItem("chats", JSON.stringify(chats));
}

function loadActiveChat() {
  return localStorage.getItem("activeChatId") || null;
}

function saveActiveChat() {
  if (activeChatId) {
    localStorage.setItem("activeChatId", activeChatId);
  } else {
    localStorage.removeItem("activeChatId");
  }
}

// ================== RENDER SIDE BAR ==================
function renderHistory() {
  if (!historyList) return;

  historyList.innerHTML = "";

  chats.forEach((chat) => {
    const item = document.createElement("div");
    item.className = "chat-item";
    if (chat.id === activeChatId) item.classList.add("active");

    const lastMessage =
      chat.messages.length > 0
        ? chat.messages[chat.messages.length - 1].content
        : "";

    item.innerHTML = `
      <div class="chat-title">${chat.title}</div>
      <div class="chat-preview">${lastMessage}</div>
    `;

    item.addEventListener("click", () => openChat(chat.id));
    historyList.appendChild(item);
  });
}

// ================== RENDER MESSAGES ==================
function renderMessages(chat) {
  if (!chatContainer) return;

  chatContainer.innerHTML = "";

  chat.messages.forEach((msg) => {
    const bubble = document.createElement("div");
    bubble.classList.add("msg");

    if (msg.role === "user") {
      bubble.classList.add("user-msg");
    } else if (msg.role === "assistant") {
      bubble.classList.add("bot-msg");
    } else {
      bubble.classList.add("system-msg");
    }

    bubble.textContent = msg.content;
    chatContainer.appendChild(bubble);
  });

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ================== CHAT HELPERS ==================
function createNewChat(firstMessage) {
  const id = Date.now().toString();
  const title = firstMessage.split(" ").slice(0, 6).join(" ") || "New chat";

  const chat = {
    id,
    title,
    messages: [{ role: "user", content: firstMessage }],
  };

  chats.unshift(chat);
  activeChatId = id;
  saveChats();
  saveActiveChat();
  renderHistory();
  return chat;
}

function openChat(id) {
  const chat = chats.find((c) => c.id === id);
  if (!chat) return;

  activeChatId = id;
  saveActiveChat();

  if (heroSection) heroSection.style.display = "none";
  if (chatContainer) chatContainer.style.display = "block";

  renderMessages(chat);
  renderHistory();
}

// ================== SEND MESSAGE ==================
function sendMessage() {
  if (!input || !chatContainer) return;

  const text = input.value.trim();
  if (!text) return;

  if (heroSection) heroSection.style.display = "none";
  chatContainer.style.display = "block";

  let chat;
  if (!activeChatId) {
    // перше повідомлення → створюємо новий чат
    chat = createNewChat(text);
  } else {
    chat = chats.find((c) => c.id === activeChatId);
    if (!chat) {
      chat = createNewChat(text);
    } else {
      chat.messages.push({ role: "user", content: text });
      saveChats();
    }
  }

  // додаємо останнє повідомлення в DOM без повного ререндеру
  const bubble = document.createElement("div");
  bubble.classList.add("msg", "user-msg");
  bubble.textContent = text;
  chatContainer.appendChild(bubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  input.value = "";
  autoResizeTextarea();
  sendBtn.disabled = true;
  sendBtn.classList.remove("active");

  renderHistory();
}

// ================== TEXTAREA AUTO-RESIZE ==================
function autoResizeTextarea() {
  if (!input) return;
  input.style.height = "auto";
  input.style.height = input.scrollHeight + "px";
}

// ================== EVENT LISTENERS ==================

// Enter = send, Shift+Enter = новий рядок
if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener("input", () => {
    autoResizeTextarea();
    const hasText = input.value.trim().length > 0;
    sendBtn.disabled = !hasText;
    if (hasText) {
      sendBtn.classList.add("active");
    } else {
      sendBtn.classList.remove("active");
    }
  });
}

if (sendBtn) {
  sendBtn.addEventListener("click", sendMessage);
}

// New Chat → чистий старт, hero, без активного чату
if (newChatBtn) {
  newChatBtn.addEventListener("click", () => {
    activeChatId = null;
    saveActiveChat();

    if (heroSection) {
      heroSection.style.display = "block";
    }
    if (chatContainer) {
      chatContainer.style.display = "none";
      chatContainer.innerHTML = "";
    }

    if (input) {
      input.value = "";
      autoResizeTextarea();
    }
    sendBtn.disabled = true;
    sendBtn.classList.remove("active");

    renderHistory();
  });
}

// ================== INIT ==================
loadChats();
renderHistory();

activeChatId = loadActiveChat();

if (activeChatId) {
  const chat = chats.find((c) => c.id === activeChatId);
  if (chat) {
    if (heroSection) heroSection.style.display = "none";
    if (chatContainer) {
      chatContainer.style.display = "block";
      renderMessages(chat);
    }
  } else {
    // якщо в localStorage залишився старий id, а чату вже нема
    activeChatId = null;
    saveActiveChat();
    if (heroSection) heroSection.style.display = "block";
    if (chatContainer) chatContainer.style.display = "none";
  }
} else {
  // немає активного чату → завжди старт з hero
  if (heroSection) heroSection.style.display = "block";
  if (chatContainer) chatContainer.style.display = "none";
}
