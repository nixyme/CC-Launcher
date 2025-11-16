#!/usr/bin/env python3
"""
测试命令列表功能
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from project_manager import ProjectManager

def test_commands():
    """测试命令列表功能"""
    pm = ProjectManager(data_file="data/projects_test.json")

    print("=" * 60)
    print("测试 1: 添加项目(使用命令列表)")
    print("=" * 60)

    commands = [
        "echo 'First command'",
        "echo 'Second command'",
        "echo 'Third command'"
    ]

    try:
        project = pm.add_project(
            name="测试项目",
            path="/tmp",
            default_command=commands[0],
            result_path="/tmp/results",
            commands=commands
        )
        print(f"✓ 项目添加成功: {project['name']}")
        print(f"  命令数量: {len(project['commands'])}")
        print(f"  命令列表:")
        for i, cmd in enumerate(project['commands'], 1):
            print(f"    {i}. {cmd}")
    except Exception as e:
        print(f"✗ 添加失败: {e}")
        return False

    print("\n" + "=" * 60)
    print("测试 2: 更新命令列表")
    print("=" * 60)

    new_commands = [
        "echo 'Updated first'",
        "echo 'Updated second'",
        "echo 'New third'",
        "echo 'New fourth'"
    ]

    try:
        updated = pm.update_project(
            project['id'],
            commands=new_commands
        )
        print(f"✓ 命令列表更新成功")
        print(f"  新命令数量: {len(updated['commands'])}")
        print(f"  新命令列表:")
        for i, cmd in enumerate(updated['commands'], 1):
            print(f"    {i}. {cmd}")
    except Exception as e:
        print(f"✗ 更新失败: {e}")
        return False

    print("\n" + "=" * 60)
    print("测试 3: 加载项目(验证持久化)")
    print("=" * 60)

    loaded = pm.get_project(project['id'])
    if loaded and loaded['commands'] == new_commands:
        print(f"✓ 数据持久化成功")
        print(f"  加载的命令数量: {len(loaded['commands'])}")
    else:
        print(f"✗ 数据持久化失败")
        return False

    print("\n" + "=" * 60)
    print("测试 4: 兼容性测试(旧版数据)")
    print("=" * 60)

    # 模拟旧版本数据(只有default_command)
    old_style = pm.add_project(
        name="旧版项目",
        path="/tmp",
        default_command="echo 'Old style command'",
        result_path="/tmp/results"
    )

    # 检查是否自动转换为命令列表
    all_projects = pm.get_all_projects()
    old_project = [p for p in all_projects if p['name'] == "旧版项目"][0]

    if 'commands' in old_project and len(old_project['commands']) == 1:
        print(f"✓ 旧版数据兼容性测试通过")
        print(f"  自动转换的命令: {old_project['commands'][0]}")
    else:
        print(f"✗ 旧版数据兼容性测试失败")
        return False

    print("\n" + "=" * 60)
    print("所有测试通过! ✓")
    print("=" * 60)

    # 清理测试文件
    os.remove("data/projects_test.json")

    return True

if __name__ == "__main__":
    success = test_commands()
    sys.exit(0 if success else 1)
