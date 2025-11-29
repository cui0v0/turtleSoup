/**
 * 游戏状态管理 Composable
 */
import { ref, computed } from 'vue';
import { storage } from '../utils/storage.js';

export function useGameState() {
  // 用户状态
  const joined = ref(false);
  const nickname = ref('');
  const myId = ref('');
  const isHost = ref(false);
  const hasHost = ref(false);
  
  // 游戏数据
  const players = ref([]);
  const puzzleList = ref([]);
  const currentPuzzle = ref(null);
  const history = ref([]);
  const questionText = ref('');
  const customAnswers = ref({});
  const gameOver = ref(false);
  
  // 模态框状态
  const showCustomModal = ref(false);
  const showEditModal = ref(false);
  const showPreviewModal = ref(false);
  const showImageModal = ref(false);
  const showRecoveryDecision = ref(false);
  const showRecoveryWaiting = ref(false);
  
  // 表单数据
  const customForm = ref({ title: '', content: '', answer: '', contentImages: [], answerImages: [] });
  const editForm = ref({ title: '', content: '', answer: '', contentImages: [], answerImages: [] });
  const settingsForm = ref({ maxQuestionsPerPlayer: '', maxTotalQuestions: '' });
  
  // UI 状态
  const requestHostCooldown = ref(false);
  const serverConnected = ref(true);
  const isPuzzleExpanded = ref(false);
  const isAnswerExpanded = ref(true);
  
  // 游戏配置
  const gameLimits = ref({ maxQuestionsPerPlayer: null, maxTotalQuestions: null });
  const gameStartTime = ref(null);
  const gameDuration = ref('');
  
  // 计算属性
  const myQuestionCount = computed(() => {
    const storedUserId = storage.getUserId();
    if (!storedUserId) return 0;
    return history.value.filter(q => q.userId === storedUserId).length;
  });
  
  const publicUsedCount = computed(() => {
    if (!gameLimits.value.maxQuestionsPerPlayer) return 0;
    
    let used = 0;
    const userCounts = {};
    
    history.value.forEach(q => {
      if (!userCounts[q.userId]) userCounts[q.userId] = 0;
      if (userCounts[q.userId] >= gameLimits.value.maxQuestionsPerPlayer) {
        used++;
      }
      userCounts[q.userId]++;
    });
    
    return used;
  });
  
  const canAskQuestion = computed(() => {
    if (!currentPuzzle.value || gameOver.value) return false;
    
    const storedUserId = storage.getUserId();
    if (storedUserId) {
      const hasPending = history.value.some(q => q.userId === storedUserId && q.status === 'pending');
      if (hasPending) return false;
    }

    const limits = gameLimits.value;
    
    // 情况1: 仅有公共总限制
    if (!limits.maxQuestionsPerPlayer && limits.maxTotalQuestions) {
      return history.value.length < limits.maxTotalQuestions;
    }
    
    // 情况2: 仅有个人限制
    if (limits.maxQuestionsPerPlayer && !limits.maxTotalQuestions) {
      return myQuestionCount.value < limits.maxQuestionsPerPlayer;
    }
    
    // 情况3: 同时有两种限制
    if (limits.maxQuestionsPerPlayer && limits.maxTotalQuestions) {
      if (myQuestionCount.value < limits.maxQuestionsPerPlayer) {
        return true;
      }
      
      const onlinePlayers = players.value.filter(p => p.isOnline && !p.isHost);
      const userCounts = {};
      history.value.forEach(q => {
        if (!userCounts[q.userId]) userCounts[q.userId] = 0;
        userCounts[q.userId]++;
      });
      
      const someoneHasQuota = onlinePlayers.some(p => {
        const used = userCounts[p.userId] || 0;
        return used < limits.maxQuestionsPerPlayer;
      });
      
      if (someoneHasQuota) return false;
      
      return publicUsedCount.value < limits.maxTotalQuestions;
    }
    
    return true;
  });
  
  const questionPlaceholder = computed(() => {
    const storedUserId = storage.getUserId();
    if (storedUserId) {
      const hasPending = history.value.some(q => q.userId === storedUserId && q.status === 'pending');
      if (hasPending) return '请等待主持人回答您提出的上一条猜测...';
    }

    if (!canAskQuestion.value) {
      const limits = gameLimits.value;
      if (limits.maxQuestionsPerPlayer && myQuestionCount.value >= limits.maxQuestionsPerPlayer) {
        const onlinePlayers = players.value.filter(p => p.isOnline && !p.isHost);
        const userCounts = {};
        history.value.forEach(q => {
          if (!userCounts[q.userId]) userCounts[q.userId] = 0;
          userCounts[q.userId]++;
        });
        const someoneHasQuota = onlinePlayers.some(p => {
          const used = userCounts[p.userId] || 0;
          return used < limits.maxQuestionsPerPlayer;
        });
        
        if (someoneHasQuota) return '请等待其他玩家使用完个人次数';
        if (limits.maxTotalQuestions && publicUsedCount.value >= limits.maxTotalQuestions) return '全员公共次数已用尽';
      }
      return '提问次数已用尽';
    }
    return '输入你的问题... (只能问是/否的问题哦)';
  });
  
  const remainingTotal = computed(() => {
    const limits = gameLimits.value;
    if (!limits.maxQuestionsPerPlayer && !limits.maxTotalQuestions) return null;
    
    let total = 0;
    if (limits.maxQuestionsPerPlayer) {
      total += Math.max(0, limits.maxQuestionsPerPlayer - myQuestionCount.value);
    }
    if (limits.maxTotalQuestions) {
      total += Math.max(0, limits.maxTotalQuestions - publicUsedCount.value);
    }
    return total;
  });
  
  const shouldHighlightRemaining = computed(() => {
    const remaining = remainingTotal.value;
    if (remaining === null || remaining === 0) return false;
    return remaining % 5 === 0 && remaining <= 15;
  });

  return {
    // State
    joined, nickname, myId, isHost, hasHost,
    players, puzzleList, currentPuzzle, history, questionText, customAnswers, gameOver,
    showCustomModal, showEditModal, showPreviewModal, showImageModal,
    showRecoveryDecision, showRecoveryWaiting,
    customForm, editForm, settingsForm,
    requestHostCooldown, serverConnected,
    isPuzzleExpanded, isAnswerExpanded,
    gameLimits, gameStartTime, gameDuration,
    
    // Computed
    myQuestionCount, publicUsedCount, canAskQuestion, questionPlaceholder,
    remainingTotal, shouldHighlightRemaining
  };
}
