<template>
  <div v-if="currentPuzzle && !gameOver" class="bg-white rounded-lg shadow-lg p-6">
    <h3 class="text-xl font-bold mb-4 text-gray-800">提出问题</h3>
    
    <div class="space-y-3">
      <textarea 
        v-model="questionText"
        :placeholder="placeholder"
        :disabled="!canAsk"
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        rows="3"
        maxlength="200"
      ></textarea>
      
      <div class="flex justify-between items-center">
        <span class="text-xs text-gray-500">{{ questionText.length }}/200</span>
        <button 
          @click="submitQuestion"
          :disabled="!canAsk || !questionText.trim()"
          class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-semibold"
        >
          发送问题
        </button>
      </div>
      
      <p v-if="!canAsk" class="text-sm text-red-600">
        {{ canAskMessage }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  currentPuzzle: {
    type: Object,
    default: null
  },
  gameOver: {
    type: Boolean,
    required: true
  },
  canAsk: {
    type: Boolean,
    required: true
  },
  placeholder: {
    type: String,
    required: true
  },
  canAskMessage: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['submit']);

const questionText = ref('');

const submitQuestion = () => {
  if (questionText.value.trim()) {
    emit('submit', questionText.value.trim());
    questionText.value = '';
  }
};
</script>
