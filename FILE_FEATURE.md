# 文件功能说明

## 新增功能

现在 START EVERYTHING 支持添加文件，功能与文件夹完全一致：

### 主要特性

1. **添加文件**
   - 在项目编辑界面中，新增"文件"区域
   - 点击"+ 添加文件"按钮可以选择文件
   - 支持拖放文件到"+ 添加文件"按钮上

2. **文件管理**
   - 每个文件可以设置自定义名称（简称）
   - 支持拖放排序
   - 点击文件块即可使用系统默认应用打开文件

3. **项目详情页显示**
   - 文件以块状形式显示在项目详情页
   - 支持快速添加按钮（+ 图标）
   - 支持拖放文件到文件区域直接添加

4. **数据持久化**
   - 文件信息保存在项目数据中
   - 支持导入/导出

## 技术实现

### 修改的文件

1. **src/main/store.js**
   - 在 `addProject` 中添加 `files` 参数
   - 在 `updateProject` 中添加 `files` 更新支持
   - 在导入数据时支持 `files` 字段

2. **src/main/ipc-handlers.js**
   - 新增 `open-file` IPC 处理器，使用 `shell.openPath` 打开文件

3. **src/preload.js**
   - 暴露 `openFileWithDefault` API

4. **src/renderer/index.html**
   - 添加 `filesList` 容器
   - 添加 `addFileBtn` 按钮

5. **src/renderer/i18n.js**
   - 添加文件相关的多语言翻译（中文、英文、日文、法文）

6. **src/renderer/app.js**
   - 添加 `renderFileInputs` 函数（模态框中的文件输入）
   - 添加 `addFileInput` 和 `addFileInputWithValue` 函数
   - 添加 `renderFileBlocks` 函数（详情页中的文件块显示）
   - 在 `saveProject` 中收集文件数据
   - 在 `selectProject` 中渲染文件块
   - 添加文件拖放支持

## 使用方法

1. 创建或编辑项目
2. 滚动到"文件"区域
3. 点击"+ 添加文件"或拖放文件
4. 设置文件的自定义名称（可选）
5. 保存项目
6. 在项目详情页点击文件块即可打开文件

## 注意事项

- 文件会使用系统默认应用打开
- 如果文件路径不存在，会显示错误提示
- 文件块支持拖放排序，与文件夹块功能一致
