# fuckHiFi

## 简介
**fuckHiFi** 是一款 macOS 桌面应用，用于实时监控系统正在播放音频的实际质量。
它不是读取文件标签的工具，而是基于系统输出音频流做频谱分析的工具。应用截获 CoreAudio 的全局输出并执行 DSP 计算，展示当前听感链路中的真实高频信息、能量分布和压缩特征。

## 核心特性
- **系统级音频采集**: 通过 ScreenCaptureKit 读取系统输出缓冲。
- **高分辨率频谱分析**: 8192 点 FFT + Hann 窗函数，在 48kHz 下约 5.86Hz/频点。
- **核心质量指标**:
  - **Cutoff**: 高频可用边界。
  - **Rolloff (99%)**: 有效能量带宽。
  - **HF Energy Ratio**: 20kHz 以上能量占比。
  - **Cliff Drop**: 高频断层强度（用于识别硬切滤波）。
- **多指标融合评级**: REFERENCE / HIFI / CD / STREAMING / LOSSY。
- **可视化与主题**: 实时频谱、指标面板、四套主题。

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
- **Architecture**: 高性能双层架构，Rust 负责 DSP 处理与状态防抖，React 负责 60fps 可视化渲染。
