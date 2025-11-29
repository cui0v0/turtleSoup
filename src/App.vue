<template>
  <div id="app">
    <!-- 登录界面 -->
    <LoginScreen 
      v-if="!joined"
      :nickname="nickname"
      @update:nickname="nickname = $event"
      @join="handleJoin"
    />
    
    <!-- 游戏主界面 -->
    <div v-else class="min-h-screen bg-gray-100">
      <!-- 顶部导航栏 -->
      <GameHeader 
        :serverConnected="serverConnected"
        :nickname="nickname"
        :isHost="isHost"
        :hasHost="hasHost"
        @request-host="requestHostRole"
        @claim-host="claimHostRole"
      />
      
      <!-- 主内容区 -->
      <div class="container mx-auto px-4 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <!-- 左侧主要内容 (3/4) -->
          <div class="lg:col-span-3 space-y-6">
            <!-- 题目展示 -->
            <PuzzleDisplay 
              :puzzle="currentPuzzle"
              :limits="gameLimits"
              :myQuestionCount="myQuestionCount"
              :remainingTotal="remainingTotal"
              :shouldHighlight="shouldHighlightRemaining"
              :gameStartTime="gameStartTime"
              :gameDuration="gameDuration"
              :isHost="isHost"
              :gameOver="gameOver"
              @edit-puzzle="openEditPuzzleModal"
              @show-image="showImage"
            />
            
            <!-- 提问输入框 -->
            <QuestionInput 
              :currentPuzzle="currentPuzzle"
              :gameOver="gameOver"
              :canAsk="canAskQuestion"
              :placeholder="questionPlaceholder"
              :canAskMessage="getCanAskMessage()"
              @submit="askQuestion"
            />
            
            <!-- 提问历史 -->
            <QuestionHistory 
              ref="questionHistory"
              :history="history"
              :isHost="isHost"
              @answer-question="answerQuestion"
            />
          </div>
          
          <!-- 右侧边栏 (1/4) -->
          <div class="lg:col-span-1 space-y-6">
            <!-- 玩家列表 -->
            <PlayerList 
              :players="players"
              :myId="myId"
            />
            
            <!-- 主持人控制 -->
            <HostControls 
              :isHost="isHost"
              :currentPuzzle="currentPuzzle"
              :gameOver="gameOver"
              @select-puzzle="openPuzzleSelection"
              @create-puzzle="openCustomPuzzle"
              @end-game="endGame"
              @return-lobby="returnToLobby"
            />
          </div>
        </div>
      </div>
      
      <!-- 模态框 -->
      <PuzzleSelectionModal 
        :show="showPuzzleSelection"
        :puzzles="puzzleList"
        @close="showPuzzleSelection = false"
        @select="selectPuzzle"
        @preview="previewPuzzle"
      />
      
      <CustomPuzzleModal 
        :show="showCustomPuzzle"
        :initialData="editingPuzzle"
        :isEdit="isEditMode"
        @close="closeCustomPuzzle"
        @submit="submitCustomPuzzle"
      />
      
      <PuzzlePreviewModal 
        :show="showPreview"
        :puzzle="previewingPuzzle"
        @close="showPreview = false"
        @select="selectPuzzle"
      />
      
      <ImageModal 
        :show="showImageModal"
        :imageSrc="currentImage"
        :scale="imageScale"
        :translateX="imageTranslateX"
        :translateY="imageTranslateY"
        @close="closeImageModal"
        @mousedown="handleImageMouseDown"
        @mousemove="handleImageMouseMove"
        @mouseup="handleImageMouseUp"
        @mouseleave="handleImageMouseLeave"
        @wheel="handleImageWheel"
        @dblclick="resetImageZoom"
        @touchstart="handleImageTouchStart"
        @touchmove="handleImageTouchMove"
        @touchend="handleImageTouchEnd"
      />
      
      <RecoveryModal 
        :showDecision="showRecoveryDecision"
        :showWaiting="showRecoveryWaiting"
        @decide="handleRecoveryDecision"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { initSocket, socket, setPendingJoinPayload } from './utils/socket.js';
import { storage } from './utils/storage.js';
import { useGameState } from './composables/useGameState.js';
import { useGameTimer } from './composables/useGameTimer.js';
import { useImageZoom } from './composables/useImageZoom.js';
import { useSocketEvents } from './composables/useSocketEvents.js';

// 导入组件
import LoginScreen from './components/LoginScreen.vue';
import GameHeader from './components/GameHeader.vue';
import PuzzleDisplay from './components/PuzzleDisplay.vue';
import QuestionInput from './components/QuestionInput.vue';
import QuestionHistory from './components/QuestionHistory.vue';
import PlayerList from './components/PlayerList.vue';
import HostControls from './components/HostControls.vue';
import PuzzleSelectionModal from './components/PuzzleSelectionModal.vue';
import CustomPuzzleModal from './components/CustomPuzzleModal.vue';
import PuzzlePreviewModal from './components/PuzzlePreviewModal.vue';
import ImageModal from './components/ImageModal.vue';
import RecoveryModal from './components/RecoveryModal.vue';

// 使用 composables
const gameState = useGameState();
const timer = useGameTimer();
const imageZoom = useImageZoom();

// 解构 gameState
const {
  joined,
  nickname,
  myId,
  isHost,
  hasHost,
  serverConnected,
  players,
  currentPuzzle,
  history,
  puzzleList,
  gameOver,
  gameLimits,
  showPuzzleSelection,
  showCustomPuzzle,
  showPreview,
  showRecoveryDecision,
  showRecoveryWaiting,
  previewingPuzzle,
  editingPuzzle,
  isEditMode,
  myQuestionCount,
  canAskQuestion,
  questionPlaceholder,
  remainingTotal,
  shouldHighlightRemaining
} = gameState;

// 解构 timer
const { gameStartTime, gameDuration } = timer;

// 解构 imageZoom
const {
  showImageModal,
  currentImage,
  imageScale,
  imageTranslateX,
  imageTranslateY,
  showImage,
  closeImageModal,
  handleImageMouseDown,
  handleImageMouseMove,
  handleImageMouseUp,
  handleImageMouseLeave,
  handleImageWheel,
  resetImageZoom,
  handleImageTouchStart,
  handleImageTouchMove,
  handleImageTouchEnd
} = imageZoom;

// Refs
const questionHistory = ref(null);

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (questionHistory.value?.historyContainer) {
      questionHistory.value.historyContainer.scrollTop = questionHistory.value.historyContainer.scrollHeight;
    }
  });
};

// Socket 事件处理
const { setupSocketListeners } = useSocketEvents(gameState, timer, scrollToBottom);

// 加入游戏
const handleJoin = () => {
  console.log('[App] handleJoin called');
  const trimmedNickname = nickname.value.trim();
  if (!trimmedNickname) {
    console.log('[App] Nickname is empty');
    return;
  }
  
  console.log('[App] Joining with nickname:', trimmedNickname);
  const storedUserId = storage.getUserId();
  const sessionId = storage.getSessionId();
  const roleHint = storage.getRole();
  
  console.log('[App] Socket status:', socket ? 'exists' : 'null', socket?.connected ? 'connected' : 'disconnected');
  
  if (!socket || !socket.connected) {
    console.log('[App] Initializing socket...');
    setPendingJoinPayload({
      nickname: trimmedNickname,
      userId: storedUserId,
      sessionId,
      roleHint
    });
    const newSocket = initSocket();
    console.log('[App] Socket initialized:', newSocket);
  } else {
    console.log('[App] Emitting join event');
    socket.emit('join', {
      nickname: trimmedNickname,
      userId: storedUserId,
      sessionId,
      roleHint
    });
  }
  
  joined.value = true;
  storage.setNickname(trimmedNickname);
  console.log('[App] Joined set to true');
};

// 主持人相关
const requestHostRole = () => {
  socket.emit('request_host');
};

const claimHostRole = () => {
  socket.emit('claim_host');
};

// 题目选择相关
const openPuzzleSelection = () => {
  showPuzzleSelection.value = true;
};

const openCustomPuzzle = () => {
  isEditMode.value = false;
  editingPuzzle.value = null;
  showCustomPuzzle.value = true;
};

const openEditPuzzleModal = () => {
  isEditMode.value = true;
  editingPuzzle.value = {
    title: currentPuzzle.value.title,
    content: currentPuzzle.value.content,
    contentImages: currentPuzzle.value.contentImages || [],
    answer: currentPuzzle.value.answer || '',
    maxQuestionsPerPlayer: gameLimits.value.maxQuestionsPerPlayer,
    maxTotalQuestions: gameLimits.value.maxTotalQuestions
  };
  showCustomPuzzle.value = true;
};

const closeCustomPuzzle = () => {
  showCustomPuzzle.value = false;
  isEditMode.value = false;
  editingPuzzle.value = null;
};

const selectPuzzle = (puzzle) => {
  socket.emit('start_game', puzzle);
  showPuzzleSelection.value = false;
  showPreview.value = false;
};

const previewPuzzle = (puzzle) => {
  previewingPuzzle.value = puzzle;
  showPreview.value = true;
};

const submitCustomPuzzle = (puzzleData) => {
  if (isEditMode.value) {
    socket.emit('update_puzzle', puzzleData);
  } else {
    socket.emit('start_game', puzzleData);
  }
  closeCustomPuzzle();
};

// 游戏控制
const endGame = () => {
  if (confirm('确定要结束游戏并公布答案吗？')) {
    socket.emit('end_game');
  }
};

const returnToLobby = () => {
  if (confirm('确定要返回大厅吗？当前游戏进度将被清除。')) {
    socket.emit('return_to_lobby');
  }
};

// 提问和回答
const askQuestion = (questionText) => {
  socket.emit('ask_question', questionText);
};

const answerQuestion = (questionId, answerText) => {
  if (answerText && answerText.trim()) {
    socket.emit('answer_question', { questionId, answer: answerText.trim() });
  }
};

// 恢复决策
const handleRecoveryDecision = (recover) => {
  socket.emit('recovery_decision', recover);
};

// 获取提问限制提示
const getCanAskMessage = () => {
  const limits = gameLimits.value;
  if (!limits.maxQuestionsPerPlayer && !limits.maxTotalQuestions) return '';
  
  if (limits.maxQuestionsPerPlayer && myQuestionCount.value >= limits.maxQuestionsPerPlayer) {
    if (limits.maxTotalQuestions && remainingTotal.value > 0) {
      return '个人配额已用完，正在使用公共池配额';
    }
    return '你已达到个人提问次数上限';
  }
  
  if (limits.maxTotalQuestions && remainingTotal.value <= 0) {
    return '已达到总提问次数上限';
  }
  
  return '';
};

// 生命周期
onMounted(() => {
  const storedNickname = storage.getNickname();
  if (storedNickname) {
    nickname.value = storedNickname;
  }
  
  initSocket();
  setupSocketListeners();
});

onBeforeUnmount(() => {
  timer.stopDurationTimer();
});
</script>

<style>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
