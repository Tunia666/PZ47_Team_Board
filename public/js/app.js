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

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = data?.error || `Ошибка HTTP: ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

function renderTasks() {
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

  filteredTasks.forEach((task) => {
    const card = document.createElement("div");
    card.className = `task-card ${task.done ? "is-done" : ""}`;

    const title = document.createElement("h3");
    title.textContent = task.title;

    const meta = document.createElement("p");
    meta.textContent = `Категория: ${task.category} | Приоритет: ${task.priority}`;

    const actions = document.createElement("div");

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.dataset.action = "toggle";
    toggleBtn.dataset.id = task.id;
    toggleBtn.textContent = task.done ? "Вернуть в работу" : "Выполнено";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = task.id;
    deleteBtn.textContent = "Удалить";

    actions.append(toggleBtn, deleteBtn);
    card.append(title, meta, actions);
    list.append(card);
  });

  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;
  const activeCount = totalCount - doneCount;

  summary.textContent = `Всего: ${totalCount} | Активных: ${activeCount} | Выполненных: ${doneCount}`;
}

async function loadTasks() {
  setStatus("Загрузка задач...", "info");
  try {
    const data = await apiRequest("/api/tasks");
    tasks = Array.isArray(data) ? data : data?.items || [];
    renderTasks();
    setStatus("Задачи загружены", "success");
  } catch (error) {
    setStatus(`Ошибка загрузки: ${error.message}`, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const titleEl = form.querySelector('[name="title"], #title');
  const categoryEl = form.querySelector('[name="category"], #category');
  const priorityEl = form.querySelector('[name="priority"], #priority');

  const title = titleEl?.value.trim() || "";
  const category = categoryEl?.value || "";
  const priority = priorityEl?.value || "";

  submitButton.disabled = true;
  setStatus("Сохранение...", "info");

  try {
    await apiRequest("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title, category, priority }),
    });

    form.reset();
    await loadTasks();
    setStatus("Задача создана", "success");
  } catch (error) {
    setStatus(`Ошибка: ${error.message}`, "error");
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
      await apiRequest(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ done: !task.done }),
      });
    } else if (action === "delete") {
      await apiRequest(`/api/tasks/${id}`, {
        method: "DELETE",
      });
    }

    await loadTasks();
  } catch (error) {
    setStatus(`Ошибка: ${error.message}`, "error");
    button.disabled = false;
  }
});

filter.addEventListener("change", renderTasks);
search.addEventListener("input", renderTasks);
document.querySelector("#refresh-button").addEventListener("click", loadTasks);

loadTasks();
