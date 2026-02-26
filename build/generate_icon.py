#!/usr/bin/env python3
"""
图标生成脚本
生成带有"启动"两个汉字的应用图标
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon():
    """创建多种尺寸的图标文件"""
    sizes = [16, 32, 48, 64, 128, 256, 512, 1024]

    # 颜色方案
    bg_color = (34, 197, 94)  # 绿色背景 (代表启动/运行)
    text_color = (255, 255, 255)  # 白色文字

    images = []

    for size in sizes:
        # 创建透明背景图像
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # 绘制圆角矩形背景
        padding = int(size * 0.08)
        radius = int(size * 0.2)
        draw.rounded_rectangle(
            [padding, padding, size - padding, size - padding],
            radius=radius,
            fill=bg_color
        )

        # 绘制文字 "启动"
        font_size = int(size * 0.35)
        font = None

        # macOS 中文字体路径（按优先级排序）
        font_paths = [
            "/System/Library/Fonts/PingFang.ttc",  # 苹方
            "/System/Library/Fonts/Supplemental/STHeiti Light.ttc",  # 黑体
            "/System/Library/Fonts/STHeiti Light.ttc",
            "/Library/Fonts/Arial Unicode.ttf",
            "/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc",
        ]

        # Linux 中文字体路径
        font_paths.extend([
            "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
            "/usr/share/fonts/truetype/arphic/uming.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        ])

        # Windows 中文字体路径
        font_paths.extend([
            "C:\\Windows\\Fonts\\msyh.ttc",  # 微软雅黑
            "C:\\Windows\\Fonts\\simhei.ttf",  # 黑体
            "C:\\Windows\\Fonts\\simsun.ttc",  # 宋体
        ])

        for font_path in font_paths:
            try:
                font = ImageFont.truetype(font_path, font_size)
                break
            except Exception:
                continue

        if font is None:
            print("警告: 未找到中文字体，使用默认字体")
            font = ImageFont.load_default()

        # 绘制"启动"文字
        text = "启动"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) // 2
        y = (size - text_height) // 2 - bbox[1]
        draw.text((x, y), text, fill=text_color, font=font)

        images.append(img)

    # 保存 PNG (1024x1024 高清版本)
    print("正在生成 icon.png (1024x1024)...")
    images[-1].save('icon.png', 'PNG')

    # 保存 ICO (Windows 图标，包含多种尺寸)
    print("正在生成 icon.ico...")
    ico_images = [img for img, size in zip(images, sizes) if size <= 256]
    ico_images[0].save('icon.ico', format='ICO', sizes=[(s, s) for s in sizes if s <= 256])

    # 生成 macOS iconset (可选，如果将来需要转换为 icns)
    print("正在生成 macOS iconset...")
    iconset_dir = 'icon.iconset'
    os.makedirs(iconset_dir, exist_ok=True)

    icns_sizes = {
        'icon_16x16.png': 16,
        'icon_16x16@2x.png': 32,
        'icon_32x32.png': 32,
        'icon_32x32@2x.png': 64,
        'icon_128x128.png': 128,
        'icon_128x128@2x.png': 256,
        'icon_256x256.png': 256,
        'icon_256x256@2x.png': 512,
        'icon_512x512.png': 512,
        'icon_512x512@2x.png': 1024
    }

    for filename, target_size in icns_sizes.items():
        for img, size in zip(images, sizes):
            if size == target_size:
                img.save(os.path.join(iconset_dir, filename), 'PNG')
                break

    print("\n✅ 图标生成完成!")
    print("生成的文件:")
    print("  - build/icon.png (1024x1024, 用于 Linux/通用)")
    print("  - build/icon.ico (多尺寸, 用于 Windows)")
    print("  - build/icon.iconset/ (macOS iconset 目录)")
    print("\n如需生成 macOS .icns 文件，请运行:")
    print("  cd build && iconutil -c icns icon.iconset")

if __name__ == '__main__':
    create_icon()
