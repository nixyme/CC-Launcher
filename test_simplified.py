#!/usr/bin/env python3
"""
测试简化后的功能
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from project_manager import ProjectManager

def test_simplified_workflow():
    """测试简化后的工作流程"""
    pm = ProjectManager(data_file="data/projects_test_simplified.json")

    print("=" * 60)
    print("测试简化后的工作流程")
    print("=" * 60)

    # 1. 添加项目
    print("\n1. 添加项目...")
    commands = [
        "./run_script.sh",
        "./run.sh",
        "npm start"
    ]

    project = pm.add_project(
        name="简化测试项目",
        path="/tmp/test",
        default_command=commands[0],
        result_path="/tmp/results",
        commands=commands
    )
    print(f"✓ 项目添加成功")
    print(f"  命令列表: {len(commands)} 条")
    for i, cmd in enumerate(commands, 1):
        print(f"    {i}. {cmd}")

    # 2. 模拟编辑命令(直接更新)
    print("\n2. 编辑命令列表(模拟用户在文本框中编辑)...")
    new_commands = [
        "# 清理缓存",
        "rm -rf .cache",
        "",
        "# 构建项目",
        "npm run build",
        "",
        "# 运行测试",
        "npm test"
    ]

    # 过滤空行和注释
    filtered_commands = [cmd.strip() for cmd in new_commands if cmd.strip() and not cmd.strip().startswith('#')]

    pm.update_project(
        project['id'],
        commands=filtered_commands
    )
    print(f"✓ 命令列表更新成功")
    print(f"  新命令数量: {len(filtered_commands)} 条")
    for i, cmd in enumerate(filtered_commands, 1):
        print(f"    {i}. {cmd}")

    # 3. 验证自动保存
    print("\n3. 验证自动保存(重新加载项目)...")
    loaded = pm.get_project(project['id'])
    if loaded['commands'] == filtered_commands:
        print(f"✓ 自动保存验证成功")
        print(f"  保存的命令: {loaded['commands']}")
    else:
        print(f"✗ 自动保存验证失败")
        return False

    # 4. 模拟执行命令
    print("\n4. 模拟执行命令...")
    combined = ' && '.join(filtered_commands)
    print(f"✓ 将执行以下命令:")
    print(f"  {combined}")

    print("\n" + "=" * 60)
    print("简化工作流程测试通过! ✓")
    print("=" * 60)

    # 清理
    os.remove("data/projects_test_simplified.json")
    return True

if __name__ == "__main__":
    success = test_simplified_workflow()
    sys.exit(0 if success else 1)
