<template>
  <div class="bg-white rounded-lg shadow-lg p-6">
    <h3 class="text-xl font-bold mb-4 text-gray-800">在线玩家 ({{ players.length }})</h3>
    
    <div class="space-y-2">
      <div 
        v-for="player in players" 
        :key="player.id"
        class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
        :class="{ 'bg-indigo-50': player.id === myId }"
      >
        <div class="flex items-center space-x-2">
          <div 
            class="w-3 h-3 rounded-full"
            :class="player.connected ? 'bg-green-500' : 'bg-gray-300'"
          ></div>
          <span 
            class="font-semibold"
            :class="player.id === myId ? 'text-indigo-600' : 'text-gray-800'"
          >
            {{ player.nickname }}
          </span>
          <span v-if="player.id === myId" class="text-xs text-indigo-500">(我)</span>
        </div>
        
        <span 
          v-if="player.isHost"
          class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold"
        >
          主持人
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  players: {
    type: Array,
    required: true
  },
  myId: {
    type: String,
    required: true
  }
});
</script>
