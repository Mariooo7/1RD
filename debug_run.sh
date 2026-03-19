#!/bin/bash
# 启动 1RD 并将日志输出到终端和文件
APP_PATH="./src-tauri/target/release/bundle/macos/1RD.app/Contents/MacOS/onerd"
LOG_FILE="1rd_debug.log"

echo "🚀 Starting 1RD in debug mode..."
echo "📝 Logs will be saved to $LOG_FILE"
echo "----------------------------------------"

# 运行 App 并同时输出到屏幕和文件
"$APP_PATH" 2>&1 | tee "$LOG_FILE"
