<script setup>
import { computed } from 'vue'

const props = defineProps({
  options: Object,        // { fr: [], cn: [] }
  activeLanguages: Array,
  selected: Number,
  validated: Boolean,
  correctIndex: Number,
})

const emit = defineEmits(['select'])

// 找到第一个在 options 中存在的语言，作为循环的基础
const baseLang = computed(() => {
  return props.activeLanguages.find(lang => props.options[lang]) || Object.keys(props.options)[0]
})

function optionClass(i) {
  return {
    selected: !props.validated && props.selected === i,
    correct: props.validated && i === props.correctIndex,
    wrong:
      props.validated &&
      i === props.selected &&
      i !== props.correctIndex,
    locked: props.validated
  }
}
</script>

<template>
  <ul class="options" v-if="baseLang && options[baseLang]">
    <li
      v-for="(_, i) in options[baseLang]"
      :key="i"
      :class="optionClass(i)"
      @click="emit('select', i)"
    >
      <div 
        v-for="lang in activeLanguages" 
        :key="lang"
        :class="['option-text', lang]"
      >
        <span v-if="options[lang] && options[lang][i]">
          {{ options[lang][i] }}
        </span>
        <span v-else-if="lang === activeLanguages[0]" class="missing-lang">
          [Pas de traduction en {{ lang.toUpperCase() }}]
        </span>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.options {
  list-style: none;
  padding: 0;
  margin: 20px 0;
}

.options li {
  padding: 16px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.options li:not(.locked):hover {
  border-color: var(--color-primary, #4f7cff);
  background: #f8faff;
}

.options li.selected {
  background: #eef4ff;
  border-color: var(--color-primary, #4f7cff);
  box-shadow: 0 2px 8px rgba(79, 124, 255, 0.1);
}

.options li.correct {
  background: #e6f6ea;
  border-color: #2ecc71;
  color: #1b5e20;
}

.options li.wrong {
  background: #fdecea;
  border-color: #e74c3c;
  color: #b71c1c;
}

.options li.locked {
  cursor: default;
}

.option-text {
  line-height: 1.4;
}

.option-text.cn {
  font-size: 0.9rem;
  margin-top: 4px;
  opacity: 0.8;
}

.missing-lang {
  font-style: italic;
  color: var(--color-text-secondary);
  opacity: 0.6;
  font-size: 0.85rem;
}
</style>
    