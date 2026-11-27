const form = document.querySelector("#task-form");
const list = document.querySelector("#task-list");
const status = document.querySelector("#status");
const summary = document.querySelector("#summary");
const filter = document.querySelector("#filter");
const search = document.querySelector("#search");
const submitButton = document.querySelector("#submit-button");

let tasks = [];

function setStatus(message, kind = "info") {
  status.textContent = message;
  status.dataset.kind = kind;
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

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage = data?.error || `Ошибка сервера: ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

function renderTasks() {
  const totalCount = tasks.length;
  const doneCount = tasks.filter((task) => task.done).length;
  const activeCount = totalCount - doneCount;

  summary.textContent = `Всего: ${totalCount} | Активных: ${activeCount} | Выполненных: ${doneCount}`;

  const statusFilter = filter.value;
  const query = search.value.trim().toLowerCase();

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !task.done) ||
      (statusFilter === "done" && task.done);

    const matchesSearch = task.title.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  list.innerHTML = "";

  if (filteredTasks.length === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "empty";
    emptyMessage.textContent =
      tasks.length === 0
        ? "Список задач пуст. Добавьте первую задачу!"
        : "По вашему запросу задач не найдено.";
    list.appendChild(emptyMessage);
    return;
  }

  filteredTasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = `card${task.done ? " done" : ""}`;

    const titleEl = document.createElement("h3");
    titleEl.textContent = task.title;

    const metaEl = document.createElement("p");
    metaEl.className = "meta";
    const categoryText = task.category ? `Категория: ${task.category}` : "";
    const priorityText = task.priority ? `Приоритет: ${task.priority}` : "";
    const statusText = task.done ? "Выполнена" : "Активна";
    metaEl.textContent = [categoryText, priorityText, statusText]
      .filter(Boolean)
      .join(" • ");

    const actions = document.createElement("div");
    actions.className = "actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "secondary";
    toggleBtn.dataset.action = "toggle";
    toggleBtn.dataset.id = task.id;
    toggleBtn.textContent = task.done ? "Вернуть в работу" : "Выполнить";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = task.id;
    deleteBtn.textContent = "Удалить";

    actions.append(toggleBtn, deleteBtn);
    card.append(titleEl, metaEl, actions);
    list.appendChild(card);
  });
}

async function loadTasks() {
  setStatus("Загрузка задач...", "info");
  try {
    const data = await apiRequest("/api/tasks");
    if (Array.isArray(data)) {
      tasks = data;
    } else if (Array.isArray(data?.tasks)) {
      tasks = data.tasks;
    } else if (Array.isArray(data?.items)) {
      tasks = data.items;
    } else if (Array.isArray(data?.data)) {
      tasks = data.data;
    } else {
      tasks = [];
    }
    renderTasks();
    setStatus("Список задач актуален", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (submitButton.disabled) return;

  const formData = new FormData(form);
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const priority = String(formData.get("priority") ?? "").trim();

  if (title.length < 4) {
    setStatus("Название задачи должно содержать минимум 4 символа.", "error");
    return;
  }

  submitButton.disabled = true;
  setStatus("Создание задачи...", "info");

  try {
    await apiRequest("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title, category, priority }),
    });
    form.reset();
    await loadTasks();
    setStatus("Задача успешно добавлена", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;

  const { action, id } = button.dataset;
  const task = tasks.find((item) => String(item.id) === String(id));
  if (!task) return;

  button.disabled = true;

  try {
    if (action === "toggle") {
      await apiRequest(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ done: !task.done }),
      });
      await loadTasks();
      setStatus("Статус задачи обновлён", "success");
    } else if (action === "delete") {
      await apiRequest(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      await loadTasks();
      setStatus("Задача удалена", "success");
    }
  } catch (error) {
    setStatus(error.message, "error");
    button.disabled = false;
  }
});

filter.addEventListener("change", renderTasks);
search.addEventListener("input", renderTasks);
document.querySelector("#refresh-button").addEventListener("click", loadTasks);

loadTasks();
