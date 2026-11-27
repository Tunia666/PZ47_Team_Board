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

// TODO 1: Обёртка над fetch с обработкой ошибок и статуса 204
async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `Ошибка сервера (${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (_) {
      // Если тело ошибки не JSON, оставляем стандартное сообщение
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// TODO 2: Фильтрация, поиск, подсчёт статистики и отрисовка карточек
function renderTasks() {
  const filterValue = filter.value; // ожидаются значения: "all", "active", "done"
  const searchQuery = search.value.trim().toLowerCase();

  // Подсчёт счётчиков по всем задачам
  const totalCount = tasks.length;
  const doneCount = tasks.filter((task) => task.done).length;
  const activeCount = totalCount - doneCount;

  summary.textContent = `Всего: ${totalCount} | Активных: ${activeCount} | Выполнено: ${doneCount}`;

  // Совместная фильтрация по статусу и подстроке названия
  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      filterValue === "all" ||
      (filterValue === "active" && !task.done) ||
      (filterValue === "done" && task.done);

    const matchesSearch = task.title.toLowerCase().includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  list.innerHTML = "";

  // Заглушка при пустом списке
  if (filteredTasks.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty-state";
    emptyState.textContent =
      tasks.length === 0
        ? "Список задач пуст. Добавьте первую задачу!"
        : "По вашему запросу задач не найдено.";
    list.appendChild(emptyState);
    return;
  }

  // Формирование карточек задач через createElement и textContent
  filteredTasks.forEach((task) => {
    const card = document.createElement("li");
    card.className = task.done ? "task-card task-done" : "task-card";

    const info = document.createElement("div");
    info.className = "task-info";

    const titleEl = document.createElement("h3");
    titleEl.textContent = task.title;

    const metaEl = document.createElement("p");
    const statusText = task.done ? "Выполнено" : "В работе";
    metaEl.textContent = `Категория: ${task.category} | Приоритет: ${task.priority} | Статус: ${statusText}`;

    info.append(titleEl, metaEl);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.dataset.action = "toggle";
    toggleBtn.dataset.id = task.id;
    toggleBtn.textContent = task.done ? "Вернуть" : "Выполнено";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = task.id;
    deleteBtn.textContent = "Удалить";

    actions.append(toggleBtn, deleteBtn);
    card.append(info, actions);
    list.appendChild(card);
  });
}

// TODO 3: Загрузка списка задач с сервера
async function loadTasks() {
  setStatus("Загрузка задач...", "info");
  try {
    const data = await apiRequest("/api/tasks");
    if (!data || !Array.isArray(data.items)) {
      throw new Error("Некорректный формат ответа от сервера");
    }
    tasks = data.items;
    renderTasks();
    setStatus("Список задач актуален", "success");
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
  setStatus("Добавление задачи...", "info");

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

// TODO 5: Делегирование событий для переключения статуса и удаления
list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  const task = tasks.find((item) => String(item.id) === String(id));
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

// TODO 6: Начальная загрузка при открытии страницы
loadTasks();
