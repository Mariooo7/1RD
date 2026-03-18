# fuckHiFi 开发计划

## 1. 项目概述

**fuckHiFi** 是一个基于 Tauri 构建的高性能 macOS 桌面应用，旨在为发烧友提供“真伪 HiFi”的实时可视化分析。它利用 macOS 原生音频捕获技术（ScreenCaptureKit），结合 Rust 的高性能 FFT（快速傅里叶变换）算法，对系统正在播放的音频进行频谱分析，以判断音源是否为“真无损”或仅为插值的低质量 MP3。

UI/UX 方面追求极致的简约、高级感（Apple Design 风格），支持响应式布局和多主题切换。

## 2. 技术栈

* **核心框架**: Tauri (Rust + Webview) - 保证极速启动和低内存占用。

* **前端 (UI)**:

  * React + TypeScript + Vite

  * Tailwind CSS (样式)

  * Shadcn UI (基础组件)

  * Framer Motion (平滑动画)

  * Recharts / Visx (数据图表)

  * Canvas API (高性能实时频谱绘制)

* **后端 (Rust)**:

  * `screencapturekit` (macOS 12.3+): 捕获系统音频输出（无需内核扩展）。

  * `rustfft`: 高性能频谱分析。

  * `cpal`: 音频设备枚举与管理。

  * `bincode` / `serde`: 前后端数据序列化。

## 3. 核心功能模块

### 3.1 音频引擎 (Rust)

* **系统音频捕获**: 使用 `ScreenCaptureKit` 创建一个仅音频的捕获流，监听系统默认输出设备。

* **实时分析 (DSP)**:

  * **FFT 变换**: 将时域 PCM 数据转换为频域数据。

  * **高频截止检测**: 识别音频信号的高频滚降点（Roll-off point）。

    * 16kHz - 17kHz ≈ 128kbps MP3

    * 18kHz - 19kHz ≈ 192kbps MP3

    * 19.5kHz - 20.5kHz ≈ 320kbps MP3 / AAC

    * <br />

      > 21kHz ≈ CD / Hi-Res 无损

  * **动态范围估算**: 计算有效位深（Bit Depth）。

* **数据流**: 以 60fps 的频率向前端发射经过降采样的频谱数据和分析结果。

### 3.2 用户界面 (Frontend)

* **仪表盘布局 (Bento Grid)**:

  * 可拖拽、可自定义排列的数据卡片。

  * 响应式设计，随窗口大小自动调整列数。

* **可视化组件**:

  * **实时频谱图**: 平滑的 30-60 频段柱状图或曲线图。

  * **真伪鉴定卡**: 显示“真 HiFi”、“疑似 MP3”、“高解析度”等结论，配以置信度。

  * **参数监控**: 实时显示采样率、位深、瞬时码率（估算）。

  * **相位图 (Goniometer)**: (可选) 展示立体声宽度。

* **个性化**:

  * 主题切换：深空灰 (Default)、苹果白、赛博霓虹、复古琥珀。

## 4. 开发步骤

### 第一阶段：项目初始化与基础设施

* [x] 初始化 Tauri + React 项目结构。

* [x] 配置 Tailwind CSS 和 Shadcn UI。

* [x] 搭建 Rust 与 Frontend 的命令 (Command) 和事件 (Event) 通信桥梁。

### 第二阶段：Rust 音频后端实现

* [x] 实现 `ScreenCaptureKit` 音频捕获模块。

* [x] 编写 FFT 分析逻辑，将原始 PCM 数据转换为频谱数据。

* [x] 实现“高频截止”检测算法，输出质量评估结果。

* [x] 优化数据传输性能（避免 JSON 序列化开销，使用二进制缓冲区）。

### 第三阶段：前端可视化与交互

* [x] 开发 Canvas 频谱可视化组件。

* [x] 实现响应式 Grid 布局系统。

* [x] 集成 Rust 传输的分析数据，展示“真伪 HiFi”状态。

* [x] 添加主题切换功能（CSS Variables）。

### 第四阶段：UI 细节打磨与发布

* [x] 添加 Framer Motion 动画（卡片加载、数据变化）。

* [x] 调整窗口毛玻璃效果 (Vibrancy)。

* [ ] 性能优化与内存泄漏检测。

## 5. 验证标准

* [ ] **功能验证**: 打开 Spotify 播放 128kbps 歌曲，应用应提示“低音质/MP3”；播放 Apple Music 无损，应提示“HiFi/无损”。

* [ ] **性能验证**: 开启分析时 CPU 占用率 < 5% (M1/M2 芯片)。

* [ ] **UI 验证**: 调整窗口大小时，卡片布局平滑过渡，无错位。

