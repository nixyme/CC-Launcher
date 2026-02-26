"""
项目管理模块
负责项目数据的增删改查
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Optional
import uuid
import shutil
from datetime import datetime


class ProjectManager:
    """项目管理器类"""

    def __init__(self, data_file: str = None):
        """
        初始化项目管理器

        Args:
            data_file: 项目数据文件路径
        """
        if data_file is None:
            # 检查是否有环境变量指定数据目录
            app_data_dir = os.environ.get('APP_DATA_DIR', '')
            if app_data_dir:
                data_file = os.path.join(app_data_dir, 'data', 'projects.json')
            else:
                data_file = 'data/projects.json'

        self.data_file = Path(data_file)
        self.backup_file = self.data_file.parent / 'projects_backup.json'
        self._ensure_data_file()

        # 启动时立即备份
        self._create_backup()

    def _ensure_data_file(self):
        """确保数据文件存在"""
        # 确保数据目录存在
        self.data_file.parent.mkdir(parents=True, exist_ok=True)

        # 如果文件不存在,创建空的项目列表
        if not self.data_file.exists():
            self._save_projects([])

    def _load_projects(self) -> List[Dict]:
        """
        加载项目列表

        Returns:
            项目列表
        """
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"加载项目数据失败: {e}")
            return []

    def _save_projects(self, projects: List[Dict]):
        """
        保存项目列表，如果有变化则自动备份

        Args:
            projects: 项目列表
        """
        try:
            # 先读取当前内容，用于比较是否有变化
            has_changes = True
            if self.data_file.exists():
                try:
                    with open(self.data_file, 'r', encoding='utf-8') as f:
                        old_data = json.load(f)
                    # 比较新旧数据是否相同
                    has_changes = (old_data != projects)
                except:
                    # 如果读取失败，认为有变化
                    has_changes = True

            # 保存新数据
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(projects, f, ensure_ascii=False, indent=2)

            # 如果有变化，创建备份
            if has_changes:
                self._create_backup()

        except Exception as e:
            print(f"保存项目数据失败: {e}")
            raise

    def add_project(self, name: str, path: str, default_command: str,
                   result_path: str, commands: Optional[List[str]] = None) -> Dict:
        """
        添加新项目

        Args:
            name: 项目名称
            path: 项目路径
            default_command: 默认指令(兼容旧版)
            result_path: 查看结果路径
            commands: 命令列表(新版)

        Returns:
            添加的项目信息
        """
        projects = self._load_projects()

        # 检查项目名称是否已存在
        if any(p['name'] == name for p in projects):
            raise ValueError(f"项目名称 '{name}' 已存在")

        # 验证路径存在
        if not os.path.exists(path):
            raise ValueError(f"项目路径不存在: {path}")

        # 处理命令:优先使用 commands,否则将 default_command 转为列表
        if commands is None:
            commands = [default_command] if default_command else []

        # 创建新项目
        project = {
            'id': str(uuid.uuid4()),
            'name': name,
            'path': path,
            'default_command': default_command,  # 保留兼容性
            'commands': commands,  # 新字段
            'result_path': result_path,
            'order': len(projects)  # 排序字段
        }

        projects.append(project)
        self._save_projects(projects)

        return project

    def update_project(self, project_id: str, name: Optional[str] = None,
                      path: Optional[str] = None,
                      default_command: Optional[str] = None,
                      result_path: Optional[str] = None,
                      commands: Optional[List[str]] = None) -> Dict:
        """
        更新项目信息

        Args:
            project_id: 项目ID
            name: 新的项目名称
            path: 新的项目路径
            default_command: 新的默认指令
            result_path: 新的查看结果路径
            commands: 命令列表

        Returns:
            更新后的项目信息
        """
        projects = self._load_projects()

        # 查找项目
        project = None
        for p in projects:
            if p['id'] == project_id:
                project = p
                break

        if not project:
            raise ValueError(f"项目不存在: {project_id}")

        # 更新字段
        if name is not None:
            # 检查新名称是否与其他项目冲突
            if any(p['name'] == name and p['id'] != project_id for p in projects):
                raise ValueError(f"项目名称 '{name}' 已存在")
            project['name'] = name

        if path is not None:
            if not os.path.exists(path):
                raise ValueError(f"项目路径不存在: {path}")
            project['path'] = path

        if default_command is not None:
            project['default_command'] = default_command

        if result_path is not None:
            project['result_path'] = result_path

        if commands is not None:
            project['commands'] = commands

        self._save_projects(projects)
        return project

    def delete_project(self, project_id: str) -> bool:
        """
        删除项目

        Args:
            project_id: 项目ID

        Returns:
            如果项目存在并成功删除返回True,否则返回False
        """
        projects = self._load_projects()
        original_count = len(projects)
        projects = [p for p in projects if p['id'] != project_id]

        # 检查是否真的删除了项目
        if len(projects) < original_count:
            self._save_projects(projects)
            return True
        return False

    def get_project(self, project_id: str) -> Optional[Dict]:
        """
        获取单个项目信息

        Args:
            project_id: 项目ID

        Returns:
            项目信息,如果不存在则返回None
        """
        projects = self._load_projects()
        for project in projects:
            if project['id'] == project_id:
                return project
        return None

    def get_all_projects(self) -> List[Dict]:
        """
        获取所有项目

        Returns:
            项目列表(按order字段排序)
        """
        projects = self._load_projects()
        # 确保所有项目都有order字段
        for i, project in enumerate(projects):
            if 'order' not in project:
                project['order'] = i
            if 'commands' not in project:
                # 兼容旧数据,将default_command转为commands列表
                project['commands'] = [project.get('default_command', '')] if project.get('default_command') else []

        # 按order排序
        projects.sort(key=lambda x: x.get('order', 0))
        return projects

    def reorder_projects(self, project_ids: List[str]) -> bool:
        """
        重新排序项目

        Args:
            project_ids: 按新顺序排列的项目ID列表

        Returns:
            是否成功
        """
        projects = self._load_projects()

        # 创建ID到项目的映射
        id_to_project = {p['id']: p for p in projects}

        # 按新顺序重新排列并更新order字段
        reordered = []
        for i, pid in enumerate(project_ids):
            if pid in id_to_project:
                project = id_to_project[pid]
                project['order'] = i
                reordered.append(project)

        # 添加不在列表中的项目(以防万一)
        for project in projects:
            if project['id'] not in project_ids:
                project['order'] = len(reordered)
                reordered.append(project)

        self._save_projects(reordered)
        return True

    def _create_backup(self):
        """
        创建项目配置备份，使用固定文件名，有变化时覆盖

        备份文件名: projects_backup.json
        """
        try:
            # 检查源文件是否存在且有内容
            if not self.data_file.exists() or self.data_file.stat().st_size == 0:
                return

            # 复制文件到备份文件（覆盖）
            shutil.copy2(self.data_file, self.backup_file)
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"✅ 项目配置已备份 ({timestamp})")

        except Exception as e:
            print(f"❌ 创建备份失败: {e}")
