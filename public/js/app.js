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

  if (!response.ok) {
    let errorMessage = `Ошибка сервера: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {}
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function renderTasks() {
  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;
  const activeCount = totalCount - doneCount;

  summary.textContent = `Всего: ${totalCount} | Активных: ${activeCount} | Выполненных: ${doneCount}`;

  const filterValue = filter.value;
  const searchQuery = search.value.trim().toLowerCase();

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      filterValue === "all" ||
      (filterValue === "active" && !task.done) ||
      (filterValue === "done" && task.done);

    const matchesSearch = task.title.toLowerCase().includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  list.innerHTML = "";

  if (filteredTasks.length === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "empty";
    emptyMessage.textContent = "Задачи не найдены.";
    list.append(emptyMessage);
    return;
  }

  filteredTasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = task.done ? "item done" : "item";

    const titleEl = document.createElement("h3");
    titleEl.textContent = task.title;

    const metaEl = document.createElement("div");
    metaEl.className = "meta";

    const categoryChip = document.createElement("span");
    categoryChip.className = "chip";
    categoryChip.textContent = task.category;

    const priorityChip = document.createElement("span");
    priorityChip.className = "chip";
    priorityChip.textContent = task.priority;

    const statusChip = document.createElement("span");
    statusChip.className = "chip";
    statusChip.textContent = task.done ? "Выполнено" : "Активна";

    metaEl.append(categoryChip, priorityChip, statusChip);

    const actionsEl = document.createElement("div");
    actionsEl.className = "item-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = task.done ? "secondary" : "";
    toggleBtn.dataset.action = "toggle";
    toggleBtn.dataset.id = task.id;
    toggleBtn.textContent = task.done ? "Вернуть" : "Выполнено";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = task.id;
    deleteBtn.textContent = "Удалить";

    actionsEl.append(toggleBtn, deleteBtn);
    card.append(titleEl, metaEl, actionsEl);
    list.append(card);
  });
}

async function loadTasks() {
  try {
    setStatus("Загрузка списка задач...", "loading");
    const data = await apiRequest("/api/tasks");

    if (!data || !Array.isArray(data.items)) {
      throw new Error("Некорректный формат данных от сервера");
    }

    tasks = data.items;
    renderTasks();
    setStatus("Список задач обновлён", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    title: formData.get("title")?.trim(),
    category: formData.get("category"),
    priority: formData.get("priority"),
  };

  submitButton.disabled = true;
  try {
    setStatus("Создание задачи...", "loading");
    await apiRequest("/api/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
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
  if (!button) return;

  const { action, id } = button.dataset;
  const task = tasks.find((t) => String(t.id) === String(id));
  if (!task) return;

  button.disabled = true;
  try {
    if (action === "toggle") {
      setStatus("Обновление статуса...", "loading");
      await apiRequest(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ done: !task.done }),
      });
    } else if (action === "delete") {
      setStatus("Удаление задачи...", "loading");
      await apiRequest(`/api/tasks/${id}`, {
        method: "DELETE",
      });
    }

    await loadTasks();
  } catch (error) {
    setStatus(error.message, "error");
    button.disabled = false;
  }
});

filter.addEventListener("change", renderTasks);
search.addEventListener("input", renderTasks);
document.querySelector("#refresh-button").addEventListener("click", loadTasks);

loadTasks();
