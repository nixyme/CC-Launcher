// API 基础地址
const API_URL = window.config.apiUrl;

// 状态管理
let projects = [];
let currentProject = null;
let isEditMode = false;
let draggedElement = null;
let loadRetries = 0;
const MAX_LOAD_RETRIES = 5;

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

    // 导出设置按钮
    document.getElementById('exportBtn').addEventListener('click', exportSettings);

    // 导入设置按钮
    document.getElementById('importBtn').addEventListener('click', importSettings);

    // 编辑项目按钮
    document.getElementById('editProjectBtn').addEventListener('click', () => {
        if (currentProject) {
            openModal(true, currentProject);
        }
    });

    // 删除项目按钮
    document.getElementById('deleteProjectBtn').addEventListener('click', deleteProject);

    // 打开结果文件夹按钮
    document.getElementById('openResultBtn').addEventListener('click', openResultFolder);

    // 模态框按钮
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
    document.getElementById('saveProjectBtn').addEventListener('click', saveProject);

    // 添加命令按钮
    document.getElementById('addCommandBtn').addEventListener('click', addCommandInput);

    // 添加命令按钮(详情页) - 暂时注释,函数未定义
    // document.getElementById('addCommandInDetailBtn').addEventListener('click', addCommandInDetail);

    // 文件夹选择按钮
    document.getElementById('browseProjectPathBtn').addEventListener('click', async () => {
        try {
            const result = await window.electronAPI.selectFolder();
            if (!result.canceled) {
                document.getElementById('modalProjectPath').value = result.path;
            }
        } catch (error) {
            console.error('Error selecting folder:', error);
        }
    });

    document.getElementById('browseResultPathBtn').addEventListener('click', async () => {
        try {
            const result = await window.electronAPI.selectFolder();
            if (!result.canceled) {
                document.getElementById('modalResultPath').value = result.path;
            }
        } catch (error) {
            console.error('Error selecting folder:', error);
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
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        projects = await response.json();
        loadRetries = 0; // 重置重试计数
        renderProjectList();
    } catch (error) {
        console.error('加载项目失败:', error);

        // 如果是第一次加载且失败,尝试重试
        if (loadRetries < MAX_LOAD_RETRIES) {
            loadRetries++;
            console.log(`重试加载项目 (${loadRetries}/${MAX_LOAD_RETRIES})...`);
            showNotification(`正在连接后端服务... (${loadRetries}/${MAX_LOAD_RETRIES})`, 'info');
            setTimeout(loadProjects, 1000); // 1秒后重试
        } else {
            // 重试次数用尽,显示详细错误
            let errorMsg = '无法连接到后端服务';
            if (error.message.includes('fetch')) {
                errorMsg += '\n\n可能的原因:\n1. 后端服务未启动\n2. 端口 5283 被占用\n3. Python 依赖未安装';
            } else {
                errorMsg += `: ${error.message}`;
            }
            showNotification(errorMsg, 'error');

            // 在项目列表区域显示错误提示
            projectList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #e74c3c;">
                    <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
                    <div style="font-weight: bold; margin-bottom: 10px;">无法连接到后端服务</div>
                    <div style="font-size: 12px; color: #95a5a6; line-height: 1.6;">
                        请检查:<br>
                        • Python3 是否已安装<br>
                        • Flask 依赖是否已安装<br>
                        • 端口 5283 是否被占用<br><br>
                        <button onclick="location.reload()" style="
                            padding: 8px 16px;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                        ">重新加载</button>
                    </div>
                </div>
            `;
        }
    }
}

// 渲染项目列表
function renderProjectList() {
    projectList.innerHTML = '';

    if (projects.length === 0) {
        projectList.innerHTML = '<div style="padding: 20px; text-align: center; color: #95a5a6;">暂无项目</div>';
        return;
    }

    projects.forEach((project, index) => {
        const item = document.createElement('div');
        item.className = 'project-item';
        item.draggable = true;
        item.dataset.projectId = project.id;
        item.dataset.index = index;

        if (currentProject && currentProject.id === project.id) {
            item.classList.add('active');
        }

        item.innerHTML = `
            <div class="project-item-name">${escapeHtml(project.name)}</div>
            <div class="project-item-path">${escapeHtml(project.path)}</div>
        `;

        // 点击选择项目
        item.addEventListener('click', () => selectProject(project));

        // 拖动事件
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragleave', handleDragLeave);

        projectList.appendChild(item);
    });
}

// 拖动处理
function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';

    if (this !== draggedElement) {
        this.classList.add('drag-over');
    }

    return false;
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

async function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedElement !== this) {
        const draggedId = draggedElement.dataset.projectId;
        const targetId = this.dataset.projectId;

        // 找到拖动项和目标项的索引
        const draggedIndex = projects.findIndex(p => p.id === draggedId);
        const targetIndex = projects.findIndex(p => p.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            // 重新排列数组
            const [removed] = projects.splice(draggedIndex, 1);
            projects.splice(targetIndex, 0, removed);

            // 保存新顺序到后端
            await saveProjectOrder();

            // 重新渲染
            renderProjectList();
        }
    }

    return false;
}

async function saveProjectOrder() {
    try {
        const projectIds = projects.map(p => p.id);
        const response = await fetch(`${API_URL}/projects/reorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_ids: projectIds })
        });

        if (!response.ok) throw new Error('Failed to save order');
    } catch (error) {
        console.error('Error saving project order:', error);
        showNotification('保存排序失败: ' + error.message, 'error');
    }
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
    document.getElementById('resultPath').textContent = currentProject.result_path;

    // 显示命令列表
    renderCommandsDisplay();
}

// 渲染命令显示区(可编辑)
function renderCommandsDisplay() {
    const commandsDisplay = document.getElementById('commandsDisplay');
    commandsDisplay.innerHTML = '';

    const commands = currentProject.commands || [currentProject.default_command];

    commands.forEach((command, index) => {
        if (!command && commands.length > 1) return; // 跳过空命令(除非只有一个)

        const wrapper = document.createElement('div');
        wrapper.className = 'command-button-wrapper';

        // 可编辑输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'command-input-editable';
        input.value = command || '';
        input.placeholder = 'claude --dangerously-skip-permissions ...';

        // 输入框失焦时自动保存
        input.addEventListener('blur', async () => {
            await updateCommandAtIndex(index, input.value);
        });

        // 执行按钮
        const execBtn = document.createElement('button');
        execBtn.className = 'btn-execute-command';
        execBtn.textContent = '▶ 执行';
        execBtn.addEventListener('click', () => {
            const cmd = input.value.trim();
            if (cmd) {
                executeCommand(cmd);
            } else {
                showNotification('命令不能为空', 'error');
            }
        });

        wrapper.appendChild(input);
        wrapper.appendChild(execBtn);
        commandsDisplay.appendChild(wrapper);
    });
}

// 打开模态框
function openModal(editMode = false, project = null) {
    isEditMode = editMode;

    document.getElementById('modalTitle').textContent = editMode ? '编辑项目' : '添加项目';

    if (editMode && project) {
        document.getElementById('modalProjectName').value = project.name;
        document.getElementById('modalProjectPath').value = project.path;
        document.getElementById('modalResultPath').value = project.result_path;

        // 渲染命令列表
        renderCommandInputs(project.commands || [project.default_command]);
    } else {
        document.getElementById('modalProjectName').value = '';
        document.getElementById('modalProjectPath').value = '';
        document.getElementById('modalResultPath').value = '';

        // 添加一个默认命令输入框
        renderCommandInputs(['claude --dangerously-skip-permissions ']);
    }

    projectModal.classList.add('show');
}

// 渲染命令输入框
function renderCommandInputs(commands = []) {
    const commandsList = document.getElementById('commandsList');
    commandsList.innerHTML = '';

    if (commands.length === 0) {
        commands = [''];
    }

    commands.forEach((command, index) => {
        addCommandInputWithValue(command);
    });
}

// 添加命令输入框(带值)
function addCommandInputWithValue(value = '') {
    const commandsList = document.getElementById('commandsList');

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
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
        // 至少保留一个命令输入框
        if (commandsList.children.length > 1) {
            item.remove();
        } else {
            showNotification('至少需要一个命令', 'error');
        }
    });

    item.appendChild(input);
    item.appendChild(removeBtn);
    commandsList.appendChild(item);
}

// 添加命令输入框
function addCommandInput() {
    addCommandInputWithValue('claude --dangerously-skip-permissions ');
}

// 关闭模态框
function closeModal() {
    projectModal.classList.remove('show');
}

// 保存项目
async function saveProject() {
    const name = document.getElementById('modalProjectName').value.trim();
    const path = document.getElementById('modalProjectPath').value.trim();
    const resultPath = document.getElementById('modalResultPath').value.trim();

    // 收集所有命令
    const commandInputs = document.querySelectorAll('#commandsList .command-item input');
    const commands = Array.from(commandInputs)
        .map(input => input.value.trim())
        .filter(cmd => cmd.length > 0);

    if (!name || !path || !resultPath || commands.length === 0) {
        showNotification('请填写所有必填字段并至少添加一个命令', 'error');
        return;
    }

    try {
        let response;
        const defaultCommand = commands[0]; // 第一个命令作为默认命令(兼容性)

        if (isEditMode && currentProject) {
            // 更新项目
            response = await fetch(`${API_URL}/projects/${currentProject.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    path,
                    default_command: defaultCommand,
                    commands: commands,
                    result_path: resultPath
                })
            });
        } else {
            // 添加项目
            response = await fetch(`${API_URL}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    path,
                    default_command: defaultCommand,
                    commands: commands,
                    result_path: resultPath
                })
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
async function executeCommand(command) {
    if (!currentProject) return;

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

// 执行所有命令
async function executeAllCommands() {
    if (!currentProject) return;

    const commands = currentProject.commands || [currentProject.default_command];
    const validCommands = commands.filter(cmd => cmd && cmd.trim());

    if (validCommands.length === 0) {
        showNotification('没有可执行的命令', 'error');
        return;
    }

    // 将所有命令用 && 连接成一个命令
    const combinedCommand = validCommands.join(' && ');
    await executeCommand(combinedCommand);
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

// 导出设置
async function exportSettings() {
    try {
        // 从后端获取导出数据
        const response = await fetch(`${API_URL}/projects/export`);
        if (!response.ok) throw new Error('Failed to export');

        const data = await response.json();
        const jsonStr = JSON.stringify(data, null, 2);

        // 保存到文件
        const result = await window.electronAPI.saveFile(jsonStr, 'cc-launcher-settings.json');

        if (!result.canceled) {
            showNotification(`设置已导出到: ${result.path}`, 'success');
        }
    } catch (error) {
        console.error('Export error:', error);
        showNotification('导出失败: ' + error.message, 'error');
    }
}

// 导入设置
async function importSettings() {
    try {
        // 打开文件
        const result = await window.electronAPI.openFile();

        if (result.canceled) return;

        // 解析 JSON
        let data;
        try {
            data = JSON.parse(result.data);
        } catch (e) {
            throw new Error('无效的 JSON 文件');
        }

        // 发送到后端导入
        const response = await fetch(`${API_URL}/projects/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Import failed');
        }

        const importResult = await response.json();
        showNotification(`导入完成: ${importResult.imported} 个项目已导入, ${importResult.skipped} 个已跳过`, 'success');

        // 重新加载项目列表
        loadRetries = 0; // 重置重试计数
        await loadProjects();
    } catch (error) {
        console.error('Import error:', error);
        let errorMsg = '导入失败';
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
            errorMsg = '导入失败: 无法连接到后端服务\n\n请确保后端服务正在运行';
        } else {
            errorMsg = '导入失败: ' + error.message;
        }
        showNotification(errorMsg, 'error');
    }
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
