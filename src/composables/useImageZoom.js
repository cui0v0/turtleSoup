/**
 * 图片缩放和拖动 Composable
 */
import { ref } from 'vue';

export function useImageZoom() {
  const currentImageSrc = ref('');
  const currentImageList = ref([]);
  const currentImageIndex = ref(0);
  const imageScale = ref(1);
  const imageTranslate = ref({ x: 0, y: 0 });
  const showImageModal = ref(false);
  
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let translateStart = { x: 0, y: 0 };
  
  let touchStart = null;
  let initialDistance = 0;
  let initialScale = 1;
  let touchStartTranslate = { x: 0, y: 0 };
  let lastTouchTime = 0;

  const openImageModal = (src, imageList = [], index = 0) => {
    currentImageSrc.value = src;
    currentImageList.value = imageList.length > 0 ? imageList : [src];
    currentImageIndex.value = imageList.length > 0 ? index : 0;
    showImageModal.value = true;
  };
  
  const closeImageModal = () => {
    showImageModal.value = false;
    currentImageSrc.value = '';
    currentImageList.value = [];
    currentImageIndex.value = 0;
    imageScale.value = 1;
    imageTranslate.value = { x: 0, y: 0 };
  };
  
  const prevImage = () => {
    if (currentImageList.value.length <= 1) return;
    currentImageIndex.value = (currentImageIndex.value - 1 + currentImageList.value.length) % currentImageList.value.length;
    currentImageSrc.value = currentImageList.value[currentImageIndex.value];
    imageScale.value = 1;
    imageTranslate.value = { x: 0, y: 0 };
  };
  
  const nextImage = () => {
    if (currentImageList.value.length <= 1) return;
    currentImageIndex.value = (currentImageIndex.value + 1) % currentImageList.value.length;
    currentImageSrc.value = currentImageList.value[currentImageIndex.value];
    imageScale.value = 1;
    imageTranslate.value = { x: 0, y: 0 };
  };
  
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (imageScale.value === 1) {
      imageScale.value = 2;
    } else {
      imageScale.value = 1;
      imageTranslate.value = { x: 0, y: 0 };
    }
  };
  
  const handleImageClick = (e) => {
    if (imageScale.value === 1 && !e.target.closest('img')) {
      closeImageModal();
    }
  };
  
  const handleWheel = (e) => {
    if (!showImageModal.value) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    let newScale = imageScale.value + delta;
    newScale = Math.max(1, Math.min(3, newScale));
    
    if (newScale === 1) {
      imageTranslate.value = { x: 0, y: 0 };
    }
    imageScale.value = newScale;
  };
  
  const handleMouseDown = (e) => {
    if (imageScale.value <= 1) return;
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    translateStart = { ...imageTranslate.value };
    e.preventDefault();
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging || imageScale.value <= 1) return;
    const deltaX = (e.clientX - dragStart.x) / imageScale.value;
    const deltaY = (e.clientY - dragStart.y) / imageScale.value;
    imageTranslate.value = {
      x: translateStart.x + deltaX,
      y: translateStart.y + deltaY
    };
  };
  
  const handleMouseUp = () => {
    isDragging = false;
  };
  
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      initialDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      initialScale = imageScale.value;
      e.preventDefault();
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTouchTime < 300) {
        handleDoubleClick(e);
      }
      lastTouchTime = now;
      
      if (imageScale.value > 1) {
        touchStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
        touchStartTranslate = { ...imageTranslate.value };
      }
    }
  };
  
  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      let newScale = initialScale * (distance / initialDistance);
      newScale = Math.max(1, Math.min(3, newScale));
      
      if (newScale === 1) {
        imageTranslate.value = { x: 0, y: 0 };
      }
      imageScale.value = newScale;
      e.preventDefault();
    } else if (e.touches.length === 1 && touchStart && imageScale.value > 1) {
      const deltaX = (e.touches[0].clientX - touchStart.x) / imageScale.value;
      const deltaY = (e.touches[0].clientY - touchStart.y) / imageScale.value;
      imageTranslate.value = {
        x: touchStartTranslate.x + deltaX,
        y: touchStartTranslate.y + deltaY
      };
      e.preventDefault();
    }
  };
  
  const handleTouchEnd = () => {
    touchStart = null;
  };

  return {
    currentImageSrc,
    currentImageList,
    currentImageIndex,
    imageScale,
    imageTranslate,
    showImageModal,
    openImageModal,
    closeImageModal,
    prevImage,
    nextImage,
    handleDoubleClick,
    handleImageClick,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}
