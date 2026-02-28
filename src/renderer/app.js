// === State ===
let projects = [];
let currentProject = null;
let isEditMode = false;
let draggedElement = null;
let searchQuery = '';
let commandScheduleCache = {}; // projectId → { cmdIndex: schedule }

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
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 17v5"/><path d="M9 11V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7"/><path d="M5 17h14"/><path d="M7 11l-2 6h14l-2-6"/></svg>',
  unpin: '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 17v5"/><path d="M9 11V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7"/><path d="M5 17h14"/><path d="M7 11l-2 6h14l-2-6"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3L2 6"/><path d="M22 6l-3-3"/></svg>',
  terminal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  silent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
};

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
  await initLocale();
  loadProjects();
  setupEventListeners();
  setupKeyboardShortcuts();
  setupSettings();
  setupAutoUpdater();
  setupScheduleEvents();
});

// === Event Listeners ===
function setupEventListeners() {
  document.getElementById('addProjectBtn').addEventListener('click', () => openModal(false));

  // Drag directory onto add button → new project with that path
  const addBtn = document.getElementById('addProjectBtn');
  addBtn.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    addBtn.classList.add('drag-active');
  });
  addBtn.addEventListener('dragleave', () => addBtn.classList.remove('drag-active'));
  addBtn.addEventListener('drop', async (e) => {
    e.preventDefault();
    addBtn.classList.remove('drag-active');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const filePath = files[0].path;
      if (!filePath) return;
      const pathInfo = await window.electronAPI.checkPathType(filePath);
      if (!pathInfo.exists) return;

      if (pathInfo.isDirectory) {
        // 文件夹 → 填入项目路径
        openModal(false);
        setTimeout(() => {
          document.getElementById('modalProjectPath').value = filePath;
          const dirName = filePath.split('/').pop() || filePath;
          document.getElementById('modalProjectName').value = dirName;
        }, 50);
      } else if (pathInfo.isFile) {
        // 文件 → 作为可执行命令添加
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
        const fileName = filePath.split('/').pop() || filePath;
        openModal(false);
        setTimeout(() => {
          document.getElementById('modalProjectPath').value = dirPath;
          document.getElementById('modalProjectName').value = fileName;
          renderCommandInputs([filePath], ['']);
        }, 50);
      }
    }
  });
  // Import/Export now in settings modal — no sidebar buttons
  document.getElementById('editProjectBtn').addEventListener('click', () => {
    if (currentProject) openModal(true, currentProject);
  });
  document.getElementById('deleteProjectBtn').addEventListener('click', deleteProject);
  document.getElementById('openOutputBtn').addEventListener('click', openOutputFolder);
  document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
  document.getElementById('saveProjectBtn').addEventListener('click', saveProject);
  document.getElementById('addCommandBtn').addEventListener('click', addCommandInput);
  document.getElementById('addUrlBtn').addEventListener('click', addUrlInput);
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('scheduleLogsBtn').addEventListener('click', openScheduleLogsModal);

  document.getElementById('browseProjectPathBtn').addEventListener('click', async () => {
    const result = await window.electronAPI.selectFolder();
    if (!result.canceled) document.getElementById('modalProjectPath').value = result.path;
  });
  document.getElementById('browseOutputPathBtn').addEventListener('click', async () => {
    const result = await window.electronAPI.selectFolder();
    if (!result.canceled) document.getElementById('modalOutputPath').value = result.path;
  });


  // Search
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderProjectList();
  });

  // Search history
  const searchHistoryDropdown = document.getElementById('searchHistoryDropdown');
  let searchHistoryCache = [];

  searchInput.addEventListener('focus', async () => {
    searchHistoryCache = await window.electronAPI.getSearchHistory() || [];
    renderSearchHistory();
  });

  searchInput.addEventListener('blur', () => {
    // Delay hide to allow click on items
    setTimeout(() => { searchHistoryDropdown.style.display = 'none'; }, 150);
  });

  searchInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const val = searchInput.value.trim();
      if (val) {
        // Save to history (dedup, newest first, max 10)
        searchHistoryCache = searchHistoryCache.filter(h => h !== val);
        searchHistoryCache.unshift(val);
        if (searchHistoryCache.length > 10) searchHistoryCache.length = 10;
        await window.electronAPI.saveSearchHistory(searchHistoryCache);
        searchHistoryDropdown.style.display = 'none';
      }
    }
  });

  function renderSearchHistory() {
    if (searchHistoryCache.length === 0) {
      searchHistoryDropdown.style.display = 'none';
      return;
    }
    searchHistoryDropdown.innerHTML = '';
    searchHistoryCache.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'search-history-item';
      const text = document.createElement('span');
      text.className = 'search-history-text';
      text.textContent = item;
      text.addEventListener('mousedown', (e) => {
        e.preventDefault();
        searchInput.value = item;
        searchQuery = item.toLowerCase();
        renderProjectList();
        searchHistoryDropdown.style.display = 'none';
      });
      const delBtn = document.createElement('button');
      delBtn.className = 'search-history-del';
      delBtn.innerHTML = icons.x;
      delBtn.addEventListener('mousedown', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        searchHistoryCache.splice(idx, 1);
        await window.electronAPI.saveSearchHistory(searchHistoryCache);
        renderSearchHistory();
      });
      row.appendChild(text);
      row.appendChild(delBtn);
      searchHistoryDropdown.appendChild(row);
    });
    searchHistoryDropdown.style.display = 'block';
  }
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
      if (settingsModal.classList.contains('show')) closeSettings();
      else if (projectModal.classList.contains('show')) closeModal();
    }
    // Enter: Save in project modal
    if (e.key === 'Enter' && projectModal.classList.contains('show')) {
      e.preventDefault();
      saveProject();
    }
    // Cmd/Ctrl + S: Quick export settings
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      quickExportSettings();
    }
    // Cmd/Ctrl + H: Hide window
    if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
      e.preventDefault();
      window.electronAPI.hideWindow();
    }
    // Cmd/Ctrl + M: Minimize window
    if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
      e.preventDefault();
      window.electronAPI.minimizeWindow();
    }
    // Cmd/Ctrl + F: Focus search
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      searchInput.focus();
    }
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

  const pinned = filtered.filter(p => p.pinned);
  const unpinned = filtered.filter(p => !p.pinned);

  // Pinned grid
  if (pinned.length > 0) {
    const grid = document.createElement('div');
    grid.className = 'pinned-grid';
    let pinnedDraggedEl = null;

    pinned.forEach((project) => {
      const item = document.createElement('div');
      item.className = 'pinned-item';
      if (currentProject && currentProject.id === project.id) item.classList.add('active');
      item.title = project.name;
      item.dataset.projectId = project.id;
      item.draggable = true;
      item.textContent = project.name;
      item.addEventListener('click', () => selectProject(project));

      // Drag & drop for pinned items
      item.addEventListener('dragstart', (e) => {
        pinnedDraggedEl = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/pinned', project.id);
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        grid.querySelectorAll('.pinned-item').forEach(i => i.classList.remove('drag-over'));
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (pinnedDraggedEl && pinnedDraggedEl !== item) item.classList.add('drag-over');
      });
      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
      item.addEventListener('drop', async (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (!pinnedDraggedEl || pinnedDraggedEl === item) return;
        const draggedId = pinnedDraggedEl.dataset.projectId;
        const targetId = item.dataset.projectId;
        const draggedIdx = projects.findIndex(p => p.id === draggedId);
        const targetIdx = projects.findIndex(p => p.id === targetId);
        if (draggedIdx !== -1 && targetIdx !== -1) {
          const [removed] = projects.splice(draggedIdx, 1);
          projects.splice(targetIdx, 0, removed);
          await window.electronAPI.reorderProjects(projects.map(p => p.id));
          renderProjectList();
        }
      });

      grid.appendChild(item);
    });
    projectList.appendChild(grid);
  }

  // Normal list
  unpinned.forEach((project, index) => {
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
  document.getElementById('projectPath').textContent = currentProject.path || '';
  document.getElementById('outputPath').textContent = currentProject.result_path || '';

  // Hide path sections when empty
  const pathSection = document.getElementById('projectPath').closest('.info-item');
  if (pathSection) pathSection.style.display = currentProject.path ? '' : 'none';

  // Pin button in header
  let pinBtn = document.getElementById('pinProjectBtn');
  if (!pinBtn) {
    pinBtn = document.createElement('button');
    pinBtn.id = 'pinProjectBtn';
    pinBtn.className = 'btn-secondary';
    document.querySelector('.action-buttons').insertBefore(pinBtn, document.getElementById('editProjectBtn'));
  }
  const isPinned = currentProject.pinned;
  pinBtn.innerHTML = `${isPinned ? icons.unpin : icons.pin}<span>${isPinned ? t('pin.unpin') : t('pin.pin')}</span>`;
  pinBtn.onclick = async () => {
    const result = await window.electronAPI.togglePin(currentProject.id);
    if (result.success) {
      currentProject.pinned = result.data.pinned;
      const idx = projects.findIndex(p => p.id === currentProject.id);
      if (idx !== -1) projects[idx].pinned = currentProject.pinned;
      await loadProjects();
      const updated = projects.find(p => p.id === currentProject.id);
      if (updated) { currentProject = updated; showProjectDetails(); }
      renderProjectList();
    }
  };
  // Hide output path section if empty
  const outputSection = document.getElementById('outputPathSection');
  if (outputSection) outputSection.style.display = currentProject.result_path ? '' : 'none';
  // Load schedule cache for current project then render commands
  loadScheduleCacheForProject(currentProject.id).then(() => {
    renderCommandsDisplay();
    renderUrlBlocks();
  });
}

function renderCommandsDisplay() {
  const display = document.getElementById('commandsDisplay');
  display.innerHTML = '';
  const commands = currentProject.commands || [];
  const names = currentProject.command_names || [];
  const modes = currentProject.command_modes || [];
  let firstVarInput = null;
  let firstVarPos = -1;

  commands.forEach((command, index) => {
    if (!command && commands.length > 1) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'command-button-wrapper';
    wrapper.draggable = true;
    wrapper.dataset.cmdIndex = index;

    const mode = modes[index] || 'terminal';

    // Drag handle
    const handle = document.createElement('span');
    handle.className = 'cmd-drag-handle';
    handle.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'command-input-editable';
    input.value = command || '';
    input.placeholder = 'claude --dangerously-skip-permissions ...';
    // Enter to execute
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = input.value.trim();
        if (cmd) executeCommand(cmd, index);
      }
    });

    // Track first {} variable position
    const varMatch = (command || '').indexOf('{}');
    if (varMatch !== -1 && !firstVarInput) {
      firstVarInput = input;
      firstVarPos = varMatch;
    }

    // Command name input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'command-name-input';
    nameInput.value = names[index] || '';
    nameInput.placeholder = t('details.cmdName') || 'Name';

    // Mode toggle button (terminal ↔ silent)
    const modeBtn = document.createElement('button');
    modeBtn.className = 'btn-mode-toggle' + (mode === 'silent' ? ' mode-silent' : '');
    modeBtn.innerHTML = mode === 'silent' ? icons.silent : icons.terminal;
    modeBtn.title = mode === 'silent' ? t('mode.clickToTerminal') : t('mode.clickToSilent');
    modeBtn.addEventListener('click', async () => {
      const newMode = mode === 'silent' ? 'terminal' : 'silent';
      const newModes = [...(currentProject.command_modes || [])];
      while (newModes.length <= index) newModes.push('terminal');
      newModes[index] = newMode;
      currentProject.command_modes = newModes;
      await window.electronAPI.updateProject(currentProject.id, { command_modes: newModes });
      renderCommandsDisplay();
    });

    // Schedule (闹钟) button
    const cachedSchedule = commandScheduleCache[currentProject.id]?.[index];
    const scheduleBtn = document.createElement('button');
    scheduleBtn.className = 'btn-schedule-command';
    scheduleBtn.innerHTML = icons.clock;
    scheduleBtn.title = t('schedule.title') || 'Schedule';
    if (cachedSchedule && cachedSchedule.enabled) {
      scheduleBtn.classList.add('schedule-active');
    }
    scheduleBtn.addEventListener('click', () => {
      openScheduleDialog(currentProject, index, input.value.trim(), names[index] || '');
    });

    const execBtn = document.createElement('button');
    execBtn.className = 'btn-execute-command';
    if (mode === 'silent') {
      execBtn.innerHTML = `${icons.silent} ${t('action.runSilent')}`;
      execBtn.classList.add('btn-execute-silent');
    } else {
      execBtn.innerHTML = `${icons.play} ${t('action.run')}`;
    }
    execBtn.addEventListener('click', () => {
      const cmd = input.value.trim();
      if (cmd) executeCommand(cmd, index);
      else showToast(t('msg.emptyCommand'), 'error');
    });

    wrapper.appendChild(handle);
    wrapper.appendChild(input);
    wrapper.appendChild(nameInput);
    wrapper.appendChild(modeBtn);
    wrapper.appendChild(scheduleBtn);
    wrapper.appendChild(execBtn);
    display.appendChild(wrapper);
    setupCommandInputDragDrop(input);

    // Command row drag & drop reorder
    wrapper.addEventListener('dragstart', (e) => {
      if (e.target !== wrapper) { e.preventDefault(); return; }
      wrapper.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    });
    wrapper.addEventListener('dragend', () => {
      wrapper.classList.remove('dragging');
      display.querySelectorAll('.command-button-wrapper').forEach(w => w.classList.remove('cmd-drag-over'));
    });
    wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const dragging = display.querySelector('.dragging');
      if (dragging && dragging !== wrapper) wrapper.classList.add('cmd-drag-over');
    });
    wrapper.addEventListener('dragleave', () => wrapper.classList.remove('cmd-drag-over'));
    wrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      wrapper.classList.remove('cmd-drag-over');
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
      const toIdx = parseInt(wrapper.dataset.cmdIndex);
      if (isNaN(fromIdx) || isNaN(toIdx) || fromIdx === toIdx) return;
      const cmds = [...currentProject.commands];
      const [moved] = cmds.splice(fromIdx, 1);
      cmds.splice(toIdx, 0, moved);
      const nms = [...(currentProject.command_names || [])];
      const [movedName] = nms.splice(fromIdx, 1);
      nms.splice(toIdx, 0, movedName || '');
      const mds = [...(currentProject.command_modes || [])];
      const [movedMode] = mds.splice(fromIdx, 1);
      mds.splice(toIdx, 0, movedMode || 'terminal');
      currentProject.commands = cmds;
      currentProject.command_names = nms;
      currentProject.command_modes = mds;
      window.electronAPI.updateProject(currentProject.id, { commands: cmds, command_names: nms, command_modes: mds });
      renderCommandsDisplay();
    });

    // Only handle drag on the handle, not the inputs
    handle.addEventListener('mousedown', () => { wrapper.draggable = true; });
    input.addEventListener('mousedown', () => { wrapper.draggable = false; });
    nameInput.addEventListener('mousedown', () => { wrapper.draggable = false; });
  });

  // Focus first {} variable
  if (firstVarInput) {
    setTimeout(() => {
      firstVarInput.focus();
      firstVarInput.setSelectionRange(firstVarPos, firstVarPos + 2);
    }, 100);
  }
}

// === URL Blocks (Details Page) ===
function renderUrlBlocks() {
  const urls = currentProject?.urls || [];
  // Remove existing url section
  let urlSection = document.getElementById('urlBlocksSection');
  if (urlSection) urlSection.remove();

  if (urls.length === 0) return;

  const detailsContent = document.querySelector('.details-content');
  urlSection = document.createElement('div');
  urlSection.id = 'urlBlocksSection';
  urlSection.className = 'info-item';
  const label = document.createElement('label');
  label.textContent = t('url.title') || 'URLs';
  const container = document.createElement('div');
  container.className = 'url-blocks';
  urls.forEach((u) => {
    const block = document.createElement('div');
    block.className = 'url-block';
    block.title = u.url;
    block.textContent = u.name || extractDomain(u.url);
    block.addEventListener('click', () => {
      window.electronAPI.openUrl(u.url);
    });
    container.appendChild(block);
  });
  urlSection.appendChild(label);
  urlSection.appendChild(container);
  detailsContent.appendChild(urlSection);
}

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '').split('.')[0];
  } catch {
    return url.slice(0, 10);
  }
}

// === Modal ===
function openModal(editMode = false, project = null) {
  isEditMode = editMode;
  document.getElementById('modalTitle').textContent = editMode ? t('modal.editProject') : t('modal.newProject');
  if (editMode && project) {
    document.getElementById('modalProjectName').value = project.name;
    document.getElementById('modalProjectPath').value = project.path;
    document.getElementById('modalOutputPath').value = project.result_path;
    renderCommandInputs(project.commands || [], project.command_names || [], project.command_modes || []);
    renderUrlInputs(project.urls || []);
  } else {
    document.getElementById('modalProjectName').value = '';
    document.getElementById('modalProjectPath').value = '';
    document.getElementById('modalOutputPath').value = '';
    renderCommandInputs(['claude --dangerously-skip-permissions '], [''], ['terminal']);
    renderUrlInputs([]);
  }
  projectModal.classList.add('show');
  // Focus first input after animation
  setTimeout(() => document.getElementById('modalProjectName').focus(), 220);
}

function renderCommandInputs(commands = [], names = [], modes = []) {
  const list = document.getElementById('commandsList');
  list.innerHTML = '';
  if (commands.length === 0) { commands = ['']; names = ['']; modes = ['terminal']; }
  commands.forEach((cmd, i) => addCommandInputWithValue(cmd, names[i] || '', modes[i] || 'terminal'));
}

function addCommandInputWithValue(value = '', name = '', mode = 'terminal') {
  const list = document.getElementById('commandsList');
  const item = document.createElement('div');
  item.className = 'command-item';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-input';
  input.placeholder = 'claude --dangerously-skip-permissions ...';
  input.value = value;
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'form-input command-name-field';
  nameInput.placeholder = t('modal.cmdName') || 'Name';
  nameInput.value = name;

  // Mode toggle for modal
  const modeBtn = document.createElement('button');
  modeBtn.type = 'button';
  modeBtn.className = 'btn-mode-toggle-modal' + (mode === 'silent' ? ' mode-silent' : '');
  modeBtn.innerHTML = mode === 'silent' ? icons.silent : icons.terminal;
  modeBtn.title = mode === 'silent' ? t('mode.clickToTerminal') : t('mode.clickToSilent');
  modeBtn.dataset.mode = mode;
  modeBtn.addEventListener('click', () => {
    const cur = modeBtn.dataset.mode;
    const newMode = cur === 'silent' ? 'terminal' : 'silent';
    modeBtn.dataset.mode = newMode;
    modeBtn.innerHTML = newMode === 'silent' ? icons.silent : icons.terminal;
    modeBtn.title = newMode === 'silent' ? t('mode.clickToTerminal') : t('mode.clickToSilent');
    modeBtn.classList.toggle('mode-silent', newMode === 'silent');
  });

  const browseBtn = document.createElement('button');
  browseBtn.type = 'button';
  browseBtn.className = 'btn-browse-cmd';
  browseBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
  browseBtn.title = t('modal.browseFile') || 'Browse file';
  browseBtn.addEventListener('click', async () => {
    const projectPath = document.getElementById('modalProjectPath').value.trim();
    const result = await window.electronAPI.selectFile(projectPath || undefined);
    if (!result.canceled && result.path) {
      let filePath = result.path;
      if (projectPath && filePath.startsWith(projectPath + '/')) {
        filePath = './' + filePath.slice(projectPath.length + 1);
      }
      input.value = filePath;
      input.focus();
    }
  });
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-remove-command';
  removeBtn.innerHTML = icons.x;
  removeBtn.addEventListener('click', () => {
    item.remove();
  });
  item.appendChild(input);
  item.appendChild(nameInput);
  item.appendChild(modeBtn);
  item.appendChild(browseBtn);
  item.appendChild(removeBtn);
  list.appendChild(item);
}

function addCommandInput() {
  addCommandInputWithValue('claude --dangerously-skip-permissions ', '', 'terminal');
}

// === URL Inputs ===
function renderUrlInputs(urls = []) {
  const list = document.getElementById('urlsList');
  list.innerHTML = '';
  urls.forEach(u => addUrlInputWithValue(u.url || '', u.name || ''));
}

function addUrlInputWithValue(url = '', name = '') {
  const list = document.getElementById('urlsList');
  const item = document.createElement('div');
  item.className = 'command-item';
  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.className = 'form-input';
  urlInput.placeholder = 'https://...';
  urlInput.value = url;
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'form-input command-name-field';
  nameInput.placeholder = t('url.name') || 'Name';
  nameInput.value = name;
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-remove-command';
  removeBtn.innerHTML = icons.x;
  removeBtn.addEventListener('click', () => item.remove());
  item.appendChild(urlInput);
  item.appendChild(nameInput);
  item.appendChild(removeBtn);
  list.appendChild(item);
}

function addUrlInput() {
  addUrlInputWithValue('', '');
}

function closeModal() { projectModal.classList.remove('show'); }

// === CRUD ===
async function saveProject() {
  const name = document.getElementById('modalProjectName').value.trim();
  const projPath = document.getElementById('modalProjectPath').value.trim();
  const outputPath = document.getElementById('modalOutputPath').value.trim();
  const commandItems = document.querySelectorAll('#commandsList .command-item');
  const commands = [];
  const commandNames = [];
  const commandModes = [];
  commandItems.forEach(item => {
    const inputs = item.querySelectorAll('input');
    const cmd = inputs[0].value.trim();
    const cmdName = inputs[1] ? inputs[1].value.trim() : '';
    const modeBtn = item.querySelector('.btn-mode-toggle-modal');
    const cmdMode = modeBtn ? modeBtn.dataset.mode : 'terminal';
    if (cmd.length > 0) {
      commands.push(cmd);
      commandNames.push(cmdName);
      commandModes.push(cmdMode);
    }
  });

  if (!name) {
    showToast(t('msg.nameRequired'), 'error');
    return;
  }

  // Collect URLs
  const urlItems = document.querySelectorAll('#urlsList .command-item');
  const urls = [];
  urlItems.forEach(item => {
    const inputs = item.querySelectorAll('input');
    const urlVal = inputs[0].value.trim();
    const urlName = inputs[1] ? inputs[1].value.trim() : '';
    if (urlVal) urls.push({ url: urlVal, name: urlName });
  });

  let result;
  if (isEditMode && currentProject) {
    result = await window.electronAPI.updateProject(currentProject.id, {
      name, path: projPath, commands, command_names: commandNames, command_modes: commandModes, result_path: outputPath, urls,
    });
  } else {
    result = await window.electronAPI.addProject({
      name, path: projPath, commands, command_names: commandNames, command_modes: commandModes, result_path: outputPath, urls,
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
async function executeCommand(command, commandIndex = 0) {
  if (!currentProject || !command) return;
  const modes = currentProject.command_modes || [];
  const names = currentProject.command_names || [];
  const mode = modes[commandIndex] || 'terminal';
  const projectName = currentProject.name;
  const commandName = names[commandIndex] || '';

  if (mode === 'silent') {
    showToast(t('msg.executingSilent'), 'info');
    const result = await window.electronAPI.executeCommandSilent(
      currentProject.path, command, projectName, commandName
    );
    if (result.success) {
      showToast(t('msg.silentComplete', { duration: Math.round((result.durationMs || 0) / 1000) }), 'success');
    } else {
      showToast(t('msg.silentFailed') + ': ' + (result.error || result.status), 'error');
    }
  } else {
    showToast(t('msg.launching'), 'info');
    const result = await window.electronAPI.executeCommand(
      currentProject.path, command, projectName, commandName
    );
    if (result.success) {
      showToast(t('msg.launched'), 'success');
    } else {
      showToast(t('msg.execFailed') + ': ' + result.error, 'error');
    }
  }
}

async function openOutputFolder() {
  if (!currentProject?.result_path) return;
  await window.electronAPI.openFolder(currentProject.result_path);
}

// === Import / Export ===
async function quickExportSettings() {
  const result = await window.electronAPI.exportProjects();
  if (!result.success) { showToast(t('msg.exportFailed') + ': ' + result.error, 'error'); return; }
  const jsonStr = JSON.stringify(result.data, null, 2);
  const quickResult = await window.electronAPI.quickSaveFile(jsonStr);
  if (quickResult.success) {
    showToast(t('msg.exported'), 'success');
  } else {
    // 没有上次路径或写入失败，走弹窗流程
    const saveResult = await window.electronAPI.saveFile(jsonStr, 'cc-launcher-settings.json');
    if (!saveResult.canceled) showToast(t('msg.exported'), 'success');
  }
}

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
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); cleanup(true); }
      if (e.key === 'Escape') { e.preventDefault(); cleanup(false); }
    });
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

  // Set current language
  document.getElementById('langSelect').value = currentLocale;

  // Terminal
  const terminal = await window.electronAPI.getTerminal();
  document.getElementById('terminalSelect').value = terminal;

  // Global shortcut
  const shortcut = await window.electronAPI.getGlobalShortcut();
  document.getElementById('shortcutInput').value = shortcut || '';

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

  // Language select
  document.getElementById('langSelect').addEventListener('change', async (e) => {
    await setLocale(e.target.value);
    renderProjectList();
    if (currentProject) showProjectDetails();
  });

  // Terminal select
  document.getElementById('terminalSelect').addEventListener('change', async (e) => {
    await window.electronAPI.setTerminal(e.target.value);
    showToast(t('settings.terminalSet'), 'success');
  });

  // Global shortcut recording
  const shortcutInput = document.getElementById('shortcutInput');
  let recordingShortcut = false;

  shortcutInput.addEventListener('click', () => {
    recordingShortcut = true;
    shortcutInput.value = t('settings.pressKeys') || 'Press keys...';
    shortcutInput.classList.add('recording');
  });

  shortcutInput.addEventListener('blur', () => {
    if (recordingShortcut) {
      recordingShortcut = false;
      shortcutInput.classList.remove('recording');
      window.electronAPI.getGlobalShortcut().then(s => {
        shortcutInput.value = s || '';
      });
    }
  });

  // Show held modifiers in real-time
  shortcutInput.addEventListener('keydown', async (e) => {
    if (!recordingShortcut) return;
    e.preventDefault();
    e.stopPropagation();

    const modifiers = [];
    if (e.metaKey || e.ctrlKey) modifiers.push('⌘');
    if (e.altKey) modifiers.push('⌥');
    if (e.shiftKey) modifiers.push('⇧');

    // If only modifiers held, show them as hint
    if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
      shortcutInput.value = modifiers.length ? modifiers.join('') + ' + ?' : (t('settings.pressKeys') || 'Press keys...');
      return;
    }

    // Build accelerator from e.code (immune to Option key character remapping)
    const parts = [];
    if (e.metaKey || e.ctrlKey) parts.push('CommandOrControl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    if (parts.length === 0) return; // Must have at least one modifier

    let key = '';
    const code = e.code;
    if (code.startsWith('Key')) key = code.slice(3); // KeyA → A
    else if (code.startsWith('Digit')) key = code.slice(5); // Digit1 → 1
    else if (code === 'Space') key = 'Space';
    else if (code === 'Backspace') key = 'Backspace';
    else if (code === 'Delete') key = 'Delete';
    else if (code === 'Enter') key = 'Return';
    else if (code === 'Tab') key = 'Tab';
    else if (code === 'Escape') key = 'Escape';
    else if (code === 'ArrowUp') key = 'Up';
    else if (code === 'ArrowDown') key = 'Down';
    else if (code === 'ArrowLeft') key = 'Left';
    else if (code === 'ArrowRight') key = 'Right';
    else if (code.startsWith('F') && !isNaN(code.slice(1))) key = code; // F1-F12
    else if (code === 'Minus') key = '-';
    else if (code === 'Equal') key = '=';
    else if (code === 'BracketLeft') key = '[';
    else if (code === 'BracketRight') key = ']';
    else if (code === 'Backslash') key = '\\';
    else if (code === 'Semicolon') key = ';';
    else if (code === 'Quote') key = "'";
    else if (code === 'Comma') key = ',';
    else if (code === 'Period') key = '.';
    else if (code === 'Slash') key = '/';
    else if (code === 'Backquote') key = '`';
    else key = e.key.length === 1 ? e.key.toUpperCase() : e.key;

    if (!key) return;
    parts.push(key);

    const accelerator = parts.join('+');
    recordingShortcut = false;
    shortcutInput.classList.remove('recording');

    const result = await window.electronAPI.setGlobalShortcut(accelerator);
    if (result.success) {
      shortcutInput.value = accelerator;
      showToast(t('settings.shortcutSet'), 'success');
    } else if (result.error === 'conflict') {
      showToast(t('settings.shortcutConflict'), 'error');
      const s = await window.electronAPI.getGlobalShortcut();
      shortcutInput.value = s || '';
    } else {
      showToast(t('settings.shortcutFailed') + ': ' + result.error, 'error');
      const s = await window.electronAPI.getGlobalShortcut();
      shortcutInput.value = s || '';
    }
  });

  document.getElementById('clearShortcutBtn').addEventListener('click', async () => {
    await window.electronAPI.setGlobalShortcut('');
    document.getElementById('shortcutInput').value = '';
    showToast(t('settings.shortcutCleared'), 'success');
  });

  // Import / Export (now in settings)
  document.getElementById('exportBtn').addEventListener('click', exportSettings);
  document.getElementById('importBtn').addEventListener('click', importSettings);

  // Open data directory
  document.getElementById('openDataDirBtn').addEventListener('click', async () => {
    await window.electronAPI.openDataDir();
  });

  // Reset data
  document.getElementById('resetDataBtn').addEventListener('click', async () => {
    const confirmed = await showConfirm(
      t('settings.resetDataTitle'),
      t('settings.resetDataConfirm')
    );
    if (!confirmed) return;
    const result = await window.electronAPI.resetData();
    if (result.success) {
      showToast(t('settings.resetDataDone'), 'success');
      closeSettings();
      currentProject = null;
      await loadProjects();
      welcomeMessage.style.display = 'flex';
      projectDetails.style.display = 'none';
    }
  });

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

// === Command Input: Paste Image & Drag File Support ===
function setupCommandInputDragDrop(input) {
  // Drag file into command input → append file path
  input.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    input.classList.add('drag-highlight');
  });
  input.addEventListener('dragleave', () => {
    input.classList.remove('drag-highlight');
  });
  input.addEventListener('drop', (e) => {
    e.preventDefault();
    input.classList.remove('drag-highlight');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const paths = Array.from(files).map(f => f.path).filter(Boolean);
      if (paths.length > 0) {
        const cur = input.value.trim();
        input.value = cur ? cur + ' ' + paths.join(' ') : paths.join(' ');
        input.dispatchEvent(new Event('input'));
      }
    }
  });

  // Paste image → insert as base64 data URI or file path
  input.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onload = () => {
          const cur = input.value.trim();
          input.value = cur ? cur + ' ' + reader.result : reader.result;
          input.dispatchEvent(new Event('input'));
          showToast(t('msg.imagePasted'), 'success');
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  });
}

// === Schedule Cache ===
async function loadScheduleCacheForProject(projectId) {
  const result = await window.electronAPI.getSchedules();
  if (!result.success) return;
  const cache = {};
  for (const s of result.data) {
    if (s.projectId === projectId) {
      cache[s.commandIndex] = s;
    }
  }
  commandScheduleCache[projectId] = cache;
}

// === Schedule Events ===
function setupScheduleEvents() {
  if (window.electronAPI.onScheduleExecuted) {
    window.electronAPI.onScheduleExecuted((data) => {
      if (currentProject) {
        loadScheduleCacheForProject(currentProject.id).then(() => {
          renderCommandsDisplay();
        });
      }
    });
  }
  if (window.electronAPI.onSilentExecutionComplete) {
    window.electronAPI.onSilentExecutionComplete((data) => {
      // Background notification already handled via toast in executeCommand
    });
  }
}

// === Schedule Dialog ===
function simpleConfigToCron(config) {
  if (!config) return '* * * * *';
  switch (config.type) {
    case 'interval':
      return `*/${config.minutes || 5} * * * *`;
    case 'daily':
      return `${config.minute || 0} ${config.hour || 9} * * *`;
    case 'weekly':
      return `${config.minute || 0} ${config.hour || 9} * * ${config.day || 1}`;
    default:
      return '* * * * *';
  }
}

function cronToSimpleConfig(cron) {
  if (!cron) return { type: 'daily', hour: 9, minute: 0 };
  const parts = cron.split(/\s+/);
  if (parts.length !== 5) return null;
  // interval: */N * * * *
  if (parts[0].startsWith('*/') && parts[1] === '*' && parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
    return { type: 'interval', minutes: parseInt(parts[0].slice(2)) || 5 };
  }
  // daily: M H * * *
  if (parts[2] === '*' && parts[3] === '*' && parts[4] === '*' && !parts[0].includes('/') && !parts[1].includes('/')) {
    return { type: 'daily', hour: parseInt(parts[1]) || 0, minute: parseInt(parts[0]) || 0 };
  }
  // weekly: M H * * D
  if (parts[2] === '*' && parts[3] === '*' && !parts[4].includes('*') && !parts[0].includes('/')) {
    return { type: 'weekly', hour: parseInt(parts[1]) || 0, minute: parseInt(parts[0]) || 0, day: parseInt(parts[4]) || 0 };
  }
  return null; // Can't map to simple
}

async function openScheduleDialog(project, commandIndex, command, commandName) {
  // Load existing schedule
  const result = await window.electronAPI.getScheduleForCommand(project.id, commandIndex);
  const existing = result.success ? result.data : null;

  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';

  const simpleConfig = existing?.simpleConfig || { type: 'daily', hour: 9, minute: 0 };
  const cronExpr = existing?.cronExpression || simpleConfigToCron(simpleConfig);
  const isAdvanced = existing ? !existing.simpleConfig : false;

  const dayNames = [
    t('schedule.sun'), t('schedule.mon'), t('schedule.tue'),
    t('schedule.wed'), t('schedule.thu'), t('schedule.fri'), t('schedule.sat')
  ];

  const isEnabled = existing ? existing.enabled : true;

  overlay.innerHTML = `
    <div class="modal-content" style="max-width:440px;">
      <div class="modal-header">
        <h3>${escapeHtml(t('schedule.title'))}</h3>
        <button class="close-btn schedule-close-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="schedule-dialog-body">
        <div style="margin-bottom:14px;font-size:12px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${escapeHtml(commandName || command).substring(0, 100)}
        </div>
        ${existing ? `<div class="schedule-option-row" style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border);">
          <label style="font-weight:500;">${t('schedule.enableToggle')}</label>
          <label class="toggle-switch"><input type="checkbox" id="scheduleEnabled" ${isEnabled ? 'checked' : ''}><span class="toggle-slider"></span></label>
        </div>` : ''}
        <div class="schedule-mode-toggle">
          <button class="schedule-mode-btn ${!isAdvanced ? 'active' : ''}" data-mode="simple">${t('schedule.simple')}</button>
          <button class="schedule-mode-btn ${isAdvanced ? 'active' : ''}" data-mode="advanced">${t('schedule.advanced')}</button>
        </div>
        <div id="scheduleSimplePanel" style="${isAdvanced ? 'display:none' : ''}">
          <div class="schedule-simple-compact">
            <select id="scheduleType" class="schedule-select">
              <option value="interval" ${simpleConfig.type === 'interval' ? 'selected' : ''}>${t('schedule.everyNMin')}</option>
              <option value="daily" ${simpleConfig.type === 'daily' ? 'selected' : ''}>${t('schedule.daily')}</option>
              <option value="weekly" ${simpleConfig.type === 'weekly' ? 'selected' : ''}>${t('schedule.weekly')}</option>
            </select>
            <span id="scheduleIntervalRow" class="schedule-inline" style="${simpleConfig.type === 'interval' ? '' : 'display:none'}">
              <input type="number" id="scheduleMinutes" min="1" max="1440" value="${simpleConfig.minutes || 5}" class="schedule-num-input"> <span class="schedule-unit">min</span>
            </span>
            <span id="scheduleDayRow" class="schedule-inline" style="${simpleConfig.type === 'weekly' ? '' : 'display:none'}">
              <select id="scheduleDay" class="schedule-select">
                ${dayNames.map((d, i) => `<option value="${i}" ${(simpleConfig.day || 0) === i ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
            </span>
            <span id="scheduleTimeRow" class="schedule-inline" style="${simpleConfig.type !== 'interval' ? '' : 'display:none'}">
              <input type="number" id="scheduleHour" min="0" max="23" value="${simpleConfig.hour || 9}" class="schedule-num-input"> : <input type="number" id="scheduleMinute" min="0" max="59" value="${simpleConfig.minute || 0}" class="schedule-num-input">
            </span>
          </div>
        </div>
        <div id="scheduleAdvancedPanel" style="${isAdvanced ? '' : 'display:none'}">
          <input type="text" id="scheduleCronInput" class="schedule-cron-input" value="${escapeHtml(cronExpr)}" placeholder="* * * * *">
          <div class="cron-hint" id="cronHint">${t('schedule.cronHint')}</div>
        </div>
        <div class="schedule-options">
          <div class="schedule-option-row">
            <label>${t('schedule.notify')}</label>
            <label class="toggle-switch"><input type="checkbox" id="scheduleNotify" ${existing?.notifyOnComplete !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
          </div>
          <div class="schedule-option-row">
            <label>${t('schedule.timeout')}</label>
            <div style="display:flex;align-items:center;gap:4px;"><input type="number" id="scheduleTimeout" min="1" max="1440" value="${existing?.timeoutMinutes || 60}" class="schedule-num-input" style="width:70px;"> <span class="schedule-unit">min</span></div>
          </div>
        </div>
      </div>
      <div class="schedule-footer">
        <div>${existing ? `<button class="btn-danger schedule-remove-btn">${t('schedule.remove')}</button>` : ''}</div>
        <div class="schedule-footer-right">
          <button class="btn-secondary schedule-cancel-btn">${t('modal.cancel')}</button>
          <button class="btn-primary schedule-save-btn">${t('modal.save')}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Mode toggle
  let currentMode = isAdvanced ? 'advanced' : 'simple';
  overlay.querySelectorAll('.schedule-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentMode = btn.dataset.mode;
      overlay.querySelectorAll('.schedule-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      overlay.querySelector('#scheduleSimplePanel').style.display = currentMode === 'simple' ? '' : 'none';
      overlay.querySelector('#scheduleAdvancedPanel').style.display = currentMode === 'advanced' ? '' : 'none';
    });
  });

  // Type change
  const typeSelect = overlay.querySelector('#scheduleType');
  typeSelect.addEventListener('change', () => {
    const type = typeSelect.value;
    overlay.querySelector('#scheduleIntervalRow').style.display = type === 'interval' ? '' : 'none';
    overlay.querySelector('#scheduleTimeRow').style.display = type !== 'interval' ? '' : 'none';
    overlay.querySelector('#scheduleDayRow').style.display = type === 'weekly' ? '' : 'none';
  });

  // Cron validation
  const cronInput = overlay.querySelector('#scheduleCronInput');
  const cronHint = overlay.querySelector('#cronHint');
  cronInput.addEventListener('input', async () => {
    const val = cronInput.value.trim();
    if (!val) { cronInput.className = 'schedule-cron-input'; cronHint.textContent = t('schedule.cronHint'); return; }
    const r = await window.electronAPI.validateCron(val);
    if (r.valid) {
      cronInput.className = 'schedule-cron-input cron-valid';
      cronHint.textContent = t('schedule.cronValid');
    } else {
      cronInput.className = 'schedule-cron-input cron-invalid';
      cronHint.textContent = t('schedule.cronInvalid');
    }
  });

  const cleanup = () => overlay.remove();

  // Close
  overlay.querySelector('.schedule-close-btn').addEventListener('click', cleanup);
  overlay.querySelector('.schedule-cancel-btn').addEventListener('click', cleanup);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); });

  // Remove
  const removeBtn = overlay.querySelector('.schedule-remove-btn');
  if (removeBtn && existing) {
    removeBtn.addEventListener('click', async () => {
      await window.electronAPI.deleteSchedule(existing.id);
      await loadScheduleCacheForProject(project.id);
      renderCommandsDisplay();
      showToast(t('schedule.removed'), 'success');
      cleanup();
    });
  }

  // Save
  overlay.querySelector('.schedule-save-btn').addEventListener('click', async () => {
    let cronExpression, sConfig;
    if (currentMode === 'simple') {
      const type = typeSelect.value;
      sConfig = { type };
      if (type === 'interval') {
        sConfig.minutes = parseInt(overlay.querySelector('#scheduleMinutes').value) || 5;
      } else {
        sConfig.hour = parseInt(overlay.querySelector('#scheduleHour').value) || 0;
        sConfig.minute = parseInt(overlay.querySelector('#scheduleMinute').value) || 0;
        if (type === 'weekly') {
          sConfig.day = parseInt(overlay.querySelector('#scheduleDay').value) || 0;
        }
      }
      cronExpression = simpleConfigToCron(sConfig);
    } else {
      cronExpression = cronInput.value.trim();
      sConfig = null;
      const vr = await window.electronAPI.validateCron(cronExpression);
      if (!vr.valid) {
        showToast(t('schedule.cronInvalid'), 'error');
        return;
      }
    }

    const enabledToggle = overlay.querySelector('#scheduleEnabled');
    const scheduleData = {
      projectId: project.id,
      commandIndex,
      command,
      projectPath: project.path,
      projectName: project.name,
      commandName: commandName || '',
      cronExpression,
      simpleConfig: sConfig,
      enabled: enabledToggle ? enabledToggle.checked : true,
      notifyOnComplete: overlay.querySelector('#scheduleNotify').checked,
      timeoutMinutes: parseInt(overlay.querySelector('#scheduleTimeout').value) || 60,
    };

    let saveResult;
    if (existing) {
      saveResult = await window.electronAPI.updateSchedule(existing.id, scheduleData);
    } else {
      saveResult = await window.electronAPI.addSchedule(scheduleData);
    }

    if (saveResult.success) {
      await loadScheduleCacheForProject(project.id);
      renderCommandsDisplay();
      showToast(t('schedule.saved'), 'success');
      cleanup();
    } else {
      showToast(t('schedule.saveFailed') + ': ' + saveResult.error, 'error');
    }
  });
}

// === Schedule Logs Modal ===
async function openScheduleLogsModal() {
  const result = await window.electronAPI.getScheduleLogs({ limit: 100 });
  const logs = result.success ? result.data.logs : [];

  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';

  const statusIcons = {
    success: `<svg class="log-status-icon status-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    failed: `<svg class="log-status-icon status-failed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    timeout: `<svg class="log-status-icon status-timeout" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    error: `<svg class="log-status-icon status-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  }

  function formatTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString();
  }

  let logsHtml;
  if (logs.length === 0) {
    logsHtml = `<div class="log-empty">${t('logs.empty')}</div>`;
  } else {
    logsHtml = '<div class="log-list">' + logs.map(log => `
      <div class="log-entry" data-log-id="${log.id}">
        <div class="log-entry-header">
          ${statusIcons[log.status] || statusIcons.error}
          <span class="log-project-name">${escapeHtml(log.projectName || '')}</span>
          <span class="log-command-name">${escapeHtml(log.commandName || '')}</span>
          ${log.trigger ? `<span class="log-trigger log-trigger-${log.trigger}">${log.trigger === 'scheduled' ? t('logs.scheduled') : t('logs.manual')}</span>` : ''}
          <div class="log-meta">
            <span>${formatTime(log.startTime)}</span>
            <span>${formatDuration(log.durationMs || 0)}</span>
          </div>
        </div>
        <div class="log-detail">
          ${log.stdout ? `<div class="log-detail-label">STDOUT</div><pre>${escapeHtml(log.stdout)}</pre>` : ''}
          ${log.stderr ? `<div class="log-detail-label">STDERR</div><pre>${escapeHtml(log.stderr)}</pre>` : ''}
          ${!log.stdout && !log.stderr ? `<div style="font-size:12px;color:var(--text-muted)">${t('logs.noOutput')}</div>` : ''}
        </div>
      </div>
    `).join('') + '</div>';
  }

  overlay.innerHTML = `
    <div class="modal-content" style="max-width:640px;">
      <div class="modal-header">
        <h3>${t('logs.title')}</h3>
        <button class="close-btn log-close-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="modal-body" style="padding:16px 24px;">
        ${logs.length > 0 ? `<div class="log-header"><span style="font-size:12px;color:var(--text-muted)">${t('logs.total', { count: logs.length })}</span><button class="btn-danger log-clear-btn" style="font-size:12px;padding:4px 10px;">${t('logs.clearAll')}</button></div>` : ''}
        ${logsHtml}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Toggle log detail
  overlay.querySelectorAll('.log-entry').forEach(entry => {
    entry.addEventListener('click', () => {
      entry.classList.toggle('expanded');
    });
  });

  const cleanup = () => overlay.remove();
  overlay.querySelector('.log-close-btn').addEventListener('click', cleanup);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') cleanup(); });

  // Clear all
  const clearBtn = overlay.querySelector('.log-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      await window.electronAPI.clearScheduleLogs();
      showToast(t('logs.cleared'), 'success');
      cleanup();
    });
  }
}
