"use strict";

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
  const response = await fetch(path, options);
  if (!response.ok) {
    let errorMessage = `Ошибка HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && (errorData.error || errorData.message)) {
        errorMessage = errorData.error || errorData.message;
      }
    } catch {
    }
    throw new Error(errorMessage);
  }
  if (response.status === 204) {
    return null;
  }
  return await response.json();
}
function renderTasks() {
  const filterValue = (filter.value || "all").trim().toLowerCase();
  const searchQuery = (search.value || "").trim().toLowerCase();
  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => Boolean(t.done)).length;
  const activeCount = totalCount - doneCount;
  if (summary) {
    summary.textContent = `Всего: ${totalCount} | Активных: ${activeCount} | Выполненных: ${doneCount}`;
  }
  const filteredTasks = tasks.filter((task) => {
    const isDone = Boolean(task.done);
    const matchesStatus =
      filterValue === "all" ||
      filterValue === "все" ||
      filterValue === "" ||
      ((filterValue === "active" ||
        filterValue === "open" ||
        filterValue === "todo" ||
        filterValue === "undone" ||
        filterValue === "false" ||
        filterValue === "0" ||
        filterValue === "активные" ||
        filterValue === "в работе") &&
        !isDone) ||
      ((filterValue === "done" ||
        filterValue === "completed" ||
        filterValue === "closed" ||
        filterValue === "true" ||
        filterValue === "1" ||
        filterValue === "выполненные" ||
        filterValue === "готовые") &&
        isDone);
    const matchesSearch = (task.title || "").toLowerCase().includes(searchQuery);
    return matchesStatus && matchesSearch;
  });
  list.replaceChildren();
  if (filteredTasks.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-message";
    emptyItem.textContent = "Задачи не найдены.";
    list.append(emptyItem);
    return;
  }
  filteredTasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "task-item";
    if (task.done) {
      item.classList.add("completed");
    }
    const infoBlock = document.createElement("div");
    infoBlock.className = "task-info";
    const titleEl = document.createElement("strong");
    titleEl.textContent = task.title;
    const statusLabel = task.done ? "Выполнено" : "Активна";
    const metaEl = document.createElement("span");
    metaEl.className = "task-meta";
    metaEl.textContent = ` [${task.category || "Без категории"} • Приоритет: ${task.priority || "обычный"} • Статус: ${statusLabel}]`;
    infoBlock.append(titleEl, metaEl);
    const actionsBlock = document.createElement("div");
    actionsBlock.className = "task-actions";
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
    actionsBlock.append(toggleBtn, deleteBtn);
    item.append(infoBlock, actionsBlock);
    list.append(item);
  });
}                           
async function loadTasks() {
  setStatus("Загрузка задач...", "info");
  try {
    const data = await apiRequest("/api/tasks");
    if (!data || !Array.isArray(data.items)) {
      throw new Error("Сервер вернул некорректный список задач (отсутствует массив items).");
    }
    tasks = data.items;
    renderTasks();
    setStatus("Список задач обновлён.", "success");
  } catch (error) {
    setStatus(`Не удалось загрузить задачи: ${error.message}`, "error");
  }
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const title = (formData.get("title") || "").toString().trim();
  const category = (formData.get("category") || "").toString().trim();
  const priority = (formData.get("priority") || "").toString().trim();
  if (!title) {
    setStatus("Введите название задачи.", "error");
    return;
  }
  submitButton.disabled = true;
  setStatus("Добавление задачи...", "info");
  try {
    await apiRequest("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, category, priority }),
    });
    form.reset();
    await loadTasks();
    setStatus("Задача успешно добавлена!", "success");
  } catch (error) {
    setStatus(`Ошибка при создании: ${error.message}`, "error");
  } finally {
    submitButton.disabled = false;
  }
});
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
      await apiRequest(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ done: !task.done }),
      });
      setStatus("Статус задачи обновлён.", "success");
    } else if (action === "delete") {
      await apiRequest(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      setStatus("Задача удалена.", "success");
    }

    await loadTasks();
  } catch (error) {
    setStatus(`Ошибка при выполнении действия: ${error.message}`, "error");
    button.disabled = false;
  }
});
filter.addEventListener("change", renderTasks);
search.addEventListener("input", renderTasks);
loadTasks();
