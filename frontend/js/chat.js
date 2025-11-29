const textarea = document.getElementById("chat-input");
const sendBtn = document.getElementById("chat-send-btn");

textarea.addEventListener("input", () => {
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";

  if (textarea.value.trim().length > 0) {
    sendBtn.disabled = false;
    sendBtn.classList.add("active");
  } else {
    sendBtn.disabled = true;
    sendBtn.classList.remove("active");
  }
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
