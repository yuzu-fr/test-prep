<script setup>
const props = defineProps({
  question: Object,
  activeLanguages: Array,
})
</script>

<template>
  <div class="question-card">
    <template v-for="lang in activeLanguages" :key="lang">
      <p 
        v-if="question[lang]"
        :class="lang"
      >
        {{ question[lang] }}
      </p>
      <p v-else-if="lang === activeLanguages[0]" class="missing-lang">
        [Pas de traduction en {{ lang.toUpperCase() }}]
      </p>
    </template>
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

.missing-lang {
  font-style: italic;
  color: var(--color-text-secondary);
  opacity: 0.6;
  font-size: 0.9rem;
}
</style>