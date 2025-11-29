<template>
  <div class="bg-white rounded-lg shadow-lg p-6">
    <h3 class="text-xl font-bold mb-4 text-gray-800">提问历史</h3>
    
    <div v-if="history.length === 0" class="text-center text-gray-400 py-8">
      暂无提问记录
    </div>
    
    <div v-else ref="historyContainer" class="space-y-3 max-h-96 overflow-y-auto">
      <div 
        v-for="item in history" 
        :key="item.id"
        class="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
      >
        <div class="flex justify-between items-start mb-2">
          <span class="font-semibold text-indigo-600">{{ item.playerName }}</span>
          <span class="text-xs text-gray-500">#{{ history.indexOf(item) + 1 }}</span>
        </div>
        
        <div class="mb-2">
          <span class="text-sm text-gray-600">问：</span>
          <span class="text-gray-800">{{ item.question }}</span>
        </div>
        
        <div v-if="item.answer" class="pl-4 border-l-2 border-green-500">
          <span class="text-sm text-gray-600">答：</span>
          <span class="text-gray-800">{{ item.answer }}</span>
        </div>
        
        <div v-else-if="isHost" class="mt-2">
          <textarea 
            v-model="answerInputs[item.id]"
            placeholder="输入回答..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            rows="2"
          ></textarea>
          <button 
            @click="$emit('answer-question', item.id, answerInputs[item.id])"
            :disabled="!answerInputs[item.id] || !answerInputs[item.id].trim()"
            class="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition text-sm font-semibold"
          >
            提交回答
          </button>
        </div>
        
        <div v-else class="text-sm text-gray-400 italic mt-2">
          等待主持人回答...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
  history: {
    type: Array,
    required: true
  },
  isHost: {
    type: Boolean,
    required: true
  }
});

defineEmits(['answer-question']);

const historyContainer = ref(null);
const answerInputs = ref({});

watch(() => props.history, () => {
  nextTick(() => {
    if (historyContainer.value) {
      historyContainer.value.scrollTop = historyContainer.value.scrollHeight;
    }
  });
}, { deep: true });

defineExpose({ historyContainer });
</script>
