// === State ===
let projects = [];
let currentProject = null;
let isEditMode = false;
let draggedElement = null;
let searchQuery = '';

// === DOM ===
const projectList = document.getElementById('projectList');
const welcomeMessage = document.getElementById('welcomeMessage');
const projectDetails = document.getElementById('projectDetails');
const projectModal = document.getElementById('projectModal');
const toastContainer = document.getElementById('toastContainer');
const searchInput = document.getElementById('searchInput');

// === SVG Icons ===
const icons = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="40" height="40"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="40" height="40"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
};

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
  await initLocale();
  updateLangDropdownActive();
  loadProjects();
  setupEventListeners();
  setupKeyboardShortcuts();
  setupLangSwitcher();
  setupSettings();
  setupAutoUpdater();
});

// === Event Listeners ===
function setupEventListeners() {
  document.getElementById('addProjectBtn').addEventListener('click', () => openModal(false));
  document.getElementById('exportBtn').addEventListener('click', exportSettings);
  document.getElementById('importBtn').addEventListener('click', importSettings);
  document.getElementById('editProjectBtn').addEventListener('click', () => {
    if (currentProject) openModal(true, currentProject);
  });
  document.getElementById('deleteProjectBtn').addEventListener('click', deleteProject);
  document.getElementById('openResultBtn').addEventListener('click', openResultFolder);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
  document.getElementById('saveProjectBtn').addEventListener('click', saveProject);
  document.getElementById('addCommandBtn').addEventListener('click', addCommandInput);
  document.getElementById('settingsBtn').addEventListener('click', openSettings);

  document.getElementById('browseProjectPathBtn').addEventListener('click', async () => {
    const result = await window.electronAPI.selectFolder();
    if (!result.canceled) document.getElementById('modalProjectPath').value = result.path;
  });
  document.getElementById('browseResultPathBtn').addEventListener('click', async () => {
    const result = await window.electronAPI.selectFolder();
    if (!result.canceled) document.getElementById('modalResultPath').value = result.path;
  });

  projectModal.addEventListener('click', (e) => { if (e.target === projectModal) closeModal(); });

  // Search
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderProjectList();
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + N: New project
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      openModal(false);
    }
    // Escape: Close modal
    if (e.key === 'Escape') {
      if (projectModal.classList.contains('show')) closeModal();
    }
    // Cmd/Ctrl + F: Focus search
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

// === Language Switcher ===
function setupLangSwitcher() {
  const langBtn = document.getElementById('langBtn');
  const langDropdown = document.getElementById('langDropdown');

  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdown.classList.toggle('show');
  });

  document.addEventListener('click', () => langDropdown.classList.remove('show'));

  langDropdown.querySelectorAll('.lang-option').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const locale = btn.dataset.locale;
      await setLocale(locale);
      updateLangDropdownActive();
      langDropdown.classList.remove('show');
      // Re-render dynamic content
      renderProjectList();
      if (currentProject) showProjectDetails();
    });
  });
}

function updateLangDropdownActive() {
  document.querySelectorAll('.lang-option').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.locale === currentLocale);
  });
}

// === Data ===
async function loadProjects() {
  const result = await window.electronAPI.getProjects();
  if (result.success) {
    projects = result.data;
    renderProjectList();
  } else {
    showToast(t('msg.loadFailed') + ': ' + result.error, 'error');
  }
}

// === Render ===
function renderProjectList() {
  projectList.innerHTML = '';
  const filtered = searchQuery
    ? projects.filter(p => p.name.toLowerCase().includes(searchQuery) || p.path.toLowerCase().includes(searchQuery))
    : projects;

  if (filtered.length === 0) {
    projectList.innerHTML = `
      <div class="empty-state">
        ${icons.folder}
        <p>${searchQuery ? t('msg.noMatch') : t('msg.noProjects')}</p>
      </div>`;
    return;
  }

  filtered.forEach((project, index) => {
    const item = document.createElement('div');
    item.className = 'project-item';
    item.draggable = true;
    item.dataset.projectId = project.id;
    item.dataset.index = index;
    if (currentProject && currentProject.id === project.id) item.classList.add('active');
    item.innerHTML = `
      <div class="project-item-name">${escapeHtml(project.name)}</div>
      <div class="project-item-path">${escapeHtml(shortenPath(project.path))}</div>
    `;
    item.addEventListener('click', () => selectProject(project));
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragleave', handleDragLeave);
    projectList.appendChild(item);
  });
}

function shortenPath(p) {
  const home = p.replace(/^\/Users\/[^/]+/, '~');
  return home.length > 40 ? '...' + home.slice(-37) : home;
}

// === Drag & Drop ===
function handleDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.project-item').forEach(i => i.classList.remove('drag-over'));
}
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (this !== draggedElement) this.classList.add('drag-over');
  return false;
}
function handleDragLeave() { this.classList.remove('drag-over'); }

async function handleDrop(e) {
  e.stopPropagation();
  if (draggedElement !== this) {
    const draggedId = draggedElement.dataset.projectId;
    const targetId = this.dataset.projectId;
    const draggedIdx = projects.findIndex(p => p.id === draggedId);
    const targetIdx = projects.findIndex(p => p.id === targetId);
    if (draggedIdx !== -1 && targetIdx !== -1) {
      const [removed] = projects.splice(draggedIdx, 1);
      projects.splice(targetIdx, 0, removed);
      await window.electronAPI.reorderProjects(projects.map(p => p.id));
      renderProjectList();
    }
  }
  return false;
}

// === Selection & Details ===
function selectProject(project) {
  currentProject = project;
  renderProjectList();
  showProjectDetails();
}

function showProjectDetails() {
  if (!currentProject) {
    welcomeMessage.style.display = 'flex';
    projectDetails.style.display = 'none';
    return;
  }
  welcomeMessage.style.display = 'none';
  projectDetails.style.display = 'block';
  document.getElementById('projectName').textContent = currentProject.name;
  document.getElementById('projectPath').textContent = currentProject.path;
  document.getElementById('resultPath').textContent = currentProject.result_path;
  renderCommandsDisplay();
}

function renderCommandsDisplay() {
  const display = document.getElementById('commandsDisplay');
  display.innerHTML = '';
  const commands = currentProject.commands || [];
  commands.forEach((command, index) => {
    if (!command && commands.length > 1) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'command-button-wrapper';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'command-input-editable';
    input.value = command || '';
    input.placeholder = 'claude --dangerously-skip-permissions ...';
    input.addEventListener('blur', async () => {
      await window.electronAPI.updateCommand(currentProject.id, index, input.value);
      if (currentProject.commands) currentProject.commands[index] = input.value;
    });
    // Enter to execute
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = input.value.trim();
        if (cmd) executeCommand(cmd);
      }
    });

    const execBtn = document.createElement('button');
    execBtn.className = 'btn-execute-command';
    execBtn.innerHTML = `${icons.play} ${t('action.run')}`;
    execBtn.addEventListener('click', () => {
      const cmd = input.value.trim();
      if (cmd) executeCommand(cmd);
      else showToast(t('msg.emptyCommand'), 'error');
    });

    wrapper.appendChild(input);
    wrapper.appendChild(execBtn);
    display.appendChild(wrapper);
  });
}

// === Modal ===
function openModal(editMode = false, project = null) {
  isEditMode = editMode;
  document.getElementById('modalTitle').textContent = editMode ? t('modal.editProject') : t('modal.newProject');
  if (editMode && project) {
    document.getElementById('modalProjectName').value = project.name;
    document.getElementById('modalProjectPath').value = project.path;
    document.getElementById('modalResultPath').value = project.result_path;
    renderCommandInputs(project.commands || []);
  } else {
    document.getElementById('modalProjectName').value = '';
    document.getElementById('modalProjectPath').value = '';
    document.getElementById('modalResultPath').value = '';
    renderCommandInputs(['claude --dangerously-skip-permissions ']);
  }
  projectModal.classList.add('show');
  // Focus first input after animation
  setTimeout(() => document.getElementById('modalProjectName').focus(), 220);
}

function renderCommandInputs(commands = []) {
  const list = document.getElementById('commandsList');
  list.innerHTML = '';
  if (commands.length === 0) commands = [''];
  commands.forEach(cmd => addCommandInputWithValue(cmd));
}

function addCommandInputWithValue(value = '') {
  const list = document.getElementById('commandsList');
  const item = document.createElement('div');
  item.className = 'command-item';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-input';
  input.placeholder = 'claude --dangerously-skip-permissions ...';
  input.value = value;
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-remove-command';
  removeBtn.innerHTML = icons.x;
  removeBtn.addEventListener('click', () => {
    if (list.children.length > 1) item.remove();
    else showToast(t('msg.minOneCommand'), 'error');
  });
  item.appendChild(input);
  item.appendChild(removeBtn);
  list.appendChild(item);
}

function addCommandInput() {
  addCommandInputWithValue('claude --dangerously-skip-permissions ');
}

function closeModal() { projectModal.classList.remove('show'); }

// === CRUD ===
async function saveProject() {
  const name = document.getElementById('modalProjectName').value.trim();
  const projPath = document.getElementById('modalProjectPath').value.trim();
  const resultPath = document.getElementById('modalResultPath').value.trim();
  const commandInputs = document.querySelectorAll('#commandsList .command-item input');
  const commands = Array.from(commandInputs).map(i => i.value.trim()).filter(c => c.length > 0);

  if (!name || !projPath || commands.length === 0) {
    showToast(t('msg.fillAllFields'), 'error');
    return;
  }

  let result;
  if (isEditMode && currentProject) {
    result = await window.electronAPI.updateProject(currentProject.id, {
      name, path: projPath, commands, result_path: resultPath,
    });
  } else {
    result = await window.electronAPI.addProject({
      name, path: projPath, commands, result_path: resultPath,
    });
  }

  if (result.success) {
    showToast(isEditMode ? t('msg.projectUpdated') : t('msg.projectAdded'), 'success');
    closeModal();
    await loadProjects();
    const toSelect = projects.find(p => p.id === result.data.id);
    if (toSelect) selectProject(toSelect);
  } else {
    showToast(t('msg.saveFailed') + ': ' + result.error, 'error');
  }
}

async function deleteProject() {
  if (!currentProject) return;
  const confirmed = await showConfirm(
    t('msg.deleteTitle'),
    t('msg.deleteConfirm', { name: currentProject.name })
  );
  if (!confirmed) return;

  const result = await window.electronAPI.deleteProject(currentProject.id);
  if (result.success) {
    showToast(t('msg.projectDeleted'), 'success');
    currentProject = null;
    await loadProjects();
    welcomeMessage.style.display = 'flex';
    projectDetails.style.display = 'none';
  } else {
    showToast(t('msg.deleteFailed') + ': ' + result.error, 'error');
  }
}

// === Execute ===
async function executeCommand(command) {
  if (!currentProject || !command) return;
  showToast(t('msg.launching'), 'info');
  const result = await window.electronAPI.executeCommand(currentProject.path, command);
  if (result.success) {
    showToast(t('msg.launched'), 'success');
  } else {
    showToast(t('msg.execFailed') + ': ' + result.error, 'error');
  }
}

async function openResultFolder() {
  if (!currentProject?.result_path) return;
  await window.electronAPI.openFolder(currentProject.result_path);
}

// === Import / Export ===
async function exportSettings() {
  const result = await window.electronAPI.exportProjects();
  if (!result.success) { showToast(t('msg.exportFailed') + ': ' + result.error, 'error'); return; }
  const jsonStr = JSON.stringify(result.data, null, 2);
  const saveResult = await window.electronAPI.saveFile(jsonStr, 'cc-launcher-settings.json');
  if (!saveResult.canceled) showToast(t('msg.exported'), 'success');
}

async function importSettings() {
  const fileResult = await window.electronAPI.openFile();
  if (fileResult.canceled) return;
  let data;
  try { data = JSON.parse(fileResult.data); } catch { showToast(t('msg.invalidJson'), 'error'); return; }
  const result = await window.electronAPI.importProjects(data);
  if (result.success) {
    showToast(t('msg.imported', { imported: result.data.imported, skipped: result.data.skipped }), 'success');
    await loadProjects();
  } else {
    showToast(t('msg.importFailed') + ': ' + result.error, 'error');
  }
}

// === Toast Notification System ===
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const iconMap = { success: icons.check, error: icons.alert, info: icons.info };
  toast.innerHTML = `${iconMap[type] || iconMap.info}<span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

// === Confirm Dialog ===
function showConfirm(title, message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        ${icons.trash}
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="confirm-actions">
          <button class="btn-secondary confirm-cancel">${t('confirm.cancel')}</button>
          <button class="btn-danger confirm-ok" style="background:var(--danger);color:white;border:none;">${t('confirm.delete')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const cleanup = (val) => { overlay.remove(); resolve(val); };
    overlay.querySelector('.confirm-cancel').addEventListener('click', () => cleanup(false));
    overlay.querySelector('.confirm-ok').addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
    // Focus the cancel button for safety
    setTimeout(() => overlay.querySelector('.confirm-cancel').focus(), 50);
  });
}

// === Utilities ===
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// === Settings ===
const settingsModal = document.getElementById('settingsModal');

async function openSettings() {
  // Load current values
  const autoLaunch = await window.electronAPI.getAutoLaunch();
  document.getElementById('autoLaunchToggle').checked = autoLaunch;

  const version = await window.electronAPI.getAppVersion();
  document.getElementById('appVersion').textContent = `v${version}`;

  settingsModal.classList.add('show');
}

function closeSettings() {
  settingsModal.classList.remove('show');
}

function setupSettings() {
  document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
  settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettings(); });

  document.getElementById('autoLaunchToggle').addEventListener('change', async (e) => {
    await window.electronAPI.setAutoLaunch(e.target.checked);
    showToast(e.target.checked ? t('settings.autoLaunchOn') : t('settings.autoLaunchOff'), 'success');
  });

  document.getElementById('checkUpdateBtn').addEventListener('click', async () => {
    const statusEl = document.getElementById('updateStatus');
    const btn = document.getElementById('checkUpdateBtn');
    btn.disabled = true;
    btn.textContent = t('settings.checking');
    statusEl.textContent = t('settings.checking');
    await window.electronAPI.checkForUpdate();
    // Result comes via events
    setTimeout(() => { btn.disabled = false; btn.textContent = t('settings.checkUpdate'); }, 5000);
  });
}

// === Auto Updater Events ===
function setupAutoUpdater() {
  if (!window.electronAPI.onUpdateAvailable) return;

  window.electronAPI.onUpdateAvailable((info) => {
    const statusEl = document.getElementById('updateStatus');
    const btn = document.getElementById('checkUpdateBtn');
    statusEl.textContent = t('settings.newVersion', { version: info.version });
    btn.textContent = t('settings.download');
    btn.disabled = false;
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = t('settings.downloading');
      await window.electronAPI.downloadUpdate();
    };
  });

  window.electronAPI.onUpdateNotAvailable(() => {
    document.getElementById('updateStatus').textContent = t('settings.upToDate');
    const btn = document.getElementById('checkUpdateBtn');
    btn.textContent = t('settings.checkUpdate');
    btn.disabled = false;
  });

  window.electronAPI.onUpdateDownloadProgress((progress) => {
    document.getElementById('updateStatus').textContent = t('settings.downloadProgress', { percent: progress.percent });
  });

  window.electronAPI.onUpdateDownloaded(() => {
    const statusEl = document.getElementById('updateStatus');
    const btn = document.getElementById('checkUpdateBtn');
    statusEl.textContent = t('settings.readyToInstall');
    btn.textContent = t('settings.installRestart');
    btn.disabled = false;
    btn.onclick = () => {
      window.electronAPI.installUpdate();
    };
  });

  window.electronAPI.onUpdateError((msg) => {
    document.getElementById('updateStatus').textContent = t('settings.updateError');
    const btn = document.getElementById('checkUpdateBtn');
    btn.textContent = t('settings.checkUpdate');
    btn.disabled = false;
    console.error('Update error:', msg);
  });
}
