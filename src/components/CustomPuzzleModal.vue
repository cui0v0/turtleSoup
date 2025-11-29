<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-800">{{ isEdit ? '编辑题目' : '自定义题目' }}</h2>
        <button 
          @click="handleClose"
          class="text-gray-500 hover:text-gray-700 text-2xl font-bold"
        >
          ×
        </button>
      </div>
      
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">题目标题</label>
          <input 
            v-model="formData.title"
            type="text" 
            placeholder="输入题目标题..." 
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">题目内容</label>
          <textarea 
            v-model="formData.content"
            placeholder="输入题目内容..." 
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
            rows="6"
          ></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">题目配图 (可选)</label>
          <input 
            type="file" 
            @change="handleImageUpload"
            accept="image/*"
            multiple
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
          <p class="text-xs text-gray-500 mt-1">支持多张图片，单张最大 30MB</p>
          
          <div v-if="formData.contentImages && formData.contentImages.length > 0" class="mt-3 space-y-2">
            <div v-for="(img, idx) in formData.contentImages" :key="idx" class="flex items-center space-x-2">
              <img :src="img" class="w-20 h-20 object-cover rounded border" alt="预览图" />
              <button 
                @click="removeImage(idx)"
                class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
              >
                删除
              </button>
            </div>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">谜底</label>
          <textarea 
            v-model="formData.answer"
            placeholder="输入谜底..." 
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
            rows="4"
          ></textarea>
        </div>
        
        <div class="border-t border-gray-200 pt-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">游戏限制设置</h3>
          
          <div class="space-y-3">
            <div class="flex items-center space-x-4">
              <label class="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="enableIndividualLimit"
                  class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span class="text-sm font-medium text-gray-700">限制每人提问次数</span>
              </label>
              
              <input 
                v-if="enableIndividualLimit"
                v-model.number="formData.maxQuestionsPerPlayer"
                type="number" 
                min="1"
                placeholder="次数"
                class="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            
            <div class="flex items-center space-x-4">
              <label class="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="enableTotalLimit"
                  class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span class="text-sm font-medium text-gray-700">限制总提问次数</span>
              </label>
              
              <input 
                v-if="enableTotalLimit"
                v-model.number="formData.maxTotalQuestions"
                type="number" 
                min="1"
                placeholder="次数"
                class="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          
          <p class="text-xs text-gray-500 mt-2">
            💡 提示：可以同时设置两种限制，系统会采用分层机制：优先消耗个人配额，个人配额用完后使用公共池配额
          </p>
        </div>
        
        <div class="flex space-x-3 pt-4">
          <button 
            @click="handleSubmit"
            :disabled="!canSubmit"
            class="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-semibold"
          >
            {{ isEdit ? '保存修改' : '开始游戏' }}
          </button>
          <button 
            @click="handleClose"
            class="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  initialData: {
    type: Object,
    default: null
  },
  isEdit: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'submit']);

const formData = ref({
  title: '',
  content: '',
  contentImages: [],
  answer: '',
  maxQuestionsPerPlayer: null,
  maxTotalQuestions: null
});

const enableIndividualLimit = ref(false);
const enableTotalLimit = ref(false);

const canSubmit = computed(() => {
  return formData.value.title.trim() && 
         formData.value.content.trim() && 
         formData.value.answer.trim();
});

watch(() => props.show, (newVal) => {
  if (newVal && props.initialData) {
    formData.value = { ...props.initialData };
    enableIndividualLimit.value = formData.value.maxQuestionsPerPlayer != null && formData.value.maxQuestionsPerPlayer > 0;
    enableTotalLimit.value = formData.value.maxTotalQuestions != null && formData.value.maxTotalQuestions > 0;
  } else if (newVal && !props.initialData) {
    formData.value = {
      title: '',
      content: '',
      contentImages: [],
      answer: '',
      maxQuestionsPerPlayer: null,
      maxTotalQuestions: null
    };
    enableIndividualLimit.value = false;
    enableTotalLimit.value = false;
  }
});

watch(enableIndividualLimit, (newVal) => {
  if (!newVal) {
    formData.value.maxQuestionsPerPlayer = null;
  } else if (formData.value.maxQuestionsPerPlayer == null) {
    formData.value.maxQuestionsPerPlayer = 5;
  }
});

watch(enableTotalLimit, (newVal) => {
  if (!newVal) {
    formData.value.maxTotalQuestions = null;
  } else if (formData.value.maxTotalQuestions == null) {
    formData.value.maxTotalQuestions = 20;
  }
});

const handleImageUpload = (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  Array.from(files).forEach(file => {
    if (file.size > 30 * 1024 * 1024) {
      alert(`图片 ${file.name} 超过 30MB，已跳过`);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!formData.value.contentImages) {
        formData.value.contentImages = [];
      }
      formData.value.contentImages.push(e.target.result);
    };
    reader.readAsDataURL(file);
  });
  
  event.target.value = '';
};

const removeImage = (index) => {
  formData.value.contentImages.splice(index, 1);
};

const handleSubmit = () => {
  if (!canSubmit.value) return;
  
  const data = {
    ...formData.value,
    maxQuestionsPerPlayer: enableIndividualLimit.value ? formData.value.maxQuestionsPerPlayer : null,
    maxTotalQuestions: enableTotalLimit.value ? formData.value.maxTotalQuestions : null
  };
  
  emit('submit', data);
};

const handleClose = () => {
  emit('close');
};
</script>
