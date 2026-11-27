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

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    // Игнорируем ошибку парсинга, если тело ответа пустое
  }

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || `Ошибка сервера (${response.status})`;
    throw new Error(errorMessage);
  }

  return data;
}

// TODO 2: Отрисовка списка задач, фильтрация и подсчёт статистики
function renderTasks() {
  const filterValue = filter.value; // "all", "active" или "done"
  const searchQuery = search.value.trim().toLowerCase();

  // Подсчёт счётчиков
  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;
  const activeCount = totalCount - doneCount;

  if (summary) {
    summary.textContent = `Всего: ${totalCount} | Активных: ${activeCount} | Выполненных: ${doneCount}`;
  }

  // Фильтрация по статусу и подстроке названия
  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      filterValue === "all" ||
      (filterValue === "active" && !task.done) ||
      (filterValue === "done" && task.done);

    const matchesSearch = task.title.toLowerCase().includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  // Очистка текущего списка
  list.innerHTML = "";

  // Заглушка для пустого состояния
  if (filteredTasks.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-state";
    emptyMessage.textContent = "Задачи не найдены.";
    list.appendChild(emptyMessage);
    return;
  }

  // Генерация карточек задач
  filteredTasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = `task-card ${task.done ? "is-done" : ""}`;

    const titleEl = document.createElement("h4");
    titleEl.textContent = task.title;

    const metaEl = document.createElement("p");
    metaEl.textContent = `Категория: ${task.category} | Приоритет: ${task.priority} | Статус: ${
      task.done ? "Выполнено" : "В работе"
    }`;

    const actionsEl = document.createElement("div");
    actionsEl.className = "task-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.textContent = task.done ? "Вернуть" : "Выполнено";
    toggleBtn.dataset.action = "toggle";
    toggleBtn.dataset.id = task.id;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Удалить";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = task.id;

    actionsEl.append(toggleBtn, deleteBtn);
    card.append(titleEl, metaEl, actionsEl);
    list.appendChild(card);
  });
}

// TODO 3: Загрузка задач с сервера
async function loadTasks() {
  setStatus("Загрузка списка задач...", "info");
  try {
    const data = await apiRequest("/api/tasks");
    if (data && Array.isArray(data.items)) {
      tasks = data.items;
      renderTasks();
      setStatus("Список задач актуален", "info");
    } else {
      throw new Error("Некорректный формат ответа сервера");
    }
  } catch (error) {
    setStatus(error.message, "error");
  }
}

// TODO 4: Создание новой задачи
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    title: formData.get("title").trim(),
    category: formData.get("category"),
    priority: formData.get("priority"),
  };

  submitButton.disabled = true;
  setStatus("Создание задачи...", "info");

  try {
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

// TODO 5: Делегирование кликов по кнопкам внутри карточки («Выполнено/Вернуть» и «Удалить»)
list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
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
      await loadTasks();
      setStatus("Статус задачи обновлён", "success");
    } else if (action === "delete") {
      setStatus("Удаление задачи...", "info");
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

// TODO 6: Начальная загрузка при открытии страницы
loadTasks();