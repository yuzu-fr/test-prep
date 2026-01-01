<script setup>
const props = defineProps({
  question: Object,
  activeLanguages: Array,
})
</script>

<template>
  <div class="question-card">
    <p 
      v-for="lang in activeLanguages" 
      :key="lang"
      :class="lang"
    >
      {{ question[lang] }}
    </p>
  </div>
</template>

<style scoped>
.question-card {
  margin: 24px 0;
}

p {
  font-size: 1.1rem;
  line-height: 1.5;
  margin-bottom: 8px;
  color: var(--color-text-main);
}

p.cn {
  color: var(--color-text-secondary);
  font-size: 1rem;
}
</style>