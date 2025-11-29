// ================== ELEMENTS ==================
const input = document.getElementById("chat-input");
const sendBtn = document.getElementById("chat-send-btn");
const chatContainer = document.getElementById("chat-container");
const heroSection = document.getElementById("hero-section");
const historyList = document.querySelector(".history-list");
const newChatBtn = document.querySelector(".new-chat-btn");

// усередині hero-section: текст, який треба ховати, але не інпут
const heroTitle = heroSection ? heroSection.querySelector("h1") : null;
const heroIntro = heroSection ? heroSection.querySelector(".intro") : null;

// ================== STATE ==================
let chats = [];
let activeChatId = null;

// --------- LocalStorage helpers ----------
function loadChats() {
  try {
    const raw = localStorage.getItem("chats");
    chats = raw ? JSON.parse(raw) : [];
  } catch {
    chats = [];
  }
}

function saveChats() {
  localStorage.setItem("chats", JSON.stringify(chats));
}

// ================== RENDERING ==================
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

function renderMessages(chat) {
  if (!chatContainer) return;

  chatContainer.innerHTML = "";
  chat.messages.forEach((msg) => {
    const div = document.createElement("div");
    div.classList.add("msg", "user-msg");
    div.textContent = msg.content;
    chatContainer.appendChild(div);
  });

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ================== CHAT LOGIC ==================
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
  renderHistory();
  return chat;
}

function openChat(id) {
  const chat = chats.find((c) => c.id === id);
  if (!chat) return;

  activeChatId = id;

  // показуємо режим чату
  if (heroTitle) heroTitle.style.display = "none";
  if (heroIntro) heroIntro.style.display = "none";
  if (chatContainer) chatContainer.style.display = "block";

  renderMessages(chat);
  renderHistory();
}

function sendMessage() {
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  // ховаємо тільки текст hero, але НЕ інпут
  if (heroTitle) heroTitle.style.display = "none";
  if (heroIntro) heroIntro.style.display = "none";
  if (chatContainer) chatContainer.style.display = "block";

  let chat;
  if (!activeChatId) {
    // перше повідомлення → створюємо новий чат у sidebar
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

  // додаємо повідомлення в DOM
  if (chatContainer) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("msg", "user-msg");
    msgDiv.textContent = text;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // очищаємо інпут і деактивуємо кнопку
  input.value = "";
  sendBtn.disabled = true;
  sendBtn.classList.remove("active");

  renderHistory();
}

// ================== EVENT HANDLERS ==================

// Enter = відправка, Shift+Enter = новий рядок
if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener("input", () => {
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

// New Chat → стартовий екран, чистий інпут
if (newChatBtn) {
  newChatBtn.addEventListener("click", () => {
    activeChatId = null;

    // показуємо hero-текст
    if (heroTitle) heroTitle.style.display = "";
    if (heroIntro) heroIntro.style.display = "";

    if (chatContainer) {
      chatContainer.style.display = "none";
      chatContainer.innerHTML = "";
    }

    if (input) {
      input.value = "";
    }
    sendBtn.disabled = true;
    sendBtn.classList.remove("active");
  });
}

// ================== INIT ==================
loadChats();
renderHistory();

// якщо є активні чати з минулого — нічого не відкриваємо автоматично,
// користувач сам клікне в sidebar
