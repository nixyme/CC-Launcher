# 项目文件夹重命名指南

## 当前状态
所有代码、配置、图标已更新为 "Start Everything"

## 需要手动操作

### 1. 重命名项目文件夹
```bash
cd "/Users/nixy/Library/Mobile Documents/com~apple~CloudDocs/AICODE/000 nixyme"
mv cc-launcher Start-Everything
```

### 2. 更新 Git 远程仓库（如果需要）
```bash
cd Start-Everything
git remote set-url origin https://github.com/nixyme/Start-Everything.git
```

### 3. 验证更改
```bash
git remote -v
```

## 已完成的更新

✅ 图标已替换为新版本（所有尺寸）
✅ package.json 中的名称、描述、appId 已更新
✅ README.md 已更新所有引用
✅ README_EN.md 已创建（英文版）
✅ CLAUDE.md 项目文档已更新
✅ 界面标题已更新为 "Start Everything"
✅ GitHub 链接已更新为 Start-Everything
✅ 导入逻辑已改进：增量更新/删除项目
✅ 示例项目中的 GitHub 链接已更新
✅ 数据存储路径已更新为 start-everything

## 注意事项

- 重命名文件夹后，需要在新路径下重新打开项目
- 如果有 IDE 配置（如 VSCode workspace），需要更新路径
- 用户数据目录会自动迁移到新的 appId 路径
