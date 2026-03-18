# fuckHiFi

## 简介
**fuckHiFi** 是一款 macOS 桌面应用，用于实时分析系统音频质量，鉴别“真伪 HiFi”。
它使用 Tauri (Rust) 进行高性能音频捕获与 FFT 分析，前端使用 React + Canvas 呈现极简风格的频谱可视化。

## 核心特性
- **实时频谱分析**: 使用 8192 点 FFT 算法，结合 Hann 窗函数，提供极高精度的频谱可视化。
- **真伪 Hi-Res 鉴定**:
  - **Cutoff Detection**: 自动识别高频截止频率。
  - **Rolloff (99%)**: 计算 99% 能量的滚降点，更准确地判断有效频宽。
  - **HF Energy Ratio**: 分析高频能量占比，识别升频（Upsampling）痕迹。
  - **Cliff Drop**: 检测 1kHz 频宽内的悬崖式跌落（>30dB），精准识别有损压缩硬切。
- **智能评级系统**: 自动将音频流评级为 REFERENCE / HIFI / CD / STREAMING / LOSSY。
- **自适应布局**: 响应式设计，支持从窄屏手机比例到宽屏的全尺寸显示，数据面板自动悬浮或堆叠。
- **极简设计**: 提供 Obsidian, Frost, Crimson, Ocean 四款精美主题，支持高帧率流畅动画。

## 开发环境要求
- **macOS** (必须 12.3+, 依赖 ScreenCaptureKit)
- **Rust** (需安装 Cargo)
- **Node.js** (v18+)

## 安装与运行

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动开发模式**
   ```bash
   npm run tauri dev
   ```
   *注意：首次运行会编译 Rust 后端，需要几分钟时间。*

3. **构建发布版本**
   ```bash
   npm run tauri build
   ```

## 权限说明 (重要)
由于使用了 `ScreenCaptureKit` 捕获系统音频，**必须授予运行该应用的终端（如 VS Code 或 Terminal）“屏幕录制”权限**。
- 如果没有弹出权限请求，请手动前往：`系统设置` -> `隐私与安全性` -> `屏幕录制`，添加并勾选你的终端应用。
- 如果仍无数据，请尝试重启终端。

## 技术栈
- **Frontend**: React 18, Tailwind CSS, Framer Motion, HTML5 Canvas
- **Backend**: Rust, Tauri 2.0, RustFFT, ScreenCaptureKit
- **Architecture**: 高性能双层架构，Rust 负责 DSP 处理与 ScreenCapture，React 负责 60fps 可视化渲染。
