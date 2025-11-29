<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-800">选择题目</h2>
        <button 
          @click="$emit('close')"
          class="text-gray-500 hover:text-gray-700 text-2xl font-bold"
        >
          ×
        </button>
      </div>
      
      <div class="p-6 space-y-4">
        <div 
          v-for="(puzzle, index) in puzzles" 
          :key="index"
          class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1" @click="$emit('preview', puzzle)">
              <h3 class="font-bold text-lg text-gray-800 mb-2">{{ puzzle.title }}</h3>
              <p class="text-gray-600 text-sm line-clamp-2">{{ puzzle.content }}</p>
            </div>
            <button 
              @click="$emit('select', puzzle)"
              class="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold whitespace-nowrap"
            >
              选择此题
            </button>
          </div>
        </div>
        
        <div v-if="puzzles.length === 0" class="text-center text-gray-400 py-8">
          题库为空
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
  puzzles: {
    type: Array,
    required: true
  }
});

defineEmits(['close', 'select', 'preview']);
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
