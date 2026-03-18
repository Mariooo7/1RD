#!/bin/bash
# 启动 fuckHiFi 并将日志输出到终端和文件
APP_PATH="./src-tauri/target/release/bundle/macos/fuckhifi.app/Contents/MacOS/fuckhifi"
LOG_FILE="fuckhifi_debug.log"

echo "🚀 Starting fuckHiFi in debug mode..."
echo "📝 Logs will be saved to $LOG_FILE"
echo "----------------------------------------"

# 运行 App 并同时输出到屏幕和文件
"$APP_PATH" 2>&1 | tee "$LOG_FILE"
