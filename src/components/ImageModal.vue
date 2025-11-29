<template>
  <div 
    v-if="show" 
    @click="$emit('close')"
    class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 cursor-zoom-out"
  >
    <div 
      class="relative max-w-[90vw] max-h-[90vh]"
      @click.stop
    >
      <button 
        @click="$emit('close')"
        class="absolute -top-10 right-0 text-white text-3xl font-bold hover:text-gray-300"
      >
        ×
      </button>
      
      <div 
        ref="imageContainer"
        class="overflow-hidden cursor-move"
        @mousedown="$emit('mousedown', $event)"
        @mousemove="$emit('mousemove', $event)"
        @mouseup="$emit('mouseup')"
        @mouseleave="$emit('mouseleave')"
        @wheel="$emit('wheel', $event)"
        @dblclick="$emit('dblclick')"
        @touchstart="$emit('touchstart', $event)"
        @touchmove="$emit('touchmove', $event)"
        @touchend="$emit('touchend')"
      >
        <img 
          :src="imageSrc" 
          :style="imageStyle"
          class="max-w-none select-none"
          draggable="false"
          alt="放大图片" 
        />
      </div>
      
      <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg text-sm">
        缩放: {{ Math.round(scale * 100) }}% | 双击重置 | 滚轮缩放
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  imageSrc: {
    type: String,
    default: ''
  },
  scale: {
    type: Number,
    default: 1
  },
  translateX: {
    type: Number,
    default: 0
  },
  translateY: {
    type: Number,
    default: 0
  }
});

defineEmits(['close', 'mousedown', 'mousemove', 'mouseup', 'mouseleave', 'wheel', 'dblclick', 'touchstart', 'touchmove', 'touchend']);

const imageStyle = computed(() => ({
  transform: `scale(${props.scale}) translate(${props.translateX}px, ${props.translateY}px)`,
  transformOrigin: 'center center',
  transition: 'transform 0.1s ease-out'
}));
</script>
