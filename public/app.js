// Relative path — resolved against the <base href> injected by index.php,
// so this works whether the app is served at the domain root or a subfolder.
const API_BASE = 'api/todos';

const form = document.getElementById('todo-form');
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');
const list = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const errorState = document.getElementById('error-state');
const filterButtons = document.querySelectorAll('.filter-btn');

let todos = [];
let currentFilter = 'all';

async function apiRequest(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

async function loadTodos() {
  try {
    errorState.hidden = true;
    todos = await apiRequest(API_BASE);
    render();
  } catch (err) {
    showError(err.message);
  }
}

function showError(message) {
  errorState.textContent = message;
  errorState.hidden = false;
}

function render() {
  const filtered = todos.filter((t) => {
    if (currentFilter === 'active') return !Number(t.completed);
    if (currentFilter === 'completed') return Number(t.completed);
    return true;
  });

  list.innerHTML = '';
  emptyState.hidden = filtered.length > 0;

  for (const todo of filtered) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (Number(todo.completed) ? ' completed' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Number(todo.completed) === 1;
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    const content = document.createElement('div');
    content.className = 'todo-content';

    const title = document.createElement('div');
    title.className = 'todo-title';
    title.textContent = todo.title;
    content.appendChild(title);

    if (todo.description) {
      const desc = document.createElement('div');
      desc.className = 'todo-description';
      desc.textContent = todo.description;
      content.appendChild(desc);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

    li.appendChild(checkbox);
    li.appendChild(content);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  }
}

async function createTodo(title, description) {
  try {
    const newTodo = await apiRequest(API_BASE, {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
    todos.unshift(newTodo);
    render();
  } catch (err) {
    showError(err.message);
  }
}

async function toggleTodo(id) {
  try {
    const updated = await apiRequest(`${API_BASE}/${id}/toggle`, { method: 'PATCH' });
    todos = todos.map((t) => (t.id === updated.id ? updated : t));
    render();
  } catch (err) {
    showError(err.message);
  }
}

async function deleteTodo(id) {
  try {
    await apiRequest(`${API_BASE}/${id}`, { method: 'DELETE' });
    todos = todos.filter((t) => t.id !== id);
    render();
  } catch (err) {
    showError(err.message);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  if (!title) return;
  createTodo(title, description);
  titleInput.value = '';
  descInput.value = '';
});

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

loadTodos();
