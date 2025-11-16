"""
项目管理模块
负责项目数据的增删改查
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Optional
import uuid


class ProjectManager:
    """项目管理器类"""

    def __init__(self, data_file: str = "data/projects.json"):
        """
        初始化项目管理器

        Args:
            data_file: 项目数据文件路径
        """
        self.data_file = Path(data_file)
        self._ensure_data_file()

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
        保存项目列表

        Args:
            projects: 项目列表
        """
        try:
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(projects, f, ensure_ascii=False, indent=2)
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

    def delete_project(self, project_id: str):
        """
        删除项目

        Args:
            project_id: 项目ID
        """
        projects = self._load_projects()
        projects = [p for p in projects if p['id'] != project_id]
        self._save_projects(projects)

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
