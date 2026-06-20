const API_BASE = 'http://localhost:4000/api';
const authPanel = document.getElementById('authPanel');
const tasksPanel = document.getElementById('tasksPanel');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authButton = document.getElementById('authButton');
const authPrompt = document.getElementById('authPrompt');
const toggleAuth = document.getElementById('toggleAuth');
const authError = document.getElementById('authError');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const logoutButton = document.getElementById('logoutButton');
const taskForm = document.getElementById('taskForm');
const taskTitle = document.getElementById('taskTitle');
const taskDescription = document.getElementById('taskDescription');
const taskDueDate = document.getElementById('taskDueDate');
const taskStatus = document.getElementById('taskStatus');
const taskError = document.getElementById('taskError');
const taskList = document.getElementById('taskList');
const taskPriority = document.getElementById('taskPriority');
const taskTags = document.getElementById('taskTags');
const cursorEl = document.getElementById('cursor');

// placeholder; will be assigned when cursor logic initializes
let attachInteractiveHover = () => {};

let isRegistering = false;
let token = localStorage.getItem('taskManagerToken');
let editingId = null;

const taskSubmit = document.getElementById('taskSubmit');
const cancelEditBtn = document.getElementById('cancelEdit');
const toastEl = document.getElementById('toast');

function setAuthState(signedIn) {
  authPanel.classList.toggle('hidden', signedIn);
  tasksPanel.classList.toggle('hidden', !signedIn);
}

async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || 'Request failed');
  }
  return body;
}

function updateAuthView() {
  authTitle.textContent = isRegistering ? 'Create account' : 'Sign in';
  authButton.textContent = isRegistering ? 'Register' : 'Login';
  authPrompt.textContent = isRegistering ? 'Already have an account?' : 'Need an account?';
  toggleAuth.textContent = isRegistering ? 'Sign in' : 'Register';
}

function showError(element, message) {
  element.textContent = message || '';
}

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 2600);
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  showError(authError, '');

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const endpoint = isRegistering ? '/auth/register' : '/auth/login';

  try {
    const data = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    token = data.token;
    localStorage.setItem('taskManagerToken', token);
    setAuthState(true);
    fetchTasks();
  } catch (error) {
    showError(authError, error.message);
  }
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : 'No due date';
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function timeAgo(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  const diff = Date.now() - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds >= 0) return `${seconds}s ago`;
  return '';
}

function createTaskCard(task) {
  const card = document.createElement('article');
  card.className = 'task-card';

  const statusBadge = `<span class="status-badge ${task.status}">${task.status.replace('-', ' ')}</span>`;
  const priorityClass = `priority-${(task.priority || 'medium')}`;
  const priorityBadge = `<span class="status-badge ${priorityClass}">${(task.priority || 'medium')}</span>`;

  const tagsHtml = (task.tags || []).map((t) => `<span class="tag">${t}</span>`).join('');

  card.innerHTML = `
    <header>
      <div>
        <h4>${task.title}</h4>
        <p class="task-meta">${statusBadge} ${priorityBadge} · ${formatDate(task.dueDate)} · <small title="Updated ${formatDateTime(task.updatedAt)}">${timeAgo(task.updatedAt)}</small></p>
        <p class="task-meta"><small>Created: ${formatDateTime(task.createdAt)} · ${tagsHtml}</small></p>
      </div>
      <div class="task-actions">
        <button data-action="edit" data-id="${task.id}">Edit</button>
        <button data-action="delete" data-id="${task.id}" class="delete">Delete</button>
      </div>
    </header>
    <p>${task.description || 'No description provided'}</p>
  `;

  return card;
}

async function fetchTasks() {
  try {
    const tasks = await apiRequest('/tasks');
    taskList.innerHTML = '';
    if (!tasks.length) {
      taskList.innerHTML = '<p>No tasks yet. Create one to get started.</p>';
      return;
    }
    tasks.forEach((task, i) => {
      const card = createTaskCard(task);
      taskList.appendChild(card);
      // staggered reveal
      setTimeout(() => card.classList.add('visible'), i * 80);
    });
    // attach hover listeners for interactive elements to make cursor grow
    attachInteractiveHover();
  } catch (error) {
    if (error.message.includes('401') || error.message.includes('Invalid')) {
      signOut();
    } else {
      taskList.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
  }
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  showError(taskError, '');

  const payload = {
    title: taskTitle.value.trim(),
    description: taskDescription.value.trim(),
    dueDate: taskDueDate.value || null,
    status: taskStatus.value,
    priority: taskPriority ? taskPriority.value : 'medium',
    tags: taskTags && taskTags.value ? taskTags.value.split(',').map((t) => t.trim()).filter(Boolean) : [],
  };

  try {
    if (editingId) {
      await apiRequest(`/tasks/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Task updated');
      editingId = null;
      cancelEditBtn.classList.add('hidden');
      taskSubmit.textContent = 'Add task';
    } else {
      await apiRequest('/tasks', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Task created');
    }
    taskForm.reset();
    fetchTasks();
  } catch (error) {
    showError(taskError, error.message);
  }
}

function signOut() {
  token = null;
  localStorage.removeItem('taskManagerToken');
  setAuthState(false);
}

function handleTaskAction(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === 'delete') {
    deleteTask(id);
  } else if (action === 'edit') {
    editTask(id);
  }
}

async function deleteTask(id) {
  try {
    await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
    fetchTasks();
  } catch (error) {
    taskList.insertAdjacentHTML('afterbegin', `<p class="error-message">${error.message}</p>`);
  }
}

async function editTask(id) {
  try {
    const task = await apiRequest(`/tasks/${id}`);
    taskTitle.value = task.title;
    taskDescription.value = task.description;
    taskDueDate.value = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '';
    taskStatus.value = task.status;
    if (taskPriority && task.priority) taskPriority.value = task.priority;
    if (taskTags && task.tags) taskTags.value = (task.tags || []).join(',');
    taskTitle.focus();
    editingId = id;
    taskSubmit.textContent = 'Save changes';
    cancelEditBtn.classList.remove('hidden');
  } catch (error) {
    taskList.insertAdjacentHTML('afterbegin', `<p class="error-message">${error.message}</p>`);
  }
}

function cancelEdit() {
  editingId = null;
  taskForm.reset();
  taskSubmit.textContent = 'Add task';
  cancelEditBtn.classList.add('hidden');
}

function initialize() {
  updateAuthView();
  setAuthState(!!token);
  if (token) {
    fetchTasks();
  }
}

// Advanced cursor: small dot + trailing ring with press/hover effects
if (cursorEl) {
  cursorEl.innerHTML = '<div class="cursor-ring"></div><div class="cursor-dot"></div>';
  const ring = cursorEl.querySelector('.cursor-ring');
  const dot = cursorEl.querySelector('.cursor-dot');

  let mouseX = 0, mouseY = 0;
  let dotX = 0, dotY = 0;
  let ringX = 0, ringY = 0;
  const lerp = (a, b, n) => (1 - n) * a + n * b;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorEl.classList.remove('hidden');
  });

  function animate() {
    dotX = lerp(dotX, mouseX, 0.36);
    dotY = lerp(dotY, mouseY, 0.36);
    ringX = lerp(ringX, mouseX, 0.12);
    ringY = lerp(ringY, mouseY, 0.12);

    dot.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  function onDown() { cursorEl.classList.add('press'); }
  function onUp() { cursorEl.classList.remove('press'); }
  window.addEventListener('mousedown', onDown);
  window.addEventListener('mouseup', onUp);

  function onEnterInteractive() { cursorEl.classList.add('hover'); }
  function onLeaveInteractive() { cursorEl.classList.remove('hover'); }

  attachInteractiveHover = function attachInteractiveHoverImpl() {
    document.querySelectorAll('button, a, .link-button, .primary-button').forEach((el) => {
      el.addEventListener('mouseenter', onEnterInteractive);
      el.addEventListener('mouseleave', onLeaveInteractive);
      // press visual feedback
      el.addEventListener('mousedown', () => { cursorEl.classList.add('press'); });
      el.addEventListener('mouseup', () => { cursorEl.classList.remove('press'); });
    });
  };

  // initial attach
  attachInteractiveHover();

  // hide cursor on touch devices
  window.addEventListener('touchstart', () => cursorEl.classList.add('hidden'));
}

authForm.addEventListener('submit', handleAuthSubmit);
toggleAuth.addEventListener('click', () => {
  isRegistering = !isRegistering;
  updateAuthView();
});
logoutButton.addEventListener('click', signOut);
taskForm.addEventListener('submit', handleTaskSubmit);
taskList.addEventListener('click', handleTaskAction);
cancelEditBtn.addEventListener('click', cancelEdit);

initialize();
