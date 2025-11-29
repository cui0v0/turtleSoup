<template>
  <div class="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
    <div class="flex items-center space-x-4">
      <h1 class="text-2xl font-bold text-indigo-600">海龟汤游戏</h1>
      <span 
        :class="serverConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
        class="px-3 py-1 rounded-full text-xs font-semibold"
      >
        {{ serverConnected ? '已连接' : '未连接' }}
      </span>
    </div>
    
    <div class="flex items-center space-x-4">
      <div class="text-sm text-gray-600">
        <span class="font-semibold">{{ nickname }}</span>
        <span v-if="isHost" class="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">主持人</span>
      </div>
      
      <button 
        v-if="!isHost && hasHost"
        @click="requestHost"
        class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm font-semibold"
      >
        申请成为主持人
      </button>
      
      <button 
        v-if="!isHost && !hasHost"
        @click="claimHost"
        class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm font-semibold"
      >
        成为主持人
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  serverConnected: {
    type: Boolean,
    required: true
  },
  nickname: {
    type: String,
    required: true
  },
  isHost: {
    type: Boolean,
    required: true
  },
  hasHost: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['request-host', 'claim-host']);

const requestHost = () => {
  emit('request-host');
};

const claimHost = () => {
  emit('claim-host');
};
</script>
