const taskForm = document.querySelector("#task-form");
const titleInput = document.querySelector("#title");
const categorySelect = document.querySelector("#category");
const prioritySelect = document.querySelector("#priority");
const submitButton = document.querySelector("#submit-button");
const refreshButton = document.querySelector("#refresh-button");
const filterSelect = document.querySelector("#filter");
const searchInput = document.querySelector("#search");
const statusEl = document.querySelector("#status");
const summaryEl = document.querySelector("#summary");
const taskList = document.querySelector("#task-list");

let tasks = [];

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      data?.error || data?.message || `Ошибка сервера: HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

function updateSummary() {
  const total = tasks.length;
  const doneCount = tasks.filter((task) => task.done).length;
  const activeCount = total - doneCount;
  summaryEl.textContent = `Всего: ${total} | Активных: ${activeCount} | Выполнено: ${doneCount}`;
}

function renderTasks() {
  updateSummary();

  const statusFilter = filterSelect.value;
  const query = searchInput.value.trim().toLowerCase();

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "done" && task.done) ||
      (statusFilter === "active" && !task.done);

    const matchesSearch = task.title.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  taskList.innerHTML = "";

  if (filteredTasks.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "empty";
    emptyEl.textContent =
      tasks.length === 0
        ? "Список задач пуст. Добавьте первую задачу."
        : "По заданным фильтрам ничего не найдено.";
    taskList.appendChild(emptyEl);
    return;
  }

  filteredTasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = task.done ? "task done" : "task";

    const info = document.createElement("div");
    info.className = "task-main";

    const title = document.createElement("h3");
    title.textContent = task.title;

    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = `Категория: ${task.category} · Приоритет: ${task.priority} · Статус: ${task.done ? "Выполнено" : "Активна"}`;

    info.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.dataset.action = "toggle";
    toggleBtn.dataset.id = String(task.id);
    toggleBtn.textContent = task.done ? "Вернуть" : "Выполнено";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "secondary";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = String(task.id);
    deleteBtn.textContent = "Удалить";

    actions.append(toggleBtn, deleteBtn);
    card.append(info, actions);
    taskList.appendChild(card);
  });
}

async function loadTasks() {
  setStatus("Загрузка списка задач...");
  try {
    const data = await apiRequest("/api/tasks");
    if (!data || !Array.isArray(data.items)) {
      throw new Error("Некорректный формат ответа от сервера");
    }
    tasks = data.items;
    renderTasks();
    setStatus("Данные актуальны.");
  } catch (error) {
    setStatus(`Ошибка загрузки: ${error.message}`, true);
  }
}

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const category = categorySelect.value;
  const priority = prioritySelect.value;

  if (title.length < 4) {
    setStatus("Название задачи должно содержать минимум 4 символа.", true);
    return;
  }

  submitButton.disabled = true;
  setStatus("Создание задачи...");

  try {
    await apiRequest("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title, category, priority }),
    });
    taskForm.reset();
    await loadTasks();
    setStatus("Задача успешно создана.");
  } catch (error) {
    setStatus(`Не удалось создать задачу: ${error.message}`, true);
  } finally {
    submitButton.disabled = false;
  }
});

taskList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = Number(button.dataset.id);
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    setStatus("Задача не найдена.", true);
    return;
  }

  button.disabled = true;

  try {
    if (action === "toggle") {
      setStatus("Обновление статуса...");
      await apiRequest(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ done: !task.done }),
      });
      await loadTasks();
      setStatus("Статус задачи изменён.");
    } else if (action === "delete") {
      setStatus("Удаление задачи...");
      await apiRequest(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      await loadTasks();
      setStatus("Задача удалена.");
    }
  } catch (error) {
    setStatus(`Ошибка операции: ${error.message}`, true);
    button.disabled = false;
  }
});

refreshButton.addEventListener("click", () => {
  loadTasks();
});

filterSelect.addEventListener("change", renderTasks);
searchInput.addEventListener("input", renderTasks);

loadTasks();
