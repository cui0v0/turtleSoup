#!/usr/bin/env python3
"""
启动脚本 - 同时启动前后端服务
"""
import subprocess
import sys
import os
import signal
import time

# 存储子进程
processes = []

def signal_handler(sig, frame):
    """处理 Ctrl+C 信号"""
    print('\n\n🛑 正在停止所有服务...')
    for process in processes:
        try:
            process.terminate()
            process.wait(timeout=3)
        except:
            process.kill()
    print('✅ 所有服务已停止')
    sys.exit(0)

# 注册信号处理器
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def check_port(port):
    """检查端口是否被占用"""
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('localhost', port))
    sock.close()
    return result == 0

def main():
    print('🐢 启动海龟汤游戏服务...\n')
    
    # 检查端口占用
    if check_port(3000):
        print('⚠️  警告: 3000 端口已被占用')
        response = input('是否继续？(y/N): ')
        if response.lower() != 'y':
            sys.exit(1)
    
    # 启动 Python 服务器（同时提供静态文件和 WebSocket）
    print('🚀 启动服务器 (Python + Flask-SocketIO)...')
    print('   - 静态文件服务: public/')
    print('   - WebSocket 服务: Socket.IO')
    try:
        # 直接运行 server.py，输出会显示在主进程
        backend = subprocess.Popen(
            [sys.executable, 'server.py'],
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        processes.append(backend)
        time.sleep(2)  # 等待服务器启动
        print('\n✅ 服务器已启动\n')
    except Exception as e:
        print(f'❌ 服务器启动失败: {e}')
        sys.exit(1)
    
    print('━' * 60)
    print('✨ 服务启动成功！')
    print('📱 游戏地址: http://localhost:3000')
    print('   (Python 服务器提供静态文件 + WebSocket)')
    print('━' * 60)
    print('\n按 Ctrl+C 停止服务\n')
    
    # 等待后端进程结束
    try:
        backend.wait()
    except KeyboardInterrupt:
        pass
    finally:
        signal_handler(None, None)

if __name__ == '__main__':
    main()
