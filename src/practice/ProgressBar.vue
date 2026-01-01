<script setup>
const props = defineProps({
  current: Number,
  total: Number,
})
</script>

<template>
  <div class="progress-container">
    <div class="progress-info">
      <span>Progression</span>
      <span class="count">{{ current }} / {{ total }}</span>
    </div>
    <div class="bar-bg">
      <div
        class="bar-fill"
        :style="{ width: `${(current / total) * 100}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.progress-container {
  margin: 16px 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.count {
  font-weight: 600;
  color: var(--color-primary);
}

.bar-bg {
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--color-primary, #4f7cff);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 4px;
}
</style>