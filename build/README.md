# 图标文件说明

本目录包含 CC万能启动器 应用程序的图标文件。

## 图标设计

- **文字内容**: "启动" 两个汉字
- **背景颜色**: 绿色 (RGB: 34, 197, 94) - 代表启动/运行的含义
- **文字颜色**: 白色 - 确保清晰可读
- **形状**: 圆角矩形 - 现代化设计风格

## 文件列表

| 文件名 | 格式 | 尺寸 | 用途 |
|--------|------|------|------|
| `icon.png` | PNG | 1024x1024 | macOS/Linux 应用图标 |
| `icon.ico` | ICO | 多尺寸 | Windows 应用图标 |
| `icon.icns` | ICNS | 多尺寸 | macOS 打包专用图标 |
| `icon.iconset/` | 目录 | - | macOS iconset (用于生成 .icns) |

## 图标生成

使用 `generate_icon.py` 脚本生成图标：

```bash
cd build
python3 generate_icon.py
```

### 重新生成 macOS .icns 文件

如果需要重新生成 macOS 的 .icns 文件：

```bash
cd build
iconutil -c icns icon.iconset
```

## 技术细节

### 支持的尺寸

图标生成脚本会自动创建以下尺寸：
- 16x16, 32x32, 48x48, 64x64
- 128x128, 256x256, 512x512, 1024x1024
- Retina 版本 (@2x): 32x32, 64x64, 256x256, 512x512, 1024x1024

### 中文字体支持

脚本会自动查找系统中的中文字体：

**macOS**:
- 苹方 (PingFang)
- 黑体 (STHeiti)
- ヒラギノ角ゴシック

**Linux**:
- 文泉驿正黑 (WenQuanYi Zen Hei)
- AR PL UMing
- Noto Sans CJK

**Windows**:
- 微软雅黑 (Microsoft YaHei)
- 黑体 (SimHei)
- 宋体 (SimSun)

## 应用中的使用

图标在应用启动时自动加载，具体实现在 `src/gui.py` 的 `_set_window_icon()` 方法中：

- **Windows**: 使用 `icon.ico`
- **macOS/Linux**: 使用 `icon.png`

## 自定义图标

如需修改图标设计：

1. 编辑 `generate_icon.py` 中的配置：
   ```python
   # 颜色方案
   bg_color = (34, 197, 94)  # 背景色
   text_color = (255, 255, 255)  # 文字色

   # 文字内容
   text = "启动"
   ```

2. 重新运行生成脚本：
   ```bash
   python3 generate_icon.py
   ```

3. (可选) 重新生成 .icns：
   ```bash
   iconutil -c icns icon.iconset
   ```

## 注意事项

- 图标文件应与 `src/gui.py` 保持在正确的相对路径
- 删除或移动图标文件不会导致应用崩溃，只会在控制台输出警告
- 建议使用高对比度的颜色组合，确保在不同背景下都清晰可见
