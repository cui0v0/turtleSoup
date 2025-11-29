console.log('=== Starting module loading ===');
const express = require('express');
console.log('✓ express loaded');
const http = require('http');
console.log('✓ http loaded');

// Socket.IO 配置优化 - 减少启动时的网络检查
const { Server } = require('socket.io');
console.log('✓ socket.io loaded');

const path = require('path');
console.log('✓ path loaded');
const fs = require('fs');
console.log('✓ fs loaded');

console.log('=== Creating server instances ===');
const app = express();
const server = http.createServer(app);

// 优化 Socket.IO 配置，禁用不必要的功能以加快启动
const io = new Server(server, {
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: 30e6, // 增加到 30MB 以支持图片上传
    transports: ['websocket', 'polling'], // 优先使用 websocket
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

console.log('Starting Turtle Soup server...');

// 静态文件托管
app.use(express.static(path.join(__dirname, 'public')));

console.log('Loading puzzle database...');
// 读取题库
let puzzles = [];
try {
    const data = fs.readFileSync(path.join(__dirname, 'data', 'puzzles.json'), 'utf8');
    puzzles = JSON.parse(data);
    console.log(`Loaded ${puzzles.length} puzzles successfully`);
} catch (err) {
    console.error("无法读取题库:", err);
}

// 游戏状态持久化路径
const GAME_STATE_FILE = path.join(__dirname, 'data', 'game_state.json');

// 保存游戏状态到文件
const saveGameState = () => {
    try {
        // 只在游戏进行中时保存
        if (gameState.currentPuzzle) {
            const stateToSave = {
                currentPuzzle: gameState.currentPuzzle,
                history: gameState.history,
                players: gameState.players.map(p => ({
                    userId: p.userId,
                    nickname: p.nickname,
                    isHost: p.isHost,
                    isOnline: false // 重启后都视为离线
                })),
                savedAt: Date.now(),
                limits: gameState.limits,
                startTime: gameState.startTime
            };
            fs.writeFileSync(GAME_STATE_FILE, JSON.stringify(stateToSave, null, 2));
            console.log('Game state saved to file');
        }
    } catch (err) {
        console.error('Failed to save game state:', err);
    }
};

// 从文件加载游戏状态
const loadGameState = () => {
    console.log('Checking for saved game state...');
    try {
        if (fs.existsSync(GAME_STATE_FILE)) {
            const data = fs.readFileSync(GAME_STATE_FILE, 'utf8');
            const savedState = JSON.parse(data);
            
            // 检查保存时间（例如：24小时内有效）
            const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
            if (Date.now() - savedState.savedAt < TWENTY_FOUR_HOURS) {
                console.log('Found valid saved game state from:', new Date(savedState.savedAt));
                return savedState;
            } else {
                console.log('Saved game state expired, deleting...');
                fs.unlinkSync(GAME_STATE_FILE);
            }
        } else {
            console.log('No saved game state found');
        }
    } catch (err) {
        console.error('Failed to load game state:', err);
    }
    return null;
};

// 清除保存的游戏状态
const clearSavedGameState = () => {
    try {
        if (fs.existsSync(GAME_STATE_FILE)) {
            fs.unlinkSync(GAME_STATE_FILE);
            console.log('Saved game state cleared');
        }
    } catch (err) {
        console.error('Failed to clear saved game state:', err);
    }
};

// 尝试加载之前的游戏状态
const savedState = loadGameState();
const hasRecoverableGame = !!savedState;

if (hasRecoverableGame) {
    console.log('Game state will be available for recovery');
} else {
    console.log('Starting fresh game state');
}

// 游戏状态
const serverSessionId = Date.now().toString(); // 服务器启动时的唯一会话ID
let gameState = {
    currentPuzzle: savedState?.currentPuzzle || null,
    history: savedState?.history || [],
    hostId: null,
    players: savedState?.players || [],
    recoveryMode: hasRecoverableGame, // 标记是否为恢复模式
    recoveryDecisionMade: false, // 是否已经做出恢复决定
    waitingForRecoveryDecision: hasRecoverableGame, // 是否在等待恢复决定
    limits: savedState?.limits || { maxQuestionsPerPlayer: null, maxTotalQuestions: null },
    startTime: savedState?.startTime || null
};

const broadcastPlayers = () => {
    io.emit('player_update', gameState.players);
};

const resetLobbyState = () => {
    if (!gameState.currentPuzzle && gameState.history.length === 0) {
        return;
    }
    gameState.currentPuzzle = null;
    gameState.history = [];
    io.emit('return_to_lobby');
};

const removePlayerByIndex = (index) => {
    if (index < 0 || index >= gameState.players.length) return null;
    const [removed] = gameState.players.splice(index, 1);
    if (removed && removed.isHost) {
        gameState.hostId = null;
        // 只有在没有进行中的游戏时才重置大厅
        if (!gameState.currentPuzzle) {
            resetLobbyState();
        }
    }
    return removed;
};

const removePlayersByUserId = (userId, options = {}) => {
    if (!userId) return false;
    const { onlyDisconnected = false } = options;
    let removed = false;
    for (let i = gameState.players.length - 1; i >= 0; i--) {
        const target = gameState.players[i];
        const socketExists = io.sockets.sockets.has(target.id);
        const canRemove = target.userId === userId && (!onlyDisconnected || !socketExists);
        if (canRemove) {
            removePlayerByIndex(i);
            removed = true;
        }
    }
    if (removed) {
        broadcastPlayers();
    }
    return removed;
};

io.on('connection', (socket) => {
    const clientIp = socket.handshake.address.replace('::ffff:', '');
    console.log(`New connection: ${socket.id} from ${clientIp}`);

    // 玩家加入
    socket.on('join', ({ nickname, userId, sessionId, roleHint }) => {
        const clientIp = socket.handshake.address.replace('::ffff:', '');
        const isSameSession = !sessionId || sessionId === serverSessionId;
        const resolvedUserId = isSameSession ? userId : null;
        
        // 恢复模式：尝试匹配已保存的玩家
        if (gameState.recoveryMode && userId) {
            const savedPlayer = gameState.players.find(p => p.userId === userId);
            if (savedPlayer) {
                // 找到匹配的玩家，恢复其状态
                savedPlayer.id = socket.id;
                savedPlayer.isOnline = true;
                
                console.log(`Player recovered: ${savedPlayer.nickname} [${clientIp}]`);
                
                if (savedPlayer.isHost) {
                    gameState.hostId = socket.id;
                }
                
                // 检查是否是第一个重连的玩家
                const onlineCount = gameState.players.filter(p => p.isOnline).length;
                const isFirstReconnector = onlineCount === 1 && gameState.waitingForRecoveryDecision;
                
                socket.emit('init_state', { 
                    ...gameState, 
                    myId: socket.id,
                    userId: savedPlayer.userId,
                    serverSessionId: serverSessionId,
                    puzzles: savedPlayer.isHost ? puzzles : [],
                    recoveryMode: true,
                    isFirstReconnector: isFirstReconnector,
                    waitingForRecoveryDecision: gameState.waitingForRecoveryDecision
                });
                
                io.emit('player_update', gameState.players);
                return;
            }
        }
        
        if (!isSameSession && userId) {
            console.log(`Ignoring stale userId for ${nickname || '未知'} due to new server session`);
        }

        let player = null;

        // 清理同一 userId 的离线残留，确保重启后不会沿用旧数据
        if (resolvedUserId) {
            removePlayersByUserId(resolvedUserId, { onlyDisconnected: true });
        }

        // 尝试通过 userId 找回旧玩家
        if (resolvedUserId) {
            player = gameState.players.find(p => p.userId === resolvedUserId);
        }

        if (player) {
            // === 重连逻辑 ===
            player.id = socket.id; // 更新 socket.id
            player.isOnline = true;
            // 如果昵称变了也可以更新，或者保持原样
            if (nickname) player.nickname = nickname;
            
            console.log(`Player reconnected: ${player.nickname} [${clientIp}]`);
            
            // 如果是主持人重连，更新 hostId
            if (player.isHost) {
                gameState.hostId = socket.id;
            }
        } else {
            // === 新玩家逻辑 ===
            // 检查当前是否已有主持人（在线或离线都算）
            const hasHost = gameState.players.some(p => p.isHost);
            const wantsHostRole = roleHint === 'host';
            const shouldGrantHost = wantsHostRole && !hasHost;

            player = {
                id: socket.id,
                userId: resolvedUserId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                nickname: nickname || `玩家${socket.id.substr(0, 4)}`,
                isHost: shouldGrantHost,
                isOnline: true
            };
            
            gameState.players.push(player);
            if (player.isHost) {
                gameState.hostId = socket.id;
            }
            console.log(`Player joined: ${player.nickname} [${clientIp}]`);
        }

        socket.emit('init_state', { 
            ...gameState, 
            myId: socket.id,
            userId: player.userId, // 返回 userId 给前端保存
            serverSessionId: serverSessionId, // 发送服务器会话ID
            puzzles: player.isHost ? puzzles : [] 
        });
        
        io.emit('player_update', gameState.players);
    });

    // 申请成为主持人
    socket.on('claim_host', () => {
        // 检查是否已有主持人
        const hasHost = gameState.players.some(p => p.isHost);
        if (hasHost) return;

        const player = gameState.players.find(p => p.id === socket.id);
        if (player) {
            player.isHost = true;
            gameState.hostId = socket.id;
            
            io.emit('player_update', gameState.players);
            // 给新主持人发送题库
            socket.emit('host_data', puzzles);
        }
    });

    // 恢复决定：恢复上一局
    socket.on('recover_game', () => {
        if (!gameState.waitingForRecoveryDecision) return;
        
        gameState.recoveryDecisionMade = true;
        gameState.waitingForRecoveryDecision = false;
        // recoveryMode 保持为 true，允许其他玩家继续恢复
        
        console.log('Game recovery approved');
        io.emit('recovery_decision_made', { recover: true });
    });

    // 恢复决定：重开新局
    socket.on('start_new_game', () => {
        if (!gameState.waitingForRecoveryDecision) return;
        
        gameState.recoveryDecisionMade = true;
        gameState.waitingForRecoveryDecision = false;
        gameState.recoveryMode = false;
        gameState.currentPuzzle = null;
        gameState.history = [];
        gameState.players = [];
        gameState.startTime = null;
        
        // 清除保存的游戏状态
        clearSavedGameState();
        
        console.log('Starting new game, cleared saved state');
        io.emit('recovery_decision_made', { recover: false });
    });

    // 退出主持人角色（仅在未开始游戏时）
    socket.on('resign_host', () => {
        // 只有在没有进行中的游戏时才允许退出
        if (gameState.currentPuzzle) return;

        const player = gameState.players.find(p => p.id === socket.id);
        if (player && player.isHost) {
            player.isHost = false;
            gameState.hostId = null;
            
            io.emit('player_update', gameState.players);
        }
    });

    // 踢出离线玩家
    socket.on('kick_player', (playerId) => {
        if (socket.id !== gameState.hostId) return;

        const targetIndex = gameState.players.findIndex(p => p.id === playerId);
        if (targetIndex === -1) return;

        const targetPlayer = gameState.players[targetIndex];
        
        // 确保只能踢出离线玩家
        if (targetPlayer.isOnline) {
            socket.emit('error_message', { message: '只能踢出离线玩家' });
            return;
        }

        gameState.players.splice(targetIndex, 1);
        console.log(`Player kicked by host: ${targetPlayer.nickname}`);
        broadcastPlayers();
    });

    // 申请主持人（向当前主持人发送请求）
    socket.on('request_host', () => {
        const requester = gameState.players.find(p => p.id === socket.id);
        const currentHost = gameState.players.find(p => p.isHost);
        
        if (!requester || !currentHost) return;
        if (requester.id === currentHost.id) return; // 自己已经是主持人
        
        // 向当前主持人发送转让请求
        io.to(currentHost.id).emit('host_transfer_request', {
            requesterId: requester.id,
            requesterName: requester.nickname
        });
    });

    // 主持人同意转让
    socket.on('approve_host_transfer', (requesterId) => {
        const currentHost = gameState.players.find(p => p.id === socket.id);
        const newHost = gameState.players.find(p => p.id === requesterId);
        
        if (!currentHost || !newHost || !currentHost.isHost) return;
        
        // 转让主持人权限
        currentHost.isHost = false;
        newHost.isHost = true;
        gameState.hostId = newHost.id;
        
        io.emit('player_update', gameState.players);
        // 给新主持人发送题库
        io.to(newHost.id).emit('host_data', puzzles);
    });

    // 主持人拒绝转让
    socket.on('reject_host_transfer', (requesterId) => {
        io.to(requesterId).emit('host_transfer_rejected');
    });

    // 自定义题目
    socket.on('create_custom_puzzle', (puzzleData) => {
        if (socket.id !== gameState.hostId) return;

        console.log('Received custom puzzle:', puzzleData);

        // 检查玩家人数是否足够（至少2人：主持人+1名玩家）
        const onlinePlayers = gameState.players.filter(p => p.isOnline);
        if (onlinePlayers.length < 2) {
            socket.emit('error_message', { message: '至少需要2名玩家才能开始游戏（包括主持人）' });
            return;
        }

        const newPuzzle = {
            id: Date.now(),
            title: puzzleData.title || '自定义海龟汤',
            content: puzzleData.content,
            answer: puzzleData.answer,
            contentImages: puzzleData.contentImages || [],
            answerImages: puzzleData.answerImages || []
        };
        
        puzzles.push(newPuzzle);
        
        // 更新主持人的题库列表
        socket.emit('host_data', puzzles);
        
        // 自动选择这个新题目
        gameState.currentPuzzle = newPuzzle;
        gameState.history = [];
        gameState.recoveryMode = false;
        gameState.startTime = Date.now();
        gameState.limits = {
            maxQuestionsPerPlayer: puzzleData.maxQuestionsPerPlayer || null,
            maxTotalQuestions: puzzleData.maxTotalQuestions || null
        };
        
        io.emit('new_puzzle', {
            title: newPuzzle.title,
            content: newPuzzle.content,
            contentImages: newPuzzle.contentImages || [],
            limits: gameState.limits,
            startTime: gameState.startTime
        });
        
        socket.emit('puzzle_reveal', newPuzzle);
        
        // 保存游戏状态
        saveGameState();
    });

    // 选择题目
    socket.on('select_puzzle', (data) => {
        if (socket.id !== gameState.hostId) return;

        // 兼容旧版本调用（只传ID）
        const puzzleId = typeof data === 'object' ? data.id : data;
        const options = typeof data === 'object' ? data : {};

        // 检查玩家人数是否足够（至少2人：主持人+1名玩家）
        const onlinePlayers = gameState.players.filter(p => p.isOnline);
        if (onlinePlayers.length < 2) {
            socket.emit('error_message', { message: '至少需要2名玩家才能开始游戏（包括主持人）' });
            return;
        }

        const puzzle = puzzles.find(p => p.id === puzzleId);
        if (puzzle) {
            gameState.currentPuzzle = puzzle;
            gameState.history = []; // 清空历史
            gameState.recoveryMode = false; // 开始新游戏，退出恢复模式
            gameState.startTime = Date.now();
            gameState.limits = {
                maxQuestionsPerPlayer: options.maxQuestionsPerPlayer || null,
                maxTotalQuestions: options.maxTotalQuestions || null
            };
            
            // 广播新题目（注意：不发 answer 和 answerImages 给普通玩家）
            io.emit('new_puzzle', {
                title: puzzle.title,
                content: puzzle.content,
                contentImages: puzzle.contentImages || [],
                limits: gameState.limits,
                startTime: gameState.startTime
            });
            
            // 单独发给主持人完整信息
            socket.emit('puzzle_reveal', puzzle);
            
            // 保存游戏状态
            saveGameState();
        }
    });

    // 玩家提问
    socket.on('ask_question', (text) => {
        if (!gameState.currentPuzzle) return;
        
        const limits = gameState.limits;
        const player = gameState.players.find(p => p.id === socket.id);
        if (!player) return;

        // 检查该玩家是否有未回答的问题
        const hasPending = gameState.history.some(q => q.userId === player.userId && q.status === 'pending');
        if (hasPending) {
            socket.emit('error_message', { message: '请等待主持人回答上一条提问后再发送新的提问' });
            return;
        }

        // 统计每个玩家的已提问次数
        const playerCounts = {};
        // 初始化在线玩家计数
        gameState.players.forEach(p => {
            playerCounts[p.userId] = 0;
        });
        
        // 遍历历史记录进行统计
        let publicUsed = 0;
        const historyCounts = {}; // 临时统计遍历过程中的次数

        gameState.history.forEach(q => {
            if (!historyCounts[q.userId]) historyCounts[q.userId] = 0;
            
            // 如果设置了个人限制
            if (limits.maxQuestionsPerPlayer) {
                if (historyCounts[q.userId] < limits.maxQuestionsPerPlayer) {
                    // 属于个人配额
                    historyCounts[q.userId]++;
                } else {
                    // 属于公共配额
                    publicUsed++;
                }
            } else {
                // 没设置个人限制，全部算作公共（或者总数）
                publicUsed++;
            }
            
            // 更新总统计
            if (playerCounts[q.userId] !== undefined) {
                playerCounts[q.userId]++;
            }
        });

        // 当前玩家已用次数
        const myUsed = playerCounts[player.userId] || 0;

        // 逻辑判断
        if (limits.maxQuestionsPerPlayer) {
            // 1. 检查个人配额
            if (myUsed < limits.maxQuestionsPerPlayer) {
                // 还有个人配额，允许提问
            } else {
                // 个人配额用完，检查是否所有在线玩家都用完了个人配额
                const onlinePlayers = gameState.players.filter(p => p.isOnline && !p.isHost);
                const someoneHasQuota = onlinePlayers.some(p => {
                    const used = playerCounts[p.userId] || 0;
                    return used < limits.maxQuestionsPerPlayer;
                });

                if (someoneHasQuota) {
                    socket.emit('error_message', { message: '请等待所有在线玩家消耗完个人提问次数' });
                    return;
                }

                // 大家都用完了，检查公共配额
                if (limits.maxTotalQuestions !== null) {
                    if (publicUsed >= limits.maxTotalQuestions) {
                        socket.emit('error_message', { message: '全员共享额外次数已用尽' });
                        return;
                    }
                }
            }
        } else {
            // 没有个人限制，只检查总限制
            if (limits.maxTotalQuestions !== null) {
                // 这里 maxTotalQuestions 就是总数限制
                if (gameState.history.length >= limits.maxTotalQuestions) {
                    socket.emit('error_message', { message: '已达到本局总提问次数限制' });
                    return;
                }
            }
        }

        const questionEntry = {
            id: Date.now(),
            playerId: socket.id,
            userId: player.userId, // 记录 userId 以便统计
            nickname: player.nickname,
            question: text,
            answer: null,
            status: 'pending'
        };
        
        gameState.history.push(questionEntry);
        io.emit('new_question', questionEntry);
        
        // 保存游戏状态
        saveGameState();
    });

    // 主持人回答
    socket.on('answer_question', ({ questionId, answerType, customText }) => {
        if (socket.id !== gameState.hostId) return;

        const qIndex = gameState.history.findIndex(q => q.id === questionId);
        if (qIndex !== -1) {
            let answerText = '';
            switch(answerType) {
                case 'yes': answerText = '是'; break;
                case 'no': answerText = '不是'; break;
                case 'irrelevant': answerText = '与此无关'; break; // 也就是“不重要”
                case 'custom': answerText = customText; break;
            }

            gameState.history[qIndex].answer = answerText;
            gameState.history[qIndex].answerType = answerType;
            gameState.history[qIndex].status = 'answered';

            io.emit('question_answered', gameState.history[qIndex]);
            
            // 保存游戏状态
            saveGameState();
        }
    });

    // 揭晓汤底
    socket.on('reveal_answer', () => {
        if (socket.id !== gameState.hostId) return;
        if (!gameState.currentPuzzle) return;

        io.emit('game_over', gameState.currentPuzzle.answer);
    });
    
    // 更新题目内容和次数限制
    socket.on('update_puzzle', (data) => {
        console.log('[UPDATE_PUZZLE] Received update request:', {
            title: data.title,
            contentLength: data.content?.length,
            answerLength: data.answer?.length,
            contentImages: data.contentImages?.length,
            answerImages: data.answerImages?.length,
            maxQuestionsPerPlayer: data.maxQuestionsPerPlayer,
            maxTotalQuestions: data.maxTotalQuestions,
            isHost: socket.id === gameState.hostId
        });
        
        if (socket.id !== gameState.hostId) {
            console.log('[UPDATE_PUZZLE] Rejected: Not host');
            return;
        }
        if (!gameState.currentPuzzle) {
            console.log('[UPDATE_PUZZLE] Rejected: No current puzzle');
            return;
        }
        
        // 更新题目信息
        gameState.currentPuzzle.title = data.title;
        gameState.currentPuzzle.content = data.content || '';
        gameState.currentPuzzle.answer = data.answer || '';
        gameState.currentPuzzle.contentImages = data.contentImages || [];
        gameState.currentPuzzle.answerImages = data.answerImages || [];
        
        // 更新次数限制（正确处理 0 值）
        gameState.limits = {
            maxQuestionsPerPlayer: data.maxQuestionsPerPlayer != null ? data.maxQuestionsPerPlayer : null,
            maxTotalQuestions: data.maxTotalQuestions != null ? data.maxTotalQuestions : null
        };
        
        console.log('[UPDATE_PUZZLE] Updated puzzle:', {
            title: gameState.currentPuzzle.title,
            limits: gameState.limits
        });
        
        // 广播更新后的题目（玩家看不到答案）
        io.emit('puzzle_updated', {
            puzzle: {
                title: gameState.currentPuzzle.title,
                content: gameState.currentPuzzle.content,
                contentImages: gameState.currentPuzzle.contentImages
            },
            limits: gameState.limits
        });
        
        // 单独给主持人发送完整题目（包括答案）
        socket.emit('puzzle_reveal', gameState.currentPuzzle);
        
        // 保存游戏状态
        saveGameState();
        
        console.log(`[UPDATE_PUZZLE] Successfully updated puzzle: ${gameState.currentPuzzle.title}`);
    });

    // 返回大厅（结束当前局）
    socket.on('return_to_lobby', () => {
        if (socket.id !== gameState.hostId) return;
        
        gameState.currentPuzzle = null;
        gameState.history = [];
        gameState.recoveryMode = false;
        gameState.startTime = null;
        
        // 清理离线玩家
        for (let i = gameState.players.length - 1; i >= 0; i--) {
            if (!gameState.players[i].isOnline) {
                gameState.players.splice(i, 1);
            }
        }
        
        // 清除保存的游戏状态文件
        clearSavedGameState();
        
        io.emit('return_to_lobby');
        broadcastPlayers();
        // 重新发送题库给主持人（以防有更新）
        socket.emit('host_data', puzzles);
    });

    // 断开连接
    socket.on('disconnect', () => {
        const clientIp = socket.handshake.address.replace('::ffff:', '');
        const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
        if (playerIndex === -1) {
            return;
        }

        const player = gameState.players[playerIndex];
        
        // 如果游戏正在进行中，只标记为离线，不移除玩家
        if (gameState.currentPuzzle) {
            player.isOnline = false;
            console.log(`Player disconnected (marked offline): ${player.nickname} [${clientIp}]`);
            broadcastPlayers();
        } else {
            // 游戏未开始，直接移除玩家
            const removed = removePlayerByIndex(playerIndex);
            if (removed) {
                console.log(`Player disconnected: ${removed.nickname} [${clientIp}] (removed)`);
                broadcastPlayers();
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
console.log(`Attempting to start server on port ${PORT}...`);
server.listen(PORT, () => {
    console.log(`\n✓ Server running on port ${PORT}`);
    console.log(`✓ 本机使用IP: http://localhost:${PORT}`);
    console.log(`✓ Server ready to accept connections\n`);
});
