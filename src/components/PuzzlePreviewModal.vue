<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-800">题目预览</h2>
        <button 
          @click="$emit('close')"
          class="text-gray-500 hover:text-gray-700 text-2xl font-bold"
        >
          ×
        </button>
      </div>
      
      <div v-if="puzzle" class="p-6 space-y-4">
        <div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">{{ puzzle.title }}</h3>
          <p class="text-gray-700 whitespace-pre-wrap">{{ puzzle.content }}</p>
          
          <div v-if="puzzle.contentImages && puzzle.contentImages.length > 0" class="mt-4 space-y-2">
            <div v-for="(img, idx) in puzzle.contentImages" :key="idx" class="inline-block mr-2 mb-2">
              <img :src="img" class="max-w-xs max-h-48 rounded border border-gray-200" alt="题目图片" />
            </div>
          </div>
        </div>
        
        <div class="border-t border-gray-200 pt-4">
          <h4 class="font-bold text-gray-800 mb-2">谜底</h4>
          <p class="text-gray-700 whitespace-pre-wrap">{{ puzzle.answer }}</p>
        </div>
        
        <div v-if="puzzle.maxQuestionsPerPlayer || puzzle.maxTotalQuestions" class="border-t border-gray-200 pt-4">
          <h4 class="font-bold text-gray-800 mb-2">游戏限制</h4>
          <ul class="text-sm text-gray-600 space-y-1">
            <li v-if="puzzle.maxQuestionsPerPlayer">每人最多提问：{{ puzzle.maxQuestionsPerPlayer }} 次</li>
            <li v-if="puzzle.maxTotalQuestions">全局最多提问：{{ puzzle.maxTotalQuestions }} 次</li>
          </ul>
        </div>
        
        <div class="flex space-x-3 pt-4">
          <button 
            @click="$emit('select', puzzle)"
            class="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
          >
            选择此题
          </button>
          <button 
            @click="$emit('close')"
            class="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    required: true
  },
  puzzle: {
    type: Object,
    default: null
  }
});

defineEmits(['close', 'select']);
</script>
