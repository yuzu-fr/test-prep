<script setup>
import { ref, watch, onMounted, defineAsyncComponent } from 'vue'
import { fetchKnowledgeTable } from '../services/knowledgeService'

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

const currentView = ref(null)
const loading = ref(true)

async function resolveView() {
  loading.value = true
  try {
    // 1. Check if a table exists for this theme in Supabase
    const table = await fetchKnowledgeTable(props.theme)
    if (table) {
      currentView.value = TableView
      return
    }

    // 2. Special case for history
    if (props.theme === 'history') {
      currentView.value = HistoryView
      return
    }

    // 3. Fallback to standard view
    currentView.value = StandardView
  } catch (e) {
    console.error('Error resolving view:', e)
    currentView.value = StandardView
  } finally {
    loading.value = false
  }
}

onMounted(resolveView)
watch(() => props.theme, resolveView)
</script>

<template>
  <div v-if="loading" class="loading-state">
    <div class="spinner"></div>
  </div>
  <transition v-else name="fade" mode="out-in">
    <component :is="currentView" :theme="theme" />
  </transition>
</template>

<style scoped>
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
