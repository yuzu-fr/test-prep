<script setup>
import { computed, defineAsyncComponent } from 'vue'

const props = defineProps({
  theme: {
    type: String,
    required: true
  }
})

// Define specialized components
const HistoryView = defineAsyncComponent(() => import('./KnowledgeHistory.vue'))
const StandardView = defineAsyncComponent(() => import('./KnowledgeStandard.vue'))
const TableView = defineAsyncComponent(() => import('./KnowledgeTable.vue'))

// Check for table data files using Vite's glob import
const tableDataFiles = import.meta.glob('../data/knowledge_table_*.json')

// Dispatcher logic
const CurrentView = computed(() => {
  // 1. Check if a table view exists for this theme
  const tablePath = `../data/knowledge_table_${props.theme}.json`
  if (tableDataFiles[tablePath]) {
    return TableView
  }

  // 2. Special case for history
  if (props.theme === 'history') {
    return HistoryView
  }

  // 3. Fallback to standard view
  return StandardView
})
</script>

<template>
  <transition name="fade" mode="out-in">
    <component :is="CurrentView" :theme="theme" />
  </transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
