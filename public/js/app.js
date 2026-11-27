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

// TODO 1: Универсальная обёртка над fetch
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

  // Безопасно пытаемся распарсить JSON (на случай пустого тела или HTML-ошибки)
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = data?.error || `Ошибка HTTP: ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

// TODO 2: Фильтрация, поиск, статистика и рендер карточек
function renderTasks() {
  const filterValue = filter.value; // ожидаются значения вроде "all", "active", "done"
  const searchQuery = search.value.trim().toLowerCase();

  // 1. Подсчёт статистики по всем задачам
  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;
  const activeCount = totalCount - doneCount;
  summary.textContent = `Всего: ${totalCount} | Активных: ${activeCount} | Выполненных: ${doneCount}`;

  // 2. Фильтрация и поиск
  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      filterValue === "all" ||
      (filterValue === "active" && !task.done) ||
      (filterValue === "done" && task.done);

    const matchesSearch = task.title.toLowerCase().includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  // 3. Отрисовка списка через createElement и textContent
  list.innerHTML = "";

  if (filteredTasks.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.textContent = "Задачи не найдены";
    list.appendChild(emptyMessage);
    return;
  }

  filteredTasks.forEach((task) => {
    const card = document.createElement("li");
    card.className = "task-card";
    if (task.done) {
      card.classList.add("is-done");
    }

    const titleEl = document.createElement("strong");
    titleEl.textContent = task.title;

    const metaEl = document.createElement("span");
    metaEl.textContent = ` [${task.category} • Приоритет: ${task.priority}] `;

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.dataset.action = "toggle";
    toggleBtn.dataset.id = task.id;
    toggleBtn.textContent = task.done ? "Вернуть в работу" : "Выполнить";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = task.id;
    deleteBtn.textContent = "Удалить";

    card.append(titleEl, metaEl, toggleBtn, deleteBtn);
    list.appendChild(card);
  });
}

// TODO 3: Загрузка списка задач с сервера
async function loadTasks() {
  setStatus("Загрузка задач...", "info");
  try {
    const data = await apiRequest("/api/tasks");
    tasks = Array.isArray(data) ? data : [];
    renderTasks();
    setStatus("Список задач обновлён", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

// TODO 4: Создание новой задачи
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const priority = String(formData.get("priority") || "").trim();

  if (!title) {
    setStatus("Введите название задачи", "error");
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

// TODO 5: Делегирование кликов для изменения статуса и удаления
list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  // Сравниваем через String(), чтобы не зависеть от типа id (число или строка)
  const task = tasks.find((t) => String(t.id) === String(id));
  if (!task) return;

  button.disabled = true;

  try {
    if (action === "toggle") {
      setStatus("Обновление статуса...", "info");
      await apiRequest(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ done: !task.done }),
      });
    } else if (action === "delete") {
      setStatus("Удаление задачи...", "info");
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

// TODO 6: Начальная загрузка
loadTasks();
