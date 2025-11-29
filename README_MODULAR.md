# 海龟汤游戏 - 模块化版本

基于 Vue 3 Composition API 的多人在线海龟汤游戏，采用模块化架构重构。

## 🚀 快速开始

### 方式一：使用启动脚本（推荐）

```bash
./start.sh
```

### 方式二：手动启动

**1. 启动后端服务器（Python）**

```bash
python3 server.py
```

后端将运行在：`http://localhost:5000`

**2. 启动前端开发服务器（Vite）**

```bash
npm run dev
```

前端将运行在：`http://localhost:3000`

**3. 访问游戏**

打开浏览器访问：`http://localhost:3000`

## 📁 项目结构

```
turtleSoup/
├── src/                          # 源代码目录
│   ├── App.vue                   # 主应用组件
│   ├── main.js                   # 应用入口
│   ├── components/               # Vue 组件
│   │   ├── LoginScreen.vue       # 登录界面
│   │   ├── GameHeader.vue        # 游戏头部
│   │   ├── PuzzleDisplay.vue     # 题目展示
│   │   ├── QuestionHistory.vue   # 提问历史
│   │   ├── QuestionInput.vue     # 提问输入框
│   │   ├── PlayerList.vue        # 玩家列表
│   │   ├── HostControls.vue      # 主持人控制
│   │   ├── PuzzleSelectionModal.vue      # 题目选择弹窗
│   │   ├── CustomPuzzleModal.vue         # 自定义题目弹窗
│   │   ├── PuzzlePreviewModal.vue        # 题目预览弹窗
│   │   ├── ImageModal.vue                # 图片查看弹窗
│   │   └── RecoveryModal.vue             # 恢复游戏弹窗
│   ├── composables/              # 组合式函数
│   │   ├── useGameState.js       # 游戏状态管理
│   │   ├── useGameTimer.js       # 游戏计时器
│   │   ├── useImageZoom.js       # 图片缩放功能
│   │   └── useSocketEvents.js    # Socket 事件处理
│   └── utils/                    # 工具函数
│       ├── socket.js             # Socket.IO 连接管理
│       └── storage.js            # 本地存储封装
├── public/                       # 静态资源
│   ├── tailwindcss_browser@4.js  # Tailwind CSS
│   ├── vue.global.min.js         # Vue 3 CDN（备用）
│   └── puzzles.json              # 题库数据
├── data/                         # 游戏数据
│   ├── game_state.json           # 游戏状态持久化
│   └── puzzles.json              # 题库（软链接）
├── index.html                    # 主 HTML 文件
├── vite.config.js                # Vite 配置
├── jsconfig.json                 # JavaScript 配置
├── package.json                  # 依赖管理
├── server.py                     # Python 后端服务器
├── requirements.txt              # Python 依赖
└── start.sh                      # 启动脚本

```

## 🛠️ 技术栈

### 前端
- **Vue 3** - 使用 Composition API
- **Vite** - 开发服务器和构建工具
- **Socket.IO Client** - WebSocket 实时通信
- **Tailwind CSS** - UI 样式框架

### 后端
- **Python 3** - 服务端语言
- **Flask** - Web 框架
- **Flask-SocketIO** - WebSocket 支持
- **Flask-CORS** - 跨域支持

## 🎮 功能特性

- ✅ 多人实时在线游戏
- ✅ 主持人/玩家角色系统
- ✅ 题库选择 + 自定义题目
- ✅ 题目编辑功能
- ✅ 图片上传和查看（支持缩放、拖拽）
- ✅ 提问次数限制（个人 + 公共池）
- ✅ 游戏状态持久化
- ✅ 服务器重启恢复
- ✅ 游戏时长统计
- ✅ 响应式设计

## 📝 开发说明

### 安装依赖

**前端依赖**
```bash
npm install
```

**后端依赖**
```bash
pip3 install -r requirements.txt
```

### 开发模式

前端支持热更新，修改代码后浏览器会自动刷新。

### 构建生产版本

```bash
npm run build
```

构建产物会输出到 `dist/` 目录。

## 🔧 配置说明

### 端口配置

- **前端（Vite）**: 3000 端口
- **后端（Flask）**: 5000 端口

修改端口：
- 前端：编辑 `vite.config.js` 中的 `server.port`
- 后端：编辑 `server.py` 中的 `PORT` 变量或设置环境变量 `PORT`

### Socket.IO 连接

前端通过 Vite 代理连接到后端，配置在 `vite.config.js` 中：

```javascript
proxy: {
  '/socket.io': {
    target: 'http://localhost:5000',
    ws: true,
    changeOrigin: true
  }
}
```

## 📚 架构说明

### 组件化设计

- **LoginScreen**: 登录界面组件
- **GameHeader**: 顶部导航栏，显示连接状态和用户信息
- **PuzzleDisplay**: 题目展示区域，支持图片显示和编辑
- **QuestionHistory**: 提问历史列表，主持人可回答问题
- **QuestionInput**: 提问输入框，带限制检查
- **PlayerList**: 在线玩家列表
- **HostControls**: 主持人控制面板
- **各种 Modal**: 题目选择、编辑、预览、图片查看等弹窗

### 状态管理

使用 Composables 管理应用状态：

- **useGameState**: 游戏核心状态（玩家、题目、历史等）
- **useGameTimer**: 游戏时长计时
- **useImageZoom**: 图片缩放和拖拽
- **useSocketEvents**: Socket 事件监听和处理

### 工具函数

- **socket.js**: Socket.IO 连接初始化和管理
- **storage.js**: localStorage 封装，统一管理本地存储

## 🐛 常见问题

### 点击"加入游戏"无反应

1. 检查浏览器控制台是否有错误
2. 确认后端服务器在 5000 端口运行
3. 确认前端服务器在 3000 端口运行
4. 检查 Socket.IO 是否成功加载（CDN）

### 服务器连接失败

1. 检查防火墙设置
2. 确认端口未被占用：`lsof -ti:3000` 和 `lsof -ti:5000`
3. 查看后端日志输出

### 热更新不工作

重启 Vite 开发服务器：
```bash
npm run dev
```

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！
