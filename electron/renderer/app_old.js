// API 基础地址
const API_URL = window.config.apiUrl;

// 状态管理
let projects = [];
let currentProject = null;
let isEditMode = false;

// DOM 元素
const projectList = document.getElementById('projectList');
const welcomeMessage = document.getElementById('welcomeMessage');
const projectDetails = document.getElementById('projectDetails');
const projectModal = document.getElementById('projectModal');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
    // 添加项目按钮
    document.getElementById('addProjectBtn').addEventListener('click', () => {
        openModal(false);
    });

    // 编辑项目按钮
    document.getElementById('editProjectBtn').addEventListener('click', () => {
        if (currentProject) {
            openModal(true, currentProject);
        }
    });

    // 删除项目按钮
    document.getElementById('deleteProjectBtn').addEventListener('click', deleteProject);

    // 执行命令按钮
    document.getElementById('executeBtn').addEventListener('click', executeCommand);

    // 打开结果文件夹按钮
    document.getElementById('openResultBtn').addEventListener('click', openResultFolder);

    // 模态框按钮
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
    document.getElementById('saveProjectBtn').addEventListener('click', saveProject);

    // 文件夹选择按钮
    document.getElementById('browseProjectPathBtn').addEventListener('click', async () => {
        const result = await window.electronAPI.selectFolder();
        if (!result.canceled) {
            document.getElementById('modalProjectPath').value = result.path;
        }
    });

    document.getElementById('browseResultPathBtn').addEventListener('click', async () => {
        const result = await window.electronAPI.selectFolder();
        if (!result.canceled) {
            document.getElementById('modalResultPath').value = result.path;
        }
    });

    // 点击模态框外部关闭
    projectModal.addEventListener('click', (e) => {
        if (e.target === projectModal) {
            closeModal();
        }
    });
}

// 加载项目列表
async function loadProjects() {
    try {
        const response = await fetch(`${API_URL}/projects`);
        if (!response.ok) throw new Error('Failed to load projects');

        projects = await response.json();
        renderProjectList();
    } catch (error) {
        console.error('Error loading projects:', error);
        showNotification('加载项目失败: ' + error.message, 'error');
    }
}

// 渲染项目列表
function renderProjectList() {
    projectList.innerHTML = '';

    if (projects.length === 0) {
        projectList.innerHTML = '<div style="padding: 20px; text-align: center; color: #95a5a6;">暂无项目</div>';
        return;
    }

    projects.forEach(project => {
        const item = document.createElement('div');
        item.className = 'project-item';
        if (currentProject && currentProject.id === project.id) {
            item.classList.add('active');
        }

        item.innerHTML = `
            <div class="project-item-name">${escapeHtml(project.name)}</div>
            <div class="project-item-path">${escapeHtml(project.path)}</div>
        `;

        item.addEventListener('click', () => selectProject(project));
        projectList.appendChild(item);
    });
}

// 选择项目
function selectProject(project) {
    currentProject = project;
    renderProjectList();
    showProjectDetails();
}

// 显示项目详情
function showProjectDetails() {
    if (!currentProject) {
        welcomeMessage.style.display = 'block';
        projectDetails.style.display = 'none';
        return;
    }

    welcomeMessage.style.display = 'none';
    projectDetails.style.display = 'block';

    document.getElementById('projectName').textContent = currentProject.name;
    document.getElementById('projectPath').textContent = currentProject.path;
    document.getElementById('commandInput').value = currentProject.default_command;
    document.getElementById('resultPath').textContent = currentProject.result_path;
}

// 打开模态框
function openModal(editMode = false, project = null) {
    isEditMode = editMode;

    document.getElementById('modalTitle').textContent = editMode ? '编辑项目' : '添加项目';

    if (editMode && project) {
        document.getElementById('modalProjectName').value = project.name;
        document.getElementById('modalProjectPath').value = project.path;
        document.getElementById('modalCommand').value = project.default_command;
        document.getElementById('modalResultPath').value = project.result_path;
    } else {
        document.getElementById('modalProjectName').value = '';
        document.getElementById('modalProjectPath').value = '';
        document.getElementById('modalCommand').value = 'claude --dangerously-skip-permissions ';
        document.getElementById('modalResultPath').value = '';
    }

    projectModal.classList.add('show');
}

// 关闭模态框
function closeModal() {
    projectModal.classList.remove('show');
}

// 保存项目
async function saveProject() {
    const name = document.getElementById('modalProjectName').value.trim();
    const path = document.getElementById('modalProjectPath').value.trim();
    const command = document.getElementById('modalCommand').value.trim();
    const resultPath = document.getElementById('modalResultPath').value.trim();

    if (!name || !path || !command || !resultPath) {
        showNotification('请填写所有字段', 'error');
        return;
    }

    try {
        let response;
        if (isEditMode && currentProject) {
            // 更新项目
            response = await fetch(`${API_URL}/projects/${currentProject.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, path, default_command: command, result_path: resultPath })
            });
        } else {
            // 添加项目
            response = await fetch(`${API_URL}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, path, default_command: command, result_path: resultPath })
            });
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Operation failed');
        }

        const savedProject = await response.json();
        showNotification(isEditMode ? '项目已更新' : '项目已添加', 'success');
        closeModal();

        // 重新加载项目列表
        await loadProjects();

        // 加载完成后,从列表中找到对应的项目并选中
        const projectToSelect = projects.find(p => p.id === savedProject.id);
        if (projectToSelect) {
            selectProject(projectToSelect);
        }
    } catch (error) {
        console.error('Error saving project:', error);
        showNotification('保存失败: ' + error.message, 'error');
    }
}

// 删除项目
async function deleteProject() {
    if (!currentProject) return;

    if (!confirm(`确定要删除项目 "${currentProject.name}" 吗?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/projects/${currentProject.id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete project');

        showNotification('项目已删除', 'success');
        currentProject = null;
        await loadProjects();
        welcomeMessage.style.display = 'block';
        projectDetails.style.display = 'none';
    } catch (error) {
        console.error('Error deleting project:', error);
        showNotification('删除失败: ' + error.message, 'error');
    }
}

// 执行命令
async function executeCommand() {
    if (!currentProject) return;

    const command = document.getElementById('commandInput').value.trim();
    if (!command) {
        showNotification('命令不能为空', 'error');
        return;
    }

    try {
        showNotification('正在执行命令...', 'info');
        const result = await window.electronAPI.executeCommand(currentProject.path, command);

        if (result.success) {
            showNotification('命令已在新终端中执行', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error executing command:', error);
        showNotification('执行失败: ' + error.message, 'error');
    }
}

// 打开结果文件夹
async function openResultFolder() {
    if (!currentProject || !currentProject.result_path) return;

    try {
        await window.electronAPI.openFolder(currentProject.result_path);
    } catch (error) {
        console.error('Error opening folder:', error);
        showNotification('打开文件夹失败: ' + error.message, 'error');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background-color: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // 3秒后移除
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
