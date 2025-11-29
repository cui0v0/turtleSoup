#!/usr/bin/env python3
"""
Turtle Soup Game Server - Python版本
使用 Flask + python-socketio 实现的海龟汤游戏服务器
"""

import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any

from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS

print('=== Starting Turtle Soup Server (Python) ===')

# 创建 Flask 应用
app = Flask(__name__, static_folder='public')
CORS(app)

# 配置 Socket.IO
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    max_http_buffer_size=30 * 1024 * 1024,  # 30MB 支持图片上传
    ping_timeout=60,
    ping_interval=25,
    async_mode='threading',  # 使用 threading 模式（与 Python 3.13 兼容）
    logger=False,
    engineio_logger=False,
    manage_session=False
)

print('✓ Flask and SocketIO initialized')

# 文件路径配置
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / 'data'
PUZZLES_FILE = DATA_DIR / 'puzzles.json'
GAME_STATE_FILE = DATA_DIR / 'game_state.json'

# 确保数据目录存在
DATA_DIR.mkdir(exist_ok=True)

# 加载题库
print('Loading puzzle database...')
puzzles: List[Dict] = []
try:
    if PUZZLES_FILE.exists():
        with open(PUZZLES_FILE, 'r', encoding='utf-8') as f:
            puzzles = json.load(f)
        print(f'✓ Loaded {len(puzzles)} puzzles successfully')
    else:
        print('⚠ No puzzles.json found, starting with empty puzzle list')
except Exception as e:
    print(f'✗ Failed to load puzzles: {e}')

# 游戏状态
class GameState:
    def __init__(self):
        self.current_puzzle: Optional[Dict] = None
        self.history: List[Dict] = []
        self.host_id: Optional[str] = None
        self.players: List[Dict] = []
        self.recovery_mode: bool = False
        self.recovery_decision_made: bool = False
        self.waiting_for_recovery_decision: bool = False
        self.limits: Dict = {
            'maxQuestionsPerPlayer': None,
            'maxTotalQuestions': None
        }
        self.start_time: Optional[int] = None
        self.server_session_id: str = str(int(time.time() * 1000))

    def to_dict(self) -> Dict:
        """转换为字典用于序列化"""
        return {
            'currentPuzzle': self.current_puzzle,
            'history': self.history,
            'hostId': self.host_id,
            'players': self.players,
            'recoveryMode': self.recovery_mode,
            'waitingForRecoveryDecision': self.waiting_for_recovery_decision,
            'limits': self.limits,
            'startTime': self.start_time
        }

game_state = GameState()

# 持久化相关函数
def save_game_state():
    """保存游戏状态到文件"""
    try:
        if game_state.current_puzzle:
            state_to_save = {
                'currentPuzzle': game_state.current_puzzle,
                'history': game_state.history,
                'players': [
                    {
                        'userId': p['userId'],
                        'nickname': p['nickname'],
                        'isHost': p['isHost'],
                        'isOnline': False  # 重启后都视为离线
                    }
                    for p in game_state.players
                ],
                'savedAt': int(time.time() * 1000),
                'limits': game_state.limits,
                'startTime': game_state.start_time
            }
            with open(GAME_STATE_FILE, 'w', encoding='utf-8') as f:
                json.dump(state_to_save, f, ensure_ascii=False, indent=2)
            print('✓ Game state saved to file')
    except Exception as e:
        print(f'✗ Failed to save game state: {e}')

def load_game_state() -> Optional[Dict]:
    """从文件加载游戏状态"""
    print('Checking for saved game state...')
    try:
        if GAME_STATE_FILE.exists():
            with open(GAME_STATE_FILE, 'r', encoding='utf-8') as f:
                saved_state = json.load(f)
            
            # 检查保存时间（24小时内有效）
            TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
            if time.time() * 1000 - saved_state['savedAt'] < TWENTY_FOUR_HOURS:
                saved_time = datetime.fromtimestamp(saved_state['savedAt'] / 1000)
                print(f'✓ Found valid saved game state from: {saved_time}')
                return saved_state
            else:
                print('⚠ Saved game state expired, deleting...')
                GAME_STATE_FILE.unlink()
        else:
            print('ℹ No saved game state found')
    except Exception as e:
        print(f'✗ Failed to load game state: {e}')
    return None

def clear_saved_game_state():
    """清除保存的游戏状态"""
    try:
        if GAME_STATE_FILE.exists():
            GAME_STATE_FILE.unlink()
            print('✓ Saved game state cleared')
    except Exception as e:
        print(f'✗ Failed to clear saved game state: {e}')

# 尝试加载之前的游戏状态
saved_state = load_game_state()
if saved_state:
    game_state.current_puzzle = saved_state.get('currentPuzzle')
    game_state.history = saved_state.get('history', [])
    game_state.players = saved_state.get('players', [])
    game_state.limits = saved_state.get('limits', {'maxQuestionsPerPlayer': None, 'maxTotalQuestions': None})
    game_state.start_time = saved_state.get('startTime')
    game_state.recovery_mode = True
    game_state.waiting_for_recovery_decision = True
    print('✓ Game state will be available for recovery')
else:
    print('ℹ Starting fresh game state')

# 工具函数
def broadcast_players():
    """广播玩家列表更新"""
    socketio.emit('player_update', game_state.players)

def reset_lobby_state():
    """重置大厅状态"""
    if not game_state.current_puzzle and len(game_state.history) == 0:
        return
    game_state.current_puzzle = None
    game_state.history = []
    socketio.emit('return_to_lobby')

def remove_player_by_index(index: int) -> Optional[Dict]:
    """根据索引移除玩家"""
    if index < 0 or index >= len(game_state.players):
        return None
    removed = game_state.players.pop(index)
    if removed and removed['isHost']:
        game_state.host_id = None
        if not game_state.current_puzzle:
            reset_lobby_state()
    return removed

def remove_players_by_user_id(user_id: str, only_disconnected: bool = False) -> bool:
    """根据 userId 移除玩家"""
    if not user_id:
        return False
    
    removed = False
    for i in range(len(game_state.players) - 1, -1, -1):
        target = game_state.players[i]
        # 简化检查：在Python中我们无法直接检查socket是否存在，依赖isOnline状态
        can_remove = target['userId'] == user_id and (not only_disconnected or not target.get('isOnline', False))
        if can_remove:
            remove_player_by_index(i)
            removed = True
    
    if removed:
        broadcast_players()
    return removed

def get_client_ip(request) -> str:
    """获取客户端IP地址"""
    if request.environ.get('HTTP_X_FORWARDED_FOR'):
        return request.environ['HTTP_X_FORWARDED_FOR'].split(',')[0]
    return request.environ.get('REMOTE_ADDR', 'unknown')

# Flask 路由
@app.route('/')
def index():
    """提供主页"""
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """提供静态文件"""
    return send_from_directory('public', path)

# Socket.IO 事件处理
@socketio.on('connect')
def handle_connect():
    """处理客户端连接"""
    from flask import request
    client_ip = get_client_ip(request)
    print(f'New connection: {request.sid} from {client_ip}')

@socketio.on('disconnect')
def handle_disconnect():
    """处理客户端断开"""
    from flask import request
    client_ip = get_client_ip(request)
    
    player_index = next((i for i, p in enumerate(game_state.players) if p.get('id') == request.sid), -1)
    if player_index == -1:
        return
    
    player = game_state.players[player_index]
    
    # 如果游戏正在进行中，只标记为离线
    if game_state.current_puzzle:
        player['isOnline'] = False
        print(f'Player disconnected (marked offline): {player["nickname"]} [{client_ip}]')
        broadcast_players()
    else:
        # 游戏未开始，直接移除
        removed = remove_player_by_index(player_index)
        if removed:
            print(f'Player disconnected: {removed["nickname"]} [{client_ip}] (removed)')
            broadcast_players()

@socketio.on('join')
def handle_join(data):
    """处理玩家加入"""
    from flask import request
    client_ip = get_client_ip(request)
    
    nickname = data.get('nickname')
    user_id = data.get('userId')
    session_id = data.get('sessionId')
    role_hint = data.get('roleHint')
    
    is_same_session = not session_id or session_id == game_state.server_session_id
    resolved_user_id = user_id if is_same_session else None
    
    # 恢复模式：尝试匹配已保存的玩家
    if game_state.recovery_mode and user_id:
        saved_player = next((p for p in game_state.players if p['userId'] == user_id), None)
        if saved_player:
            saved_player['id'] = request.sid
            saved_player['isOnline'] = True
            
            print(f'Player recovered: {saved_player["nickname"]} [{client_ip}]')
            
            if saved_player['isHost']:
                game_state.host_id = request.sid
            
            online_count = sum(1 for p in game_state.players if p.get('isOnline', False))
            is_first_reconnector = online_count == 1 and game_state.waiting_for_recovery_decision
            
            state_dict = game_state.to_dict()
            state_dict.update({
                'myId': request.sid,
                'userId': saved_player['userId'],
                'serverSessionId': game_state.server_session_id,
                'puzzles': puzzles if saved_player['isHost'] else [],
                'isFirstReconnector': is_first_reconnector
            })
            emit('init_state', state_dict)
            broadcast_players()
            return
    
    if not is_same_session and user_id:
        print(f'Ignoring stale userId for {nickname or "未知"} due to new server session')
    
    player = None
    
    # 清理同一 userId 的离线残留
    if resolved_user_id:
        remove_players_by_user_id(resolved_user_id, only_disconnected=True)
    
    # 尝试通过 userId 找回旧玩家
    if resolved_user_id:
        player = next((p for p in game_state.players if p['userId'] == resolved_user_id), None)
    
    if player:
        # 重连逻辑
        player['id'] = request.sid
        player['isOnline'] = True
        if nickname:
            player['nickname'] = nickname
        
        print(f'Player reconnected: {player["nickname"]} [{client_ip}]')
        
        if player['isHost']:
            game_state.host_id = request.sid
    else:
        # 新玩家逻辑
        has_host = any(p['isHost'] for p in game_state.players)
        wants_host_role = role_hint == 'host'
        should_grant_host = wants_host_role and not has_host
        
        player = {
            'id': request.sid,
            'userId': resolved_user_id or f'user_{int(time.time() * 1000)}_{os.urandom(4).hex()}',
            'nickname': nickname or f'玩家{request.sid[:4]}',
            'isHost': should_grant_host,
            'isOnline': True
        }
        
        game_state.players.append(player)
        if player['isHost']:
            game_state.host_id = request.sid
        print(f'Player joined: {player["nickname"]} [{client_ip}]')
    
    state_dict = game_state.to_dict()
    state_dict.update({
        'myId': request.sid,
        'userId': player['userId'],
        'serverSessionId': game_state.server_session_id,
        'puzzles': puzzles if player['isHost'] else []
    })
    emit('init_state', state_dict)
    broadcast_players()

@socketio.on('claim_host')
def handle_claim_host():
    """申请成为主持人"""
    from flask import request
    
    has_host = any(p['isHost'] for p in game_state.players)
    if has_host:
        return
    
    player = next((p for p in game_state.players if p.get('id') == request.sid), None)
    if player:
        player['isHost'] = True
        game_state.host_id = request.sid
        broadcast_players()
        emit('host_data', puzzles)

@socketio.on('recovery_decision')
def handle_recovery_decision(recover):
    """处理恢复游戏决策"""
    print(f'Recovery decision received: {recover}')
    
    if not game_state.waiting_for_recovery_decision:
        print('Not waiting for recovery decision, ignoring')
        return
    
    game_state.recovery_decision_made = True
    game_state.waiting_for_recovery_decision = False
    
    if recover:
        print('Game recovery approved')
        socketio.emit('recovery_decision_made', {'recover': True})
    else:
        print('Starting new game, clearing saved state')
        game_state.recovery_mode = False
        game_state.current_puzzle = None
        game_state.history = []
        game_state.players = []
        game_state.start_time = None
        
        clear_saved_game_state()
        socketio.emit('recovery_decision_made', {'recover': False})

@socketio.on('recover_game')
def handle_recover_game():
    """恢复上一局游戏（向后兼容）"""
    handle_recovery_decision(True)

@socketio.on('start_new_game')
def handle_start_new_game():
    """开始新游戏（向后兼容）"""
    handle_recovery_decision(False)

@socketio.on('resign_host')
def handle_resign_host():
    """退出主持人角色"""
    from flask import request
    
    if game_state.current_puzzle:
        return
    
    player = next((p for p in game_state.players if p.get('id') == request.sid), None)
    if player and player['isHost']:
        player['isHost'] = False
        game_state.host_id = None
        broadcast_players()

@socketio.on('kick_player')
def handle_kick_player(player_id):
    """踢出离线玩家"""
    from flask import request
    
    if request.sid != game_state.host_id:
        return
    
    target_index = next((i for i, p in enumerate(game_state.players) if p.get('id') == player_id), -1)
    if target_index == -1:
        return
    
    target_player = game_state.players[target_index]
    
    if target_player.get('isOnline', False):
        emit('error_message', {'message': '只能踢出离线玩家'})
        return
    
    game_state.players.pop(target_index)
    print(f'Player kicked by host: {target_player["nickname"]}')
    broadcast_players()

@socketio.on('request_host')
def handle_request_host():
    """申请主持人"""
    from flask import request
    
    requester = next((p for p in game_state.players if p.get('id') == request.sid), None)
    current_host = next((p for p in game_state.players if p['isHost']), None)
    
    if not requester or not current_host:
        return
    if requester['id'] == current_host['id']:
        return
    
    socketio.emit('host_transfer_request', {
        'requesterId': requester['id'],
        'requesterName': requester['nickname']
    }, room=current_host['id'])

@socketio.on('approve_host_transfer')
def handle_approve_host_transfer(requester_id):
    """主持人同意转让"""
    from flask import request
    
    current_host = next((p for p in game_state.players if p.get('id') == request.sid), None)
    new_host = next((p for p in game_state.players if p.get('id') == requester_id), None)
    
    if not current_host or not new_host or not current_host['isHost']:
        return
    
    current_host['isHost'] = False
    new_host['isHost'] = True
    game_state.host_id = new_host['id']
    
    broadcast_players()
    socketio.emit('host_data', puzzles, room=new_host['id'])

@socketio.on('reject_host_transfer')
def handle_reject_host_transfer(requester_id):
    """主持人拒绝转让"""
    socketio.emit('host_transfer_rejected', room=requester_id)

@socketio.on('create_custom_puzzle')
def handle_create_custom_puzzle(puzzle_data):
    """创建自定义题目"""
    from flask import request
    
    if request.sid != game_state.host_id:
        return
    
    print('Received custom puzzle:', puzzle_data)
    
    online_players = [p for p in game_state.players if p.get('isOnline', False)]
    if len(online_players) < 2:
        emit('error_message', {'message': '至少需要2名玩家才能开始游戏（包括主持人）'})
        return
    
    new_puzzle = {
        'id': int(time.time() * 1000),
        'title': puzzle_data.get('title', '自定义海龟汤'),
        'content': puzzle_data.get('content', ''),
        'answer': puzzle_data.get('answer', ''),
        'contentImages': puzzle_data.get('contentImages', []),
        'answerImages': puzzle_data.get('answerImages', [])
    }
    
    puzzles.append(new_puzzle)
    emit('host_data', puzzles)
    
    game_state.current_puzzle = new_puzzle
    game_state.history = []
    game_state.recovery_mode = False
    game_state.start_time = int(time.time() * 1000)
    game_state.limits = {
        'maxQuestionsPerPlayer': puzzle_data.get('maxQuestionsPerPlayer'),
        'maxTotalQuestions': puzzle_data.get('maxTotalQuestions')
    }
    
    socketio.emit('new_puzzle', {
        'title': new_puzzle['title'],
        'content': new_puzzle['content'],
        'contentImages': new_puzzle.get('contentImages', []),
        'limits': game_state.limits,
        'startTime': game_state.start_time
    })
    
    emit('puzzle_reveal', new_puzzle)
    save_game_state()

@socketio.on('select_puzzle')
def handle_select_puzzle(data):
    """选择题目"""
    from flask import request
    
    if request.sid != game_state.host_id:
        return
    
    puzzle_id = data.get('id') if isinstance(data, dict) else data
    options = data if isinstance(data, dict) else {}
    
    online_players = [p for p in game_state.players if p.get('isOnline', False)]
    if len(online_players) < 2:
        emit('error_message', {'message': '至少需要2名玩家才能开始游戏（包括主持人）'})
        return
    
    puzzle = next((p for p in puzzles if p['id'] == puzzle_id), None)
    if puzzle:
        game_state.current_puzzle = puzzle
        game_state.history = []
        game_state.recovery_mode = False
        game_state.start_time = int(time.time() * 1000)
        game_state.limits = {
            'maxQuestionsPerPlayer': options.get('maxQuestionsPerPlayer'),
            'maxTotalQuestions': options.get('maxTotalQuestions')
        }
        
        socketio.emit('new_puzzle', {
            'title': puzzle['title'],
            'content': puzzle['content'],
            'contentImages': puzzle.get('contentImages', []),
            'limits': game_state.limits,
            'startTime': game_state.start_time
        })
        
        emit('puzzle_reveal', puzzle)
        save_game_state()

@socketio.on('ask_question')
def handle_ask_question(text):
    """玩家提问"""
    from flask import request
    
    if not game_state.current_puzzle:
        return
    
    limits = game_state.limits
    player = next((p for p in game_state.players if p.get('id') == request.sid), None)
    if not player:
        return
    
    # 检查是否有未回答的问题
    has_pending = any(q['userId'] == player['userId'] and q['status'] == 'pending' for q in game_state.history)
    if has_pending:
        emit('error_message', {'message': '请等待主持人回答上一条提问后再发送新的提问'})
        return
    
    # 统计每个玩家的已提问次数
    player_counts = {p['userId']: 0 for p in game_state.players}
    
    for q in game_state.history:
        if q['userId'] in player_counts:
            player_counts[q['userId']] += 1
    
    my_used = player_counts.get(player['userId'], 0)
    
    # 情况1: 仅有公共总限制，无个人限制
    if not limits['maxQuestionsPerPlayer'] and limits['maxTotalQuestions']:
        if len(game_state.history) >= limits['maxTotalQuestions']:
            emit('error_message', {'message': '已达到本局总提问次数限制'})
            return
    
    # 情况2: 仅有个人限制，无公共限制
    elif limits['maxQuestionsPerPlayer'] and not limits['maxTotalQuestions']:
        if my_used >= limits['maxQuestionsPerPlayer']:
            emit('error_message', {'message': '个人提问次数已用尽'})
            return
    
    # 情况3: 同时有个人限制和公共限制
    elif limits['maxQuestionsPerPlayer'] and limits['maxTotalQuestions']:
        # 检查个人配额
        if my_used < limits['maxQuestionsPerPlayer']:
            pass  # 还有个人配额，允许提问
        else:
            # 个人配额用完，检查是否所有在线玩家都用完了
            online_players = [p for p in game_state.players if p.get('isOnline', False) and not p['isHost']]
            someone_has_quota = any(player_counts.get(p['userId'], 0) < limits['maxQuestionsPerPlayer'] for p in online_players)
            
            if someone_has_quota:
                emit('error_message', {'message': '请等待所有在线玩家消耗完个人提问次数'})
                return
            
            # 所有人个人配额都用完了，检查公共配额
            # 计算公共配额已用次数
            public_used = 0
            for user_id, count in player_counts.items():
                if count > limits['maxQuestionsPerPlayer']:
                    public_used += count - limits['maxQuestionsPerPlayer']
            
            if public_used >= limits['maxTotalQuestions']:
                emit('error_message', {'message': '全员共享额外次数已用尽'})
                return
    
    # 情况4: 无任何限制，直接允许
    
    question_entry = {
        'id': int(time.time() * 1000),
        'playerId': request.sid,
        'userId': player['userId'],
        'nickname': player['nickname'],
        'question': text,
        'answer': None,
        'status': 'pending'
    }
    
    game_state.history.append(question_entry)
    socketio.emit('new_question', question_entry)
    save_game_state()

@socketio.on('answer_question')
def handle_answer_question(data):
    """主持人回答"""
    from flask import request
    
    if request.sid != game_state.host_id:
        return
    
    question_id = data['questionId']
    answer_type = data['answerType']
    custom_text = data.get('customText', '')
    
    q_index = next((i for i, q in enumerate(game_state.history) if q['id'] == question_id), -1)
    if q_index != -1:
        answer_map = {
            'yes': '是',
            'no': '不是',
            'irrelevant': '与此无关',
            'custom': custom_text
        }
        answer_text = answer_map.get(answer_type, '')
        
        game_state.history[q_index]['answer'] = answer_text
        game_state.history[q_index]['answerType'] = answer_type
        game_state.history[q_index]['status'] = 'answered'
        
        socketio.emit('question_answered', game_state.history[q_index])
        save_game_state()

@socketio.on('reveal_answer')
def handle_reveal_answer():
    """揭晓汤底"""
    from flask import request
    
    if request.sid != game_state.host_id:
        return
    if not game_state.current_puzzle:
        return
    
    socketio.emit('game_over', game_state.current_puzzle['answer'])

@socketio.on('update_puzzle')
def handle_update_puzzle(data):
    """更新题目内容和次数限制"""
    from flask import request
    
    print('[UPDATE_PUZZLE] Received update request:', {
        'title': data.get('title'),
        'contentLength': len(data.get('content', '')),
        'answerLength': len(data.get('answer', '')),
        'contentImages': len(data.get('contentImages', [])),
        'answerImages': len(data.get('answerImages', [])),
        'maxQuestionsPerPlayer': data.get('maxQuestionsPerPlayer'),
        'maxTotalQuestions': data.get('maxTotalQuestions'),
        'isHost': request.sid == game_state.host_id
    })
    
    if request.sid != game_state.host_id:
        print('[UPDATE_PUZZLE] Rejected: Not host')
        return
    if not game_state.current_puzzle:
        print('[UPDATE_PUZZLE] Rejected: No current puzzle')
        return
    
    # 更新题目信息
    game_state.current_puzzle['title'] = data.get('title', '')
    game_state.current_puzzle['content'] = data.get('content', '')
    game_state.current_puzzle['answer'] = data.get('answer', '')
    game_state.current_puzzle['contentImages'] = data.get('contentImages', [])
    game_state.current_puzzle['answerImages'] = data.get('answerImages', [])
    
    # 更新次数限制（正确处理 0 值）
    game_state.limits = {
        'maxQuestionsPerPlayer': data.get('maxQuestionsPerPlayer') if data.get('maxQuestionsPerPlayer') is not None else None,
        'maxTotalQuestions': data.get('maxTotalQuestions') if data.get('maxTotalQuestions') is not None else None
    }
    
    print('[UPDATE_PUZZLE] Updated puzzle:', {
        'title': game_state.current_puzzle['title'],
        'limits': game_state.limits
    })
    
    # 广播更新后的题目（玩家看不到答案）
    socketio.emit('puzzle_updated', {
        'puzzle': {
            'title': game_state.current_puzzle['title'],
            'content': game_state.current_puzzle['content'],
            'contentImages': game_state.current_puzzle.get('contentImages', [])
        },
        'limits': game_state.limits
    })
    
    # 单独给主持人发送完整题目
    emit('puzzle_reveal', game_state.current_puzzle)
    save_game_state()
    
    print(f'[UPDATE_PUZZLE] Successfully updated puzzle: {game_state.current_puzzle["title"]}')

@socketio.on('return_to_lobby')
def handle_return_to_lobby():
    """返回大厅"""
    from flask import request
    
    if request.sid != game_state.host_id:
        return
    
    game_state.current_puzzle = None
    game_state.history = []
    game_state.recovery_mode = False
    game_state.start_time = None
    
    # 清理离线玩家
    game_state.players = [p for p in game_state.players if p.get('isOnline', False)]
    
    clear_saved_game_state()
    
    socketio.emit('return_to_lobby')
    broadcast_players()
    emit('host_data', puzzles)

if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 5000))
    print(f'\n✓ Starting server on port {PORT}...')
    print(f'✓ 本机使用IP: http://localhost:{PORT}')
    print(f'✓ Server ready to accept connections\n')
    
    socketio.run(app, host='0.0.0.0', port=PORT, debug=False)
