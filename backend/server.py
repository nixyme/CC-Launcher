#!/usr/bin/env python3
"""
Flask 后端服务器
提供项目管理的 REST API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
from pathlib import Path

# 添加 src 目录到 Python 路径
src_path = Path(__file__).parent.parent / 'src'
sys.path.insert(0, str(src_path))

from project_manager import ProjectManager

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化项目管理器
project_manager = ProjectManager()


@app.route('/projects', methods=['GET'])
def get_projects():
    """获取所有项目"""
    try:
        projects = project_manager.get_all_projects()
        return jsonify(projects), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/projects', methods=['POST'])
def create_project():
    """创建新项目"""
    try:
        data = request.get_json()

        required_fields = ['name', 'path', 'default_command', 'result_path']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        project = project_manager.add_project(
            name=data['name'],
            path=data['path'],
            default_command=data['default_command'],
            result_path=data['result_path'],
            commands=data.get('commands')
        )

        return jsonify(project), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    """获取单个项目"""
    try:
        project = project_manager.get_project(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        return jsonify(project), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/projects/<project_id>', methods=['PUT'])
def update_project(project_id):
    """更新项目"""
    try:
        data = request.get_json()

        project = project_manager.update_project(
            project_id=project_id,
            name=data.get('name'),
            path=data.get('path'),
            default_command=data.get('default_command'),
            result_path=data.get('result_path'),
            commands=data.get('commands')
        )

        if not project:
            return jsonify({'error': 'Project not found'}), 404

        return jsonify(project), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """删除项目"""
    try:
        success = project_manager.delete_project(project_id)
        if not success:
            return jsonify({'error': 'Project not found'}), 404
        return jsonify({'message': 'Project deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/projects/reorder', methods=['POST'])
def reorder_projects():
    """重新排序项目"""
    try:
        data = request.get_json()
        project_ids = data.get('project_ids', [])

        if not project_ids:
            return jsonify({'error': 'project_ids is required'}), 400

        success = project_manager.reorder_projects(project_ids)
        return jsonify({'success': success}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({'status': 'ok'}), 200


if __name__ == '__main__':
    print("🚀 启动 Flask 后端服务...")
    print("📍 API 地址: http://localhost:5283")
    app.run(host='0.0.0.0', port=5283, debug=False)
