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

// ================================================
// request submission -> 
textarea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});



async function sendBackend() {
  sendBtn.addEventListener("click", async () => {
    const text = textarea.value.trim();
    if (!text) return;

    try {
      const response = await fetch("http://localhost:8080/api", {  // <-- Добавили await!
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text
        })
      });

      if (response.ok) {
        console.log("Сообщение успешно отправлено на сервер!");
        const data = await response.json();  // <-- Добавили await!
        console.log("Ответ сервера:", data);
      } else {
        console.error("Ошибка сервера:", response.status);
      }
    } catch (err) {
      console.error("Не удалось подключиться к серверу. Он запущен?", err);
    }

    console.log("Message sent:" + text);  // <-- Запятая → + (или оставь запятую, если работает)

    textarea.value = "";
    textarea.style.height = "auto";
    sendBtn.disabled = true;
    sendBtn.classList.remove("active");
  });
}

// Вызови функцию при загрузке страницы
sendBackend();

// Не забудь вызвать функцию один раз при загрузке страницы
sendBackend();

// ================================================
// request submission.
