/**
 * Socket.IO 事件处理 Composable
 */
import { nextTick } from 'vue';
import { socket, clearPendingJoinPayload } from '../utils/socket.js';
import { storage } from '../utils/storage.js';

export function useSocketEvents(gameState, timer, scrollToBottom) {
  const setupSocketListeners = () => {
    if (!socket) return;

    socket.on('connect', () => {
      gameState.serverConnected.value = true;
      const storedUserId = storage.getUserId();
      const sessionId = storage.getSessionId();
      const roleHint = storage.getRole();

      const pendingPayload = clearPendingJoinPayload();
      if (pendingPayload) {
        socket.emit('join', pendingPayload);
        return;
      }

      if (gameState.joined.value) {
        socket.emit('join', { 
          nickname: gameState.nickname.value, 
          userId: storedUserId,
          sessionId,
          roleHint
        });
      }
    });

    socket.on('init_state', (state) => {
      handleInitState(state, gameState, timer, scrollToBottom);
    });

    socket.on('player_update', (list) => {
      gameState.players.value = list;
      const me = list.find(p => p.id === gameState.myId.value);
      if (me) {
        gameState.isHost.value = me.isHost;
        storage.persistRole(me.isHost);
      }
      gameState.hasHost.value = list.some(p => p.isHost);
    });

    socket.on('host_data', (puzzles) => {
      gameState.puzzleList.value = puzzles;
    });

    socket.on('new_puzzle', (data) => {
      if (data.title) {
        gameState.currentPuzzle.value = data;
      } else {
        gameState.currentPuzzle.value = data.puzzle;
      }
      
      if (data.limits) {
        gameState.gameLimits.value = data.limits;
      } else {
        gameState.gameLimits.value = { maxQuestionsPerPlayer: null, maxTotalQuestions: null };
      }
      
      if (data.startTime) {
        timer.gameStartTime.value = data.startTime;
        timer.startDurationTimer();
      }

      gameState.history.value = [];
      gameState.gameOver.value = false;
    });

    socket.on('puzzle_reveal', (fullPuzzle) => {
      gameState.currentPuzzle.value = fullPuzzle;
    });
    
    socket.on('puzzle_updated', (data) => {
      console.log('[PUZZLE_UPDATED] Received update:', data);
      
      if (gameState.currentPuzzle.value && data.puzzle) {
        gameState.currentPuzzle.value = {
          ...gameState.currentPuzzle.value,
          title: data.puzzle.title,
          content: data.puzzle.content,
          contentImages: data.puzzle.contentImages || []
        };
      }
      
      if (data.limits) {
        gameState.gameLimits.value = { ...data.limits };
      }
    });

    socket.on('new_question', (q) => {
      gameState.history.value.push(q);
      scrollToBottom();
    });

    socket.on('question_answered', (updatedQ) => {
      const idx = gameState.history.value.findIndex(h => h.id === updatedQ.id);
      if (idx !== -1) {
        gameState.history.value[idx] = updatedQ;
      }
    });

    socket.on('game_over', (answer) => {
      gameState.gameOver.value = true;
      if (gameState.currentPuzzle.value) {
        gameState.currentPuzzle.value.answer = answer;
      }
    });

    socket.on('return_to_lobby', () => {
      gameState.currentPuzzle.value = null;
      gameState.history.value = [];
      gameState.gameOver.value = false;
      gameState.gameLimits.value = { maxQuestionsPerPlayer: null, maxTotalQuestions: null };
      timer.gameStartTime.value = null;
      timer.stopDurationTimer();
    });

    socket.on('error_message', (data) => {
      alert(data.message);
    });

    socket.on('host_transfer_request', (data) => {
      if (confirm(`玩家 ${data.requesterName} 想要成为主持人，是否同意转让主持权？`)) {
        socket.emit('approve_host_transfer', data.requesterId);
      } else {
        socket.emit('reject_host_transfer', data.requesterId);
      }
    });

    socket.on('host_transfer_rejected', () => {
      alert('主持人拒绝了你的申请');
    });

    socket.on('disconnect', () => {
      gameState.serverConnected.value = false;
      console.log('Server connection lost');
    });

    socket.on('reconnect', () => {
      gameState.serverConnected.value = true;
      console.log('Server reconnected');
    });

    socket.on('recovery_decision_made', (data) => {
      gameState.showRecoveryDecision.value = false;
      gameState.showRecoveryWaiting.value = false;
      
      if (!data.recover) {
        location.reload();
      }
    });
  };

  return { setupSocketListeners };
}

function handleInitState(state, gameState, timer, scrollToBottom) {
  const storedSessionId = storage.getSessionId();
  
  if (state.recoveryMode) {
    if (storedSessionId && state.serverSessionId && storedSessionId !== state.serverSessionId) {
      storage.setSessionId(state.serverSessionId);
      alert('服务器已重启');
      
      if (state.waitingForRecoveryDecision) {
        if (state.isFirstReconnector) {
          gameState.showRecoveryDecision.value = true;
        } else {
          gameState.showRecoveryWaiting.value = true;
        }
      }
      
      updateGameState(state, gameState, timer, scrollToBottom);
      return;
    }
    
    console.log('Recovery mode: restoring previous game state');
    storage.setSessionId(state.serverSessionId);
    
    if (state.waitingForRecoveryDecision) {
      if (state.isFirstReconnector) {
        gameState.showRecoveryDecision.value = true;
      } else {
        gameState.showRecoveryWaiting.value = true;
      }
    }
  } else if (storedSessionId && state.serverSessionId && storedSessionId !== state.serverSessionId) {
    storage.removeUserId();
    storage.removeRole();
    storage.setSessionId(state.serverSessionId);
    
    alert('服务器已重启，请重新加入游戏');
    location.reload();
    return;
  }

  if (!storedSessionId && state.serverSessionId) {
    storage.setSessionId(state.serverSessionId);
  }

  updateGameState(state, gameState, timer, scrollToBottom);
}

function updateGameState(state, gameState, timer, scrollToBottom) {
  gameState.myId.value = state.myId;
  
  if (state.userId) {
    storage.setUserId(state.userId);
    storage.setNickname(gameState.nickname.value);
  }
  
  gameState.players.value = state.players;
  const me = state.players.find(p => p.id === state.myId);
  gameState.isHost.value = me?.isHost || false;
  storage.persistRole(gameState.isHost.value);
  gameState.hasHost.value = state.players.some(p => p.isHost);
  
  gameState.currentPuzzle.value = state.currentPuzzle;
  gameState.history.value = state.history;
  gameState.puzzleList.value = state.puzzles;
  
  if (state.limits) {
    gameState.gameLimits.value = state.limits;
  }
  
  if (state.startTime) {
    timer.gameStartTime.value = state.startTime;
    timer.startDurationTimer();
  } else {
    timer.stopDurationTimer();
  }
  
  scrollToBottom();
}
