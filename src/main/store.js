const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ProjectStore {
  constructor(userDataPath) {
    this.dataDir = path.join(userDataPath, 'data');
    this.dataFile = path.join(this.dataDir, 'projects.json');
    this.backupFile = path.join(this.dataDir, 'projects_backup.json');
    this.settingsFile = path.join(this.dataDir, 'settings.json');
    this.schedulesFile = path.join(this.dataDir, 'schedules.json');
    this.scheduleLogsFile = path.join(this.dataDir, 'schedule-logs.json');
    this._ensureDataFile();
    this._createBackup();
  }

  _ensureDataFile() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.dataFile)) {
      this._saveProjects([]);
    }
  }

  _loadProjects() {
    try {
      const raw = fs.readFileSync(this.dataFile, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  _saveProjects(projects) {
    const json = JSON.stringify(projects, null, 2);
    fs.writeFileSync(this.dataFile, json, 'utf-8');
    this._createBackup();
  }

  _createBackup() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const stat = fs.statSync(this.dataFile);
        if (stat.size > 0) {
          fs.copyFileSync(this.dataFile, this.backupFile);
        }
      }
    } catch (e) {
      console.error('Backup failed:', e.message);
    }
  }

  getAllProjects() {
    const projects = this._loadProjects();
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].order === undefined) projects[i].order = i;
      if (!projects[i].commands) {
        projects[i].commands = projects[i].default_command
          ? [projects[i].default_command]
          : [];
      }
    }
    projects.sort((a, b) => (a.order || 0) - (b.order || 0));
    return projects;
  }

  getProject(id) {
    return this._loadProjects().find((p) => p.id === id) || null;
  }

  addProject({ name, path: projPath, commands, command_names, command_modes, result_path }) {
    const projects = this._loadProjects();
    if (projects.some((p) => p.name === name)) {
      throw new Error(`Project name '${name}' already exists`);
    }
    if (!fs.existsSync(projPath)) {
      throw new Error(`Project path does not exist: ${projPath}`);
    }
    // 新项目置顶：所有现有项目 order+1，新项目 order=0
    projects.forEach((p) => { p.order = (p.order || 0) + 1; });
    const project = {
      id: uuidv4(),
      name,
      path: projPath,
      commands: commands || [],
      command_names: command_names || [],
      command_modes: command_modes || [],
      default_command: commands?.[0] || '',
      result_path: result_path || '',
      order: 0,
    };
    projects.unshift(project);
    this._saveProjects(projects);
    return project;
  }

  updateProject(id, updates) {
    const projects = this._loadProjects();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Project not found: ${id}`);

    const project = projects[idx];
    if (updates.name !== undefined) {
      if (projects.some((p) => p.name === updates.name && p.id !== id)) {
        throw new Error(`项目名称 '${updates.name}' 已存在`);
      }
      project.name = updates.name;
    }
    if (updates.path !== undefined) {
      if (!fs.existsSync(updates.path)) {
        throw new Error(`Project path does not exist: ${updates.path}`);
      }
      project.path = updates.path;
    }
    if (updates.commands !== undefined) {
      project.commands = updates.commands;
      project.default_command = updates.commands[0] || '';
    }
    if (updates.command_names !== undefined) {
      project.command_names = updates.command_names;
    }
    if (updates.command_modes !== undefined) {
      project.command_modes = updates.command_modes;
    }
    if (updates.result_path !== undefined) {
      project.result_path = updates.result_path;
    }

    projects[idx] = project;
    this._saveProjects(projects);
    return project;
  }

  deleteProject(id) {
    const projects = this._loadProjects();
    const filtered = projects.filter((p) => p.id !== id);
    if (filtered.length === projects.length) return false;
    this._saveProjects(filtered);
    return true;
  }

  reorderProjects(projectIds) {
    const projects = this._loadProjects();
    const idMap = Object.fromEntries(projects.map((p) => [p.id, p]));
    const reordered = [];
    projectIds.forEach((id, i) => {
      if (idMap[id]) {
        idMap[id].order = i;
        reordered.push(idMap[id]);
      }
    });
    projects.forEach((p) => {
      if (!projectIds.includes(p.id)) {
        p.order = reordered.length;
        reordered.push(p);
      }
    });
    this._saveProjects(reordered);
    return true;
  }

  exportData() {
    return {
      version: '1.1',
      projects: this.getAllProjects(),
      schedules: this._loadSchedules(),
    };
  }

  importData(data) {
    if (!data?.projects) throw new Error('Invalid import data: missing projects');
    let imported = 0;
    let skipped = 0;
    for (const p of data.projects) {
      if (!p.name || !p.path) { skipped++; continue; }
      try {
        this.addProject({
          name: p.name,
          path: p.path,
          commands: p.commands || (p.default_command ? [p.default_command] : []),
          command_names: p.command_names || [],
          command_modes: p.command_modes || [],
          result_path: p.result_path,
        });
        imported++;
      } catch { skipped++; }
    }
    // Import schedules if present
    if (data.schedules && Array.isArray(data.schedules)) {
      const existing = this._loadSchedules();
      const existingIds = new Set(existing.map(s => s.id));
      for (const s of data.schedules) {
        if (s.id && !existingIds.has(s.id)) {
          existing.push(s);
        }
      }
      this._saveSchedules(existing);
    }
    return { imported, skipped };
  }

  updateCommandAtIndex(projectId, index, newCommand) {
    const projects = this._loadProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    if (!project.commands) project.commands = [];
    if (index >= 0 && index < project.commands.length) {
      project.commands[index] = newCommand;
      project.default_command = project.commands[0] || '';
      this._saveProjects(projects);
    }
    return project;
  }

  // --- Settings ---
  _loadSettings() {
    try {
      if (fs.existsSync(this.settingsFile)) {
        return JSON.parse(fs.readFileSync(this.settingsFile, 'utf-8'));
      }
    } catch { /* ignore */ }
    return {};
  }

  _saveSettings(settings) {
    fs.writeFileSync(this.settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
  }

  getSetting(key) {
    return this._loadSettings()[key] ?? null;
  }

  setSetting(key, value) {
    const settings = this._loadSettings();
    settings[key] = value;
    this._saveSettings(settings);
  }

  // --- Schedules ---
  _loadSchedules() {
    try {
      if (fs.existsSync(this.schedulesFile)) {
        return JSON.parse(fs.readFileSync(this.schedulesFile, 'utf-8'));
      }
    } catch { /* ignore */ }
    return [];
  }

  _saveSchedules(schedules) {
    fs.writeFileSync(this.schedulesFile, JSON.stringify(schedules, null, 2), 'utf-8');
  }

  getAllSchedules() {
    return this._loadSchedules();
  }

  getScheduleForCommand(projectId, commandIndex) {
    return this._loadSchedules().find(
      (s) => s.projectId === projectId && s.commandIndex === commandIndex
    ) || null;
  }

  addSchedule(schedule) {
    const schedules = this._loadSchedules();
    const entry = { id: uuidv4(), ...schedule, lastRunAt: null, lastExitCode: null };
    schedules.push(entry);
    this._saveSchedules(schedules);
    return entry;
  }

  updateSchedule(id, updates) {
    const schedules = this._loadSchedules();
    const idx = schedules.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`Schedule not found: ${id}`);
    Object.assign(schedules[idx], updates);
    this._saveSchedules(schedules);
    return schedules[idx];
  }

  updateScheduleMeta(id, meta) {
    const schedules = this._loadSchedules();
    const idx = schedules.findIndex((s) => s.id === id);
    if (idx === -1) return;
    Object.assign(schedules[idx], meta);
    this._saveSchedules(schedules);
  }

  deleteSchedule(id) {
    const schedules = this._loadSchedules();
    const filtered = schedules.filter((s) => s.id !== id);
    if (filtered.length === schedules.length) return false;
    this._saveSchedules(filtered);
    return true;
  }

  deleteSchedulesByProject(projectId) {
    const schedules = this._loadSchedules();
    const filtered = schedules.filter((s) => s.projectId !== projectId);
    this._saveSchedules(filtered);
    return schedules.length - filtered.length;
  }

  // --- Schedule Logs ---
  _loadScheduleLogs() {
    try {
      if (fs.existsSync(this.scheduleLogsFile)) {
        return JSON.parse(fs.readFileSync(this.scheduleLogsFile, 'utf-8'));
      }
    } catch { /* ignore */ }
    return [];
  }

  _saveScheduleLogs(logs) {
    fs.writeFileSync(this.scheduleLogsFile, JSON.stringify(logs, null, 2), 'utf-8');
  }

  addScheduleLog(log) {
    const logs = this._loadScheduleLogs();
    const entry = { id: uuidv4(), ...log };
    logs.unshift(entry);
    // 上限 500 条
    if (logs.length > 500) logs.length = 500;
    this._saveScheduleLogs(logs);
    return entry;
  }

  getScheduleLogs({ scheduleId, limit = 50, offset = 0 } = {}) {
    let logs = this._loadScheduleLogs();
    if (scheduleId) logs = logs.filter((l) => l.scheduleId === scheduleId);
    const total = logs.length;
    return { total, logs: logs.slice(offset, offset + limit) };
  }

  clearScheduleLogs(scheduleId) {
    const logs = this._loadScheduleLogs();
    const filtered = logs.filter((l) => l.scheduleId !== scheduleId);
    this._saveScheduleLogs(filtered);
  }

  clearAllScheduleLogs() {
    this._saveScheduleLogs([]);
  }
}

module.exports = ProjectStore;
