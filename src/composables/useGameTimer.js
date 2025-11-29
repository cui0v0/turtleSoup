/**
 * 游戏计时器 Composable
 */
import { ref } from 'vue';

export function useGameTimer() {
  const gameStartTime = ref(null);
  const gameDuration = ref('');
  let durationTimer = null;

  const updateDuration = () => {
    if (!gameStartTime.value) {
      gameDuration.value = '';
      return;
    }
    const now = Date.now();
    const diff = Math.floor((now - gameStartTime.value) / 1000);
    const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const seconds = (diff % 60).toString().padStart(2, '0');
    gameDuration.value = `${hours}:${minutes}:${seconds}`;
  };

  const startDurationTimer = () => {
    if (durationTimer) clearInterval(durationTimer);
    updateDuration();
    durationTimer = setInterval(updateDuration, 1000);
  };

  const stopDurationTimer = () => {
    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }
    gameDuration.value = '';
  };

  return {
    gameStartTime,
    gameDuration,
    startDurationTimer,
    stopDurationTimer
  };
}
