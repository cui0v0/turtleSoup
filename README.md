# 海龟汤游戏服务器

## 服务器版本

现在提供两个版本的服务器：

### 1. Node.js 版本（原版）
- 文件: `server.js`
- 启动脚本: `./start_server.sh` 或 `npm start`
- 依赖: Node.js + npm

### 2. Python 版本（新版）
- 文件: `server.py`
- 启动脚本: `./start_server_python.sh`
- 依赖: Python 3.7+

## 快速开始

### 使用 Python 版本

1. **确保已安装 Python 3**
   ```bash
   python3 --version
   ```

2. **运行启动脚本**
   ```bash
   ./start_server_python.sh
   ```
   
   首次运行会自动：
   - 创建虚拟环境
   - 安装所需依赖
   - 启动服务器

3. **访问游戏**
   打开浏览器访问: `http://localhost:3000`

### 使用 Node.js 版本

1. **确保已安装 Node.js**
   ```bash
   node --version
   npm --version
   ```

2. **安装依赖**（首次运行）
   ```bash
   npm install
   ```

3. **启动服务器**
   ```bash
   npm start
   # 或
   ./start_server.sh
   ```

4. **访问游戏**
   打开浏览器访问: `http://localhost:3000`

## 手动安装 Python 依赖

如果需要手动安装依赖：

```bash
# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 运行服务器
python3 server.py
```

## 依赖说明

### Python 版本依赖
- Flask: Web 框架
- Flask-SocketIO: WebSocket 支持
- Flask-CORS: 跨域支持
- python-socketio: Socket.IO 实现
- eventlet: 异步网络库

### Node.js 版本依赖
- express: Web 框架
- socket.io: WebSocket 支持

## 功能特性

两个版本都支持完整的游戏功能：

- ✅ 实时多人游戏
- ✅ 主持人/玩家角色管理
- ✅ 自定义题目和题库
- ✅ 图片上传支持（最大 30MB）
- ✅ 游戏状态持久化
- ✅ 断线重连恢复
- ✅ 提问次数限制（个人配额 + 公共配额）
- ✅ 游戏过程中编辑题目
- ✅ 图片缩放和拖拽查看

## 端口配置

默认端口: 3000

可通过环境变量修改：
```bash
PORT=8080 python3 server.py  # Python
PORT=8080 npm start          # Node.js
```

## 故障排除

### Python 版本

**问题**: 依赖安装失败
```bash
# 升级 pip
pip install --upgrade pip

# 重新安装
pip install -r requirements.txt
```

**问题**: 端口被占用
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>
```

### Node.js 版本

**问题**: node_modules 损坏
```bash
rm -rf node_modules package-lock.json
npm install
```

## 开发说明

- 前端代码: `public/index.html`
- 后端代码: `server.py` (Python) 或 `server.js` (Node.js)
- 数据文件: `data/` 目录
  - `puzzles.json`: 题库
  - `game_state.json`: 游戏状态（自动生成）

## 技术栈

### Python 版本
- Backend: Flask + Flask-SocketIO
- Frontend: Vue.js 3 + Tailwind CSS
- Real-time: Socket.IO (Python)

### Node.js 版本  
- Backend: Express + Socket.IO
- Frontend: Vue.js 3 + Tailwind CSS
- Real-time: Socket.IO (Node.js)
