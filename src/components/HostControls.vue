<template>
  <div v-if="isHost && !currentPuzzle" class="bg-white rounded-lg shadow-lg p-6">
    <h3 class="text-xl font-bold mb-4 text-gray-800">主持人控制</h3>
    
    <div class="space-y-3">
      <button 
        @click="$emit('select-puzzle')"
        class="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
      >
        📋 从题库选择题目
      </button>
      
      <button 
        @click="$emit('create-puzzle')"
        class="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
      >
        ✏️ 自定义题目
      </button>
    </div>
  </div>
  
  <div v-else-if="isHost && currentPuzzle" class="bg-white rounded-lg shadow-lg p-6">
    <h3 class="text-xl font-bold mb-4 text-gray-800">游戏控制</h3>
    
    <div class="space-y-3">
      <button 
        v-if="!gameOver"
        @click="$emit('end-game')"
        class="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
      >
        🎉 结束游戏 (公布答案)
      </button>
      
      <button 
        @click="$emit('return-lobby')"
        class="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
      >
        🏠 返回大厅
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isHost: {
    type: Boolean,
    required: true
  },
  currentPuzzle: {
    type: Object,
    default: null
  },
  gameOver: {
    type: Boolean,
    required: true
  }
});

defineEmits(['select-puzzle', 'create-puzzle', 'end-game', 'return-lobby']);
</script>
