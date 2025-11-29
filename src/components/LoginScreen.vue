<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
    <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
      <h1 class="text-4xl font-bold text-center mb-2 text-indigo-600">海龟汤游戏</h1>
      <p class="text-center text-gray-600 mb-8">Turtle Soup</p>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">输入昵称</label>
          <input 
            :value="nickname"
            @input="$emit('update:nickname', $event.target.value)"
            @keyup.enter="joinGame"
            type="text" 
            placeholder="请输入你的昵称..." 
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
            maxlength="20"
          />
        </div>
        
        <button 
          @click="joinGame"
          :disabled="!nickname.trim()"
          class="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition transform active:scale-95"
        >
          加入游戏
        </button>
      </div>
      
      <div class="mt-8 pt-6 border-t border-gray-200">
        <p class="text-sm text-gray-600 text-center">
          第一个加入的玩家自动成为主持人
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  nickname: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['join', 'update:nickname']);

const joinGame = () => {
  emit('join');
};
</script>
