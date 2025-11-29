<template>
  <div v-if="showDecision" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-4">服务器已重启</h2>
      <p class="text-gray-700 mb-6">
        检测到服务器已重启，是否恢复上一局的游戏状态？
      </p>
      <div class="flex space-x-3">
        <button 
          @click="$emit('decide', true)"
          class="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
        >
          恢复游戏
        </button>
        <button 
          @click="$emit('decide', false)"
          class="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
        >
          重新开始
        </button>
      </div>
    </div>
  </div>
  
  <div v-else-if="showWaiting" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
      <h2 class="text-2xl font-bold text-gray-800 mb-2">服务器已重启</h2>
      <p class="text-gray-700">
        等待其他玩家决定是否恢复游戏状态...
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  showDecision: {
    type: Boolean,
    required: true
  },
  showWaiting: {
    type: Boolean,
    required: true
  }
});

defineEmits(['decide']);
</script>
