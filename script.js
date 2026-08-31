const STORAGE_KEY = 'focusflow-v2';
const focusLength = 25 * 60;
const breakLength = 5 * 60;

const defaultState = {
  mode: 'focus',
  selectedSessionId: 1,
  secondsLeft: focusLength,
  isRunning: false,
  sessions: [
    { id: 1, name: 'Deep Work', duration: 25, type: 'focus' },
    { id: 2, name: 'Quick Break', duration: 5, type: 'break' },
    { id: 3, name: 'Deep Sprint', duration: 50, type: 'focus' }
  ],
  tasks: [
    { id: 1, title: 'Finalize sprint brief', priority: 'High', done: false },
    { id: 2, title: 'Draft meeting notes', priority: 'Medium', done: true },
    { id: 3, title: 'Inbox zero', priority: 'Low', done: false }
  ],
  notes: [
    { id: 1, text: 'Ship a cleaner onboarding flow.', time: '9:14 AM' },
    { id: 2, text: 'Review metrics before 4pm standup.', time: 'Yesterday' }
  ]
};

const state = loadState();

const timeDisplay = document.getElementById('timeDisplay');
const modeTag = document.getElementById('modeTag');
const timerRing = document.getElementById('timerRing');
const toggleTimerBtn = document.getElementById('toggleTimer');
const skipTimerBtn = document.getElementById('skipTimer');
const startSessionButton = document.getElementById('startSessionButton');
const taskInput = document.getElementById('taskInput');
const taskPriority = document.getElementById('taskPriority');
const addTaskBtn = document.getElementById('addTaskBtn');
const addTaskHeaderBtn = document.getElementById('addTaskHeaderBtn');
const noteInput = document.getElementById('noteInput');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const taskList = document.getElementById('taskList');
const noteList = document.getElementById('noteList');
const sessionList = document.getElementById('sessionList');
const totalFocus = document.getElementById('totalFocus');
const finishedTasks = document.getElementById('finishedTasks');
const toastContainer = document.getElementById('toastContainer');
const newSessionBtn = document.getElementById('newSessionBtn');
const saveButton = document.getElementById('saveButton');

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return JSON.parse(JSON.stringify(defaultState));
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      ...JSON.parse(JSON.stringify(defaultState)),
      ...parsed,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : defaultState.tasks,
      notes: Array.isArray(parsed.notes) ? parsed.notes : defaultState.notes,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : defaultState.sessions
    };
  } catch (error) {
    return JSON.parse(JSON.stringify(defaultState));
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

function getSelectedSessionLength() {
  const session = state.sessions.find((item) => item.id === state.selectedSessionId);
  if (!session) return focusLength;
  return session.duration * 60;
}

function getNextDuration() {
  return state.mode === 'focus' ? breakLength : getSelectedSessionLength();
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function syncTimerButtons() {
  const isRunning = Boolean(state.isRunning);
  const label = isRunning ? 'Pause' : 'Start';
  toggleTimerBtn.textContent = label;
  startSessionButton.textContent = isRunning ? 'Pause focus' : 'Start focus';
}

function updateTimerUI() {
  const total = state.mode === 'focus' ? getSelectedSessionLength() : breakLength;
  const progress = total > 0 ? ((total - state.secondsLeft) / total) * 360 : 0;
  const degrees = Math.max(0, Math.min(360, progress));
  const ringColor = state.mode === 'focus' ? '#7c5cff' : '#38c77f';

  timeDisplay.textContent = formatTime(state.secondsLeft);
  timerRing.style.background = `conic-gradient(${ringColor} 0deg ${degrees}deg, rgba(255,255,255,0.08) ${degrees}deg 360deg)`;
  modeTag.textContent = state.mode === 'focus' ? 'Focus' : 'Break';
  modeTag.style.color = state.mode === 'focus' ? '#f4b35c' : '#38c77f';
  syncTimerButtons();
}

function updateSummary() {
  const completed = state.tasks.filter((task) => task.done).length;
  const total = state.tasks.length || 1;
  const focusMinutes = Math.min(180, Math.max(0, Math.round((completed / total) * 90)));
  const focusLabel = `${String(Math.floor(focusMinutes / 60)).padStart(2, '0')}:${String(focusMinutes % 60).padStart(2, '0')}`;

  totalFocus.textContent = focusLabel;
  finishedTasks.textContent = `${completed}/${total}`;
}

function renderSessions() {
  sessionList.innerHTML = '';

  state.sessions.forEach((session) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `session-item ${session.id === state.selectedSessionId ? 'active' : ''}`;
    item.innerHTML = `
      <span class="session-dot ${session.type}"></span>
      <span class="session-copy">
        <strong>${session.name}</strong>
        <small>${session.duration} min · ${session.type}</small>
      </span>
    `;

    item.addEventListener('click', () => {
      state.selectedSessionId = session.id;
      state.mode = session.type;
      state.secondsLeft = session.duration * 60;
      stopTimer();
      persistState();
      renderSessions();
      updateTimerUI();
      showToast(`${session.name} selected`);
    });

    sessionList.appendChild(item);
  });
}

function renderTasks() {
  taskList.innerHTML = '';

  if (state.tasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No tasks yet.';
    taskList.appendChild(empty);
    updateSummary();
    return;
  }

  state.tasks.forEach((task) => {
    const item = document.createElement('div');
    item.className = `task-item ${task.done ? 'done' : ''}`;

    const main = document.createElement('div');
    main.className = 'task-main';

    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'check';
    check.setAttribute('aria-label', `Toggle ${task.title}`);
    check.addEventListener('click', () => {
      task.done = !task.done;
      persistState();
      renderTasks();
      updateSummary();
    });

    const copy = document.createElement('div');
    copy.className = 'task-copy';
    copy.innerHTML = `<strong>${task.title}</strong><small>${task.priority} priority</small>`;

    const badges = document.createElement('div');
    badges.className = 'task-badges';
    const badge = document.createElement('span');
    badge.className = `badge ${task.priority.toLowerCase()}`;
    badge.textContent = task.priority;
    badges.appendChild(badge);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'task-action';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      state.tasks = state.tasks.filter((entry) => entry.id !== task.id);
      persistState();
      renderTasks();
      updateSummary();
      showToast('Task removed');
    });

    main.appendChild(check);
    main.appendChild(copy);
    item.appendChild(main);
    item.appendChild(badges);
    item.appendChild(removeBtn);
    taskList.appendChild(item);
  });

  updateSummary();
}

function renderNotes() {
  noteList.innerHTML = '';

  if (state.notes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No notes saved.';
    noteList.appendChild(empty);
    return;
  }

  state.notes.forEach((note) => {
    const item = document.createElement('div');
    item.className = 'note-item';

    const copy = document.createElement('div');
    copy.className = 'note-copy';
    copy.innerHTML = `<div>${note.text}</div><small>${note.time}</small>`;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'note-remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      state.notes = state.notes.filter((entry) => entry.id !== note.id);
      persistState();
      renderNotes();
      showToast('Note removed');
    });

    item.appendChild(copy);
    item.appendChild(removeBtn);
    noteList.appendChild(item);
  });
}

function stopTimer() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.isRunning = false;
  syncTimerButtons();
  persistState();
}

function toggleTimer() {
  if (state.isRunning) {
    stopTimer();
    showToast('Timer paused');
    return;
  }

  state.isRunning = true;
  syncTimerButtons();
  state.intervalId = setInterval(() => {
    if (state.secondsLeft > 0) {
      state.secondsLeft -= 1;
      updateTimerUI();
      persistState();
      return;
    }

    stopTimer();
    state.mode = state.mode === 'focus' ? 'break' : 'focus';
    state.secondsLeft = state.mode === 'focus' ? getSelectedSessionLength() : breakLength;
    updateTimerUI();
    showToast(`${state.mode === 'focus' ? 'Focus' : 'Break'} ready`);
  }, 1000);

  persistState();
  showToast(`${state.mode === 'focus' ? 'Focus' : 'Break'} started`);
}

function skipSession() {
  stopTimer();
  state.mode = state.mode === 'focus' ? 'break' : 'focus';
  state.secondsLeft = state.mode === 'focus' ? getSelectedSessionLength() : breakLength;
  updateTimerUI();
  persistState();
  showToast('Session skipped');
}

function addTask() {
  const value = taskInput.value.trim();
  if (!value) {
    showToast('Enter a task first');
    taskInput.focus();
    return;
  }

  state.tasks.unshift({
    id: Date.now(),
    title: value,
    priority: taskPriority.value,
    done: false
  });

  taskInput.value = '';
  persistState();
  renderTasks();
  showToast('Task added');
}

function addNote() {
  const value = noteInput.value.trim();
  if (!value) {
    showToast('Write a note first');
    noteInput.focus();
    return;
  }

  state.notes.unshift({
    id: Date.now(),
    text: value,
    time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  });

  noteInput.value = '';
  persistState();
  renderNotes();
  showToast('Note saved');
}

function saveCurrentState() {
  persistState();
  showToast('Progress saved');
}

function createNewSession() {
  const label = `Custom ${state.sessions.length + 1}`;
  const nextId = Date.now();
  state.sessions.unshift({
    id: nextId,
    name: label,
    duration: 25,
    type: 'focus'
  });
  state.selectedSessionId = nextId;
  state.mode = 'focus';
  state.secondsLeft = 25 * 60;
  persistState();
  renderSessions();
  updateTimerUI();
  showToast(`${label} created`);
}

saveButton.addEventListener('click', saveCurrentState);
startSessionButton.addEventListener('click', toggleTimer);
toggleTimerBtn.addEventListener('click', toggleTimer);
skipTimerBtn.addEventListener('click', skipSession);
addTaskBtn.addEventListener('click', addTask);
addTaskHeaderBtn.addEventListener('click', () => taskInput.focus());
taskInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') addTask();
});
saveNoteBtn.addEventListener('click', addNote);
noteInput.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') addNote();
});
newSessionBtn.addEventListener('click', createNewSession);

updateTimerUI();
renderSessions();
renderTasks();
renderNotes();
updateSummary();
