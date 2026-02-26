# Electron 应用图标配置指南

本文档总结了在 Electron 应用中配置自定义图标的完整流程和注意事项。

## 目录

1. [图标文件格式要求](#图标文件格式要求)
2. [生成图标文件](#生成图标文件)
3. [配置 electron-builder](#配置-electron-builder)
4. [开发模式图标设置](#开发模式图标设置)
5. [常见问题](#常见问题)

---

## 图标文件格式要求

不同平台需要不同格式的图标文件：

| 平台 | 格式 | 建议尺寸 | 说明 |
|------|------|----------|------|
| macOS | `.icns` | 1024x1024 | 包含多种尺寸的图标集 |
| Windows | `.ico` | 256x256 | 包含 16/32/48/64/128/256 等尺寸 |
| Linux | `.png` | 512x512 或 1024x1024 | 单个 PNG 文件 |

## 生成图标文件

### 方法一：使用 Python + Pillow 生成

创建 `build/generate_icon.py`：

```python
#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon():
    sizes = [16, 32, 48, 64, 128, 256, 512, 1024]

    # 颜色方案
    bg_color = (79, 70, 229)  # 背景色
    text_color = (255, 255, 255)  # 文字色

    images = []

    for size in sizes:
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

        # 绘制文字
        font_size = int(size * 0.35)
        font = None
        font_paths = [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/Library/Fonts/Arial Bold.ttf",
        ]

        for font_path in font_paths:
            try:
                font = ImageFont.truetype(font_path, font_size)
                break
            except:
                continue

        if font is None:
            font = ImageFont.load_default()

        text = "M2P"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) // 2
        y = (size - text_height) // 2 - bbox[1]
        draw.text((x, y), text, fill=text_color, font=font)

        images.append(img)

    # 保存 PNG
    images[-1].save('icon.png', 'PNG')

    # 保存 ICO
    ico_images = [img for img, size in zip(images, sizes) if size <= 256]
    ico_images[0].save('icon.ico', format='ICO')

    # 生成 macOS iconset
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

if __name__ == '__main__':
    create_icon()
```

### 生成 macOS icns 文件

```bash
cd build
python3 generate_icon.py
iconutil -c icns icon.iconset
```

### 方法二：使用在线工具

- [CloudConvert](https://cloudconvert.com/png-to-icns)
- [iConvert Icons](https://iconverticons.com/online/)

## 配置 electron-builder

在 `package.json` 中配置：

```json
{
  "build": {
    "appId": "com.yourapp.app",
    "productName": "YourApp",
    "directories": {
      "output": "dist"
    },
    "mac": {
      "category": "public.app-category.productivity",
      "icon": "build/icon.icns",
      "target": ["dmg", "zip"]
    },
    "win": {
      "icon": "build/icon.ico",
      "target": ["nsis", "portable"]
    },
    "linux": {
      "icon": "build/icon.png",
      "target": ["AppImage", "deb"],
      "category": "Office"
    }
  }
}
```

**重要**：图标路径相对于项目根目录。

## 开发模式图标设置

### 问题

打包后的应用会自动使用配置的图标，但**开发模式**（`npm start` 或 `electron .`）下，macOS Dock 图标默认显示 Electron 图标。

### 解决方案

在 `main.js` 中手动设置 Dock 图标：

```javascript
const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');

// 图标路径
const iconPath = path.join(__dirname, '../build/icon.png');

// 创建窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,  // Windows/Linux 窗口图标
    webPreferences: {
      // ...
    }
  });
}

// 应用启动
app.whenReady().then(() => {
  // 关键：设置 macOS Dock 图标
  if (process.platform === 'darwin') {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      app.dock.setIcon(icon);
    }
  }

  createWindow();
});
```

### 代码说明

1. **`icon` 属性**：设置窗口图标，主要影响 Windows 和 Linux
2. **`app.dock.setIcon()`**：专门用于设置 macOS Dock 图标
3. **`nativeImage.createFromPath()`**：从文件路径创建原生图像对象
4. **平台判断**：`process.platform === 'darwin'` 确保只在 macOS 上执行

## 常见问题

### Q1: 打包后图标正常，但开发模式显示默认图标

**原因**：macOS 开发模式下需要手动调用 `app.dock.setIcon()`

**解决**：参考上面的"开发模式图标设置"

### Q2: 图标显示但质量很差/模糊

**原因**：图标尺寸太小

**解决**：
- macOS 需要 1024x1024 的源图像
- Windows 至少需要 256x256
- 确保 iconset 中包含 @2x 版本（Retina 屏幕）

### Q3: ICO 文件生成失败

**原因**：Pillow 对 ICO 格式有尺寸限制

**解决**：ICO 中包含的最大尺寸不要超过 256x256

### Q4: iconutil 命令找不到

**原因**：只有 macOS 系统有此命令

**解决**：
- 在 macOS 上生成 icns 文件
- 或使用在线转换工具

### Q5: 图标缓存问题

**症状**：更新图标后仍显示旧图标

**解决**：
```bash
# macOS 清除图标缓存
sudo rm -rf /Library/Caches/com.apple.iconservices.store
sudo find /private/var/folders/ -name com.apple.iconservices -exec rm -rf {} \;
killall Finder
killall Dock

# 或者重启电脑
```

## 文件结构示例

```
your-electron-app/
├── build/
│   ├── generate_icon.py
│   ├── icon.png          # 1024x1024 源文件
│   ├── icon.icns         # macOS 图标
│   ├── icon.ico          # Windows 图标
│   └── icon.iconset/     # macOS iconset 目录
│       ├── icon_16x16.png
│       ├── icon_16x16@2x.png
│       ├── icon_32x32.png
│       ├── icon_32x32@2x.png
│       ├── icon_128x128.png
│       ├── icon_128x128@2x.png
│       ├── icon_256x256.png
│       ├── icon_256x256@2x.png
│       ├── icon_512x512.png
│       └── icon_512x512@2x.png
├── electron/
│   └── main.js
├── package.json
└── ...
```

## 总结

1. **准备三种格式**：`.icns`（macOS）、`.ico`（Windows）、`.png`（Linux）
2. **配置 electron-builder**：在 `package.json` 的 `build` 字段中指定图标路径
3. **开发模式特殊处理**：macOS 需要调用 `app.dock.setIcon()` 才能显示自定义图标
4. **使用高分辨率源文件**：建议 1024x1024 PNG 作为源文件
