// State Management [ID:269]
let state = {
  theme: 'light',
  timer: {
    mode: 'pomodoro', // 'pomodoro' | 'short' | 'long'
    status: 'IDLE', // 'IDLE' | 'RUNNING' | 'PAUSED'
    duration: 25 * 60, // in seconds
    timeLeft: 25 * 60, // in seconds
    config: {
      pomodoro: 25, // in minutes
      short: 5,
      long: 15
    }
  },
  tasks: [],
  history: [] // { timestamp, duration, mode }
};

// DOM Elements
const htmlEl = document.documentElement;
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

const timerDisplay = document.getElementById('timer-display');
const timerStatus = document.getElementById('timer-status');
const progressBar = document.getElementById('progress-bar');

const btnPomodoro = document.getElementById('btn-pomodoro');
const btnShort = document.getElementById('btn-short');
const btnLong = document.getElementById('btn-long');

const btnStartPause = document.getElementById('btn-start-pause');
const btnReset = document.getElementById('btn-reset');
const btnSkip = document.getElementById('btn-skip');

const inputPomodoro = document.getElementById('input-pomodoro');
const inputShort = document.getElementById('input-short');
const inputLong = document.getElementById('input-long');
const configError = document.getElementById('config-error');

const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const tasksContainer = document.getElementById('tasks-container');

const statCompletedPomodoros = document.getElementById('stat-completed-pomodoros');
const statTotalMinutes = document.getElementById('stat-total-minutes');

// Timer Interval Reference
let timerInterval = null;

// Initialize Application [ID:269]
function init() {
  loadFromLocalStorage();
  applyTheme();
  updateTimerUI();
  renderTasks();
  updateStats();
  setupEventListeners();
}

// Load state from LocalStorage [ID:269]
function loadFromLocalStorage() {
  const savedState = localStorage.getItem('focusflow_state');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      state.theme = parsed.theme || 'light';
      state.timer.config = parsed.timer?.config || { pomodoro: 25, short: 5, long: 15 };
      state.tasks = parsed.tasks || [];
      state.history = parsed.history || [];
      
      // Set initial time based on saved config
      state.timer.duration = state.timer.config[state.timer.mode] * 60;
      state.timer.timeLeft = state.timer.duration;
    } catch (e) {
      console.error("Lỗi khi đọc dữ liệu LocalStorage:", e);
    }
  } else {
    // Detect system theme preference if no saved state [ID:461]
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      state.theme = 'dark';
    }
  }
  
  // Sync inputs with config values
  inputPomodoro.value = state.timer.config.pomodoro;
  inputShort.value = state.timer.config.short;
  inputLong.value = state.timer.config.long;
}

// Save state to LocalStorage [ID:269]
function saveToLocalStorage() {
  localStorage.setItem('focusflow_state', JSON.stringify({
    theme: state.theme,
    timer: { config: state.timer.config },
    tasks: state.tasks,
    history: state.history
  }));
}

// Theme Management [ID:252][ID:461]
function applyTheme() {
  if (state.theme === 'dark') {
    htmlEl.classList.add('dark');
    themeIcon.className = 'fa-solid fa-sun text-lg text-yellow-400';
  } else {
    htmlEl.classList.remove('dark');
    themeIcon.className = 'fa-solid fa-moon text-lg text-slate-600';
  }
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme();
  saveToLocalStorage();
}

// Timer Logic [ID:252][ID:269]
function setMode(mode) {
  if (state.timer.status === 'RUNNING') {
    if (!confirm('Bạn có chắc chắn muốn chuyển chế độ và hủy phiên hiện tại không?')) {
      return;
    }
  }
  
  stopTimer();
  state.timer.mode = mode;
  state.timer.status = 'IDLE';
  state.timer.duration = state.timer.config[mode] * 60;
  state.timer.timeLeft = state.timer.duration;
  
  // Update Mode Switcher UI
  [btnPomodoro, btnShort, btnLong].forEach(btn => {
    btn.className = "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100";
  });
  
  const activeBtn = mode === 'pomodoro' ? btnPomodoro : (mode === 'short' ? btnShort : btnLong);
  activeBtn.className = "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 bg-white dark:bg-slate-800 shadow-sm text-red-500 dark:text-red-400";
  
  updateTimerUI();
}

function updateTimerUI() {
  const minutes = Math.floor(state.timer.timeLeft / 60);
  const seconds = state.timer.timeLeft % 60;
  const displayString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  timerDisplay.textContent = displayString;
  document.title = `${displayString} | FocusFlow`;

  // Update Status Text
  if (state.timer.status === 'RUNNING') {
    timerStatus.textContent = state.timer.mode === 'pomodoro' ? 'Đang tập trung' : 'Đang nghỉ ngơi';
    btnStartPause.textContent = 'Tạm dừng';
    btnStartPause.className = "px-8 py-3.5 rounded-full bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold shadow-lg transition-all transform active:scale-95";
  } else if (state.timer.status === 'PAUSED') {
    timerStatus.textContent = 'Đã tạm dừng';
    btnStartPause.textContent = 'Tiếp tục';
    btnStartPause.className = "px-8 py-3.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold shadow-lg transition-all transform active:scale-95";
  } else {
    timerStatus.textContent = 'Sẵn sàng';
    btnStartPause.textContent = 'Bắt đầu';
    btnStartPause.className = "px-8 py-3.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold shadow-lg transition-all transform active:scale-95";
  }

  // Update Circular Progress Bar
  const radius = 116;
  const circumference = 2 * Math.PI * radius;
  const progress = state.timer.timeLeft / state.timer.duration;
  const offset = circumference * (1 - progress);
  progressBar.style.strokeDashoffset = offset;
}

function startTimer() {
  state.timer.status = 'RUNNING';
  updateTimerUI();
  
  const startTime = Date.now();
  const initialTimeLeft = state.timer.timeLeft;

  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    state.timer.timeLeft = initialTimeLeft - elapsed;

    if (state.timer.timeLeft <= 0) {
      state.timer.timeLeft = 0;
      completeSession();
    }
    updateTimerUI();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function pauseTimer() {
  stopTimer();
  state.timer.status = 'PAUSED';
  updateTimerUI();
}

function resetTimer() {
  stopTimer();
  state.timer.status = 'IDLE';
  state.timer.timeLeft = state.timer.duration;
  updateTimerUI();
}

function skipSession() {
  if (confirm('Bạn có chắc chắn muốn bỏ qua phiên hiện tại?')) {
    stopTimer();
    // Auto switch mode
    if (state.timer.mode === 'pomodoro') {
      setMode('short');
    } else {
      setMode('pomodoro');
    }
  }
}

function completeSession() {
  stopTimer();
  
  // Save to history [ID:269]
  state.history.push({
    timestamp: new Date().toISOString(),
    duration: state.timer.duration,
    mode: state.timer.mode
  });
  
  saveToLocalStorage();
  updateStats();

  // Auto switch mode [ID:252]
  if (state.timer.mode === 'pomodoro') {
    // Check if we should do a long break (every 4 completed pomodoros)
    const completedPomos = state.history.filter(h => h.mode === 'pomodoro').length;
    if (completedPomos > 0 && completedPomos % 4 === 0) {
      setMode('long');
    } else {
      setMode('short');
    }
  } else {
    setMode('pomodoro');
  }
}

// Config Management [ID:252][ID:475]
function handleConfigChange() {
  const pVal = parseInt(inputPomodoro.value);
  const sVal = parseInt(inputShort.value);
  const lVal = parseInt(inputLong.value);

  if (isNaN(pVal) || pVal < 1 || pVal > 180 ||
      isNaN(sVal) || sVal < 1 || sVal > 180 ||
      isNaN(lVal) || lVal < 1 || lVal > 180) {
    configError.classList.remove('hidden');
    return; // Prevent saving invalid values
  }

  configError.classList.add('hidden');
  state.timer.config.pomodoro = pVal;
  state.timer.config.short = sVal;
  state.timer.config.long = lVal;

  saveToLocalStorage();

  // If timer is not running, update current duration
  if (state.timer.status === 'IDLE') {
    state.timer.duration = state.timer.config[state.timer.mode] * 60;
    state.timer.timeLeft = state.timer.duration;
    updateTimerUI();
  }
}

// Task Management [ID:252]
function renderTasks() {
  tasksContainer.innerHTML = '';
  if (state.tasks.length === 0) {
    tasksContainer.innerHTML = `
      <div class="text-center py-8 text-slate-400 dark:text-slate-600">
        <i class="fa-solid fa-clipboard-list text-3xl mb-2 block"></i>
        <span class="text-xs">Chưa có tác vụ nào</span>
      </div>
    `;
    return;
  }

  state.tasks.forEach(task => {
    const taskEl = document.createElement('div');
    taskEl.className = `flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
      task.completed 
        ? 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50 opacity-60' 
        : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
    }`;

    taskEl.innerHTML = `
      <div class="flex items-center space-x-3 flex-1 min-w-0">
        <button onclick="toggleTask('${task.id}')" class="focus:outline-none text-slate-400 hover:text-red-500 transition-colors">
          <i class="${task.completed ? 'fa-solid fa-circle-check text-red-500' : 'fa-regular fa-circle text-lg'}"></i>
        </button>
        <span id="task-text-${task.id}" class="text-sm truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}" onclick="editTask('${task.id}')">
          ${task.text}
        </span>
      </div>
      <div class="flex items-center space-x-1 ml-2">
        <button onclick="editTask('${task.id}')" class="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" title="Sửa">
          <i class="fa-solid fa-pen text-xs"></i>
        </button>
        <button onclick="deleteTask('${task.id}')" class="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" title="Xóa">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    `;
    tasksContainer.appendChild(taskEl);
  });
}

function addTask(text) {
  const newTask = {
    id: Date.now().toString(),
    text: text.trim(),
    completed: false
  };
  state.tasks.push(newTask);
  saveToLocalStorage();
  renderTasks();
}

window.toggleTask = function(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveToLocalStorage();
    renderTasks();
  }
};

window.editTask = function(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    const newText = prompt('Chỉnh sửa tác vụ:', task.text);
    if (newText !== null && newText.trim() !== '') {
      task.text = newText.trim();
      saveToLocalStorage();
      renderTasks();
    }
  }
};

window.deleteTask = function(id)