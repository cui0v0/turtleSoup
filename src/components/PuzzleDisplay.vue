<template>
  <div class="bg-white rounded-lg shadow-lg p-6">
    <div v-if="puzzle" class="space-y-4">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h2 class="text-2xl font-bold text-gray-800 mb-2">{{ puzzle.title }}</h2>
          <div v-if="limits.maxQuestionsPerPlayer || limits.maxTotalQuestions" class="text-sm text-gray-600 space-y-1">
            <div v-if="limits.maxQuestionsPerPlayer">
              个人限制：每人最多 {{ limits.maxQuestionsPerPlayer }} 个问题
              <span class="ml-2 font-semibold" :class="myQuestionCount >= limits.maxQuestionsPerPlayer ? 'text-red-600' : 'text-blue-600'">
                (已提问 {{ myQuestionCount }}/{{ limits.maxQuestionsPerPlayer }})
              </span>
            </div>
            <div v-if="limits.maxTotalQuestions">
              公共池限制：全局最多 {{ limits.maxTotalQuestions }} 个问题
              <span 
                class="ml-2 font-semibold"
                :class="shouldHighlight ? 'text-red-600 animate-pulse' : 'text-blue-600'"
              >
                (剩余 {{ remainingTotal }})
              </span>
            </div>
          </div>
          <div v-if="gameStartTime" class="text-sm text-gray-500 mt-2">
            游戏时长: {{ gameDuration }}
          </div>
        </div>
        <button 
          v-if="isHost && !gameOver"
          @click="$emit('edit-puzzle')"
          class="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-semibold"
        >
          编辑题目
        </button>
      </div>
      
      <div class="prose max-w-none">
        <p class="text-gray-700 whitespace-pre-wrap">{{ puzzle.content }}</p>
        
        <div v-if="puzzle.contentImages && puzzle.contentImages.length > 0" class="mt-4 space-y-2">
          <div 
            v-for="(imgSrc, idx) in puzzle.contentImages" 
            :key="idx"
            class="inline-block mr-2 mb-2"
          >
            <img 
              :src="imgSrc" 
              @click="$emit('show-image', imgSrc)"
              class="max-w-xs max-h-48 rounded cursor-pointer hover:opacity-80 transition border border-gray-200" 
              alt="题目图片"
            />
          </div>
        </div>
      </div>
      
      <div v-if="gameOver && puzzle.answer" class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 class="font-bold text-green-800 mb-2">🎉 谜底揭晓</h3>
        <p class="text-gray-700 whitespace-pre-wrap">{{ puzzle.answer }}</p>
      </div>
    </div>
    
    <div v-else class="text-center text-gray-500 py-12">
      <p class="text-xl">等待主持人选择题目...</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  puzzle: {
    type: Object,
    default: null
  },
  limits: {
    type: Object,
    required: true
  },
  myQuestionCount: {
    type: Number,
    required: true
  },
  remainingTotal: {
    type: Number,
    required: true
  },
  shouldHighlight: {
    type: Boolean,
    required: true
  },
  gameStartTime: {
    type: Number,
    default: null
  },
  gameDuration: {
    type: String,
    required: true
  },
  isHost: {
    type: Boolean,
    required: true
  },
  gameOver: {
    type: Boolean,
    required: true
  }
});

defineEmits(['edit-puzzle', 'show-image']);
</script>
