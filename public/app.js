// Relative path — resolved against the <base href> injected by index.php,
// so this works whether the app is served at the domain root or a subfolder.
const API_BASE = 'api/todos';

let todos = [];
let currentFilter = 'all';

// ---------------------------------------------------------------
// API helper
// ---------------------------------------------------------------
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

const errorState = document.getElementById('error-state');
function showError(message) {
  errorState.textContent = message;
  errorState.hidden = false;
}
function clearError() {
  errorState.hidden = true;
}

async function loadTodos() {
  try {
    clearError();
    todos = await apiRequest(API_BASE);
  } catch (err) {
    showError(err.message);
  }
}

// ---------------------------------------------------------------
// Shared todo-item rendering (used by All Todos + Completed views)
// ---------------------------------------------------------------
function buildTodoItem(todo) {
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
  return li;
}

// ---------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------
async function createTodo(title, description, onDone) {
  try {
    const newTodo = await apiRequest(API_BASE, {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
    todos.unshift(newTodo);
    if (onDone) onDone(newTodo);
    renderCurrentView();
  } catch (err) {
    showError(err.message);
  }
}

async function toggleTodo(id) {
  try {
    const updated = await apiRequest(`${API_BASE}/${id}/toggle`, { method: 'PATCH' });
    todos = todos.map((t) => (t.id === updated.id ? updated : t));
    renderCurrentView();
  } catch (err) {
    showError(err.message);
  }
}

async function deleteTodo(id) {
  try {
    await apiRequest(`${API_BASE}/${id}`, { method: 'DELETE' });
    todos = todos.filter((t) => t.id !== id);
    renderCurrentView();
  } catch (err) {
    showError(err.message);
  }
}

// ---------------------------------------------------------------
// View: Dashboard
// ---------------------------------------------------------------
function renderDashboard() {
  const total = todos.length;
  const completed = todos.filter((t) => Number(t.completed) === 1).length;
  const active = total - completed;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-completed').textContent = completed;

  const recentList = document.getElementById('dashboard-recent');
  const emptyState = document.getElementById('dashboard-empty');
  recentList.innerHTML = '';

  const recent = [...todos].slice(0, 5);
  emptyState.hidden = recent.length > 0;
  recent.forEach((todo) => recentList.appendChild(buildTodoItem(todo)));
}

// ---------------------------------------------------------------
// View: All Todos
// ---------------------------------------------------------------
function renderTodosView() {
  const list = document.getElementById('todo-list');
  const emptyState = document.getElementById('empty-state');

  const filtered = todos.filter((t) => {
    if (currentFilter === 'active') return !Number(t.completed);
    if (currentFilter === 'completed') return Number(t.completed);
    return true;
  });

  list.innerHTML = '';
  emptyState.hidden = filtered.length > 0;
  filtered.forEach((todo) => list.appendChild(buildTodoItem(todo)));
}

// ---------------------------------------------------------------
// View: Completed
// ---------------------------------------------------------------
function renderCompletedView() {
  const list = document.getElementById('completed-list');
  const emptyState = document.getElementById('completed-empty');
  const completed = todos.filter((t) => Number(t.completed) === 1);

  list.innerHTML = '';
  emptyState.hidden = completed.length > 0;
  completed.forEach((todo) => list.appendChild(buildTodoItem(todo)));
}

// About view is fully static HTML — nothing to render from data.

// ---------------------------------------------------------------
// Router
// ---------------------------------------------------------------
const validRoutes = ['dashboard', 'todos', 'add', 'completed', 'about'];

function currentRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return validRoutes.includes(hash) ? hash : 'dashboard';
}

function renderCurrentView() {
  const route = currentRoute();

  document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
  document.getElementById(`view-${route}`).classList.add('active');

  document.querySelectorAll('.main-nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === route);
  });

  if (route === 'dashboard') renderDashboard();
  if (route === 'todos') renderTodosView();
  if (route === 'completed') renderCompletedView();
  // 'add' and 'about' have no list to render
}

window.addEventListener('hashchange', renderCurrentView);

// ---------------------------------------------------------------
// Form wiring
// ---------------------------------------------------------------

// Quick-add form on the "All Todos" screen
const todoForm = document.getElementById('todo-form');
todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const titleInput = document.getElementById('title');
  const descInput = document.getElementById('description');
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  if (!title) return;
  createTodo(title, description);
  titleInput.value = '';
  descInput.value = '';
});

// Dedicated form on the "Add Todo" screen
const addForm = document.getElementById('add-form');
const addSuccess = document.getElementById('add-success');
addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const titleInput = document.getElementById('add-title');
  const descInput = document.getElementById('add-description');
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  if (!title) return;

  createTodo(title, description, () => {
    titleInput.value = '';
    descInput.value = '';
    addSuccess.hidden = false;
    setTimeout(() => { addSuccess.hidden = true; }, 4000);
  });
});

// Filter buttons on "All Todos"
document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTodosView();
  });
});

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------
(async function init() {
  if (!window.location.hash) {
    window.location.hash = '#/dashboard';
  }
  await loadTodos();
  renderCurrentView();
})();
