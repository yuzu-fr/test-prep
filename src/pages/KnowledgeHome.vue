<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchKnowledgeCategories } from '../services/knowledgeService'

const router = useRouter()
const themes = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    themes.value = await fetchKnowledgeCategories()
  } catch (e) {
    console.error('Failed to fetch themes:', e)
  } finally {
    loading.value = false
  }
})

function selectTheme(theme) {
  if (theme.active) {
    // Navigate to /knowledge/:themeId
    router.push(`/knowledge/${theme.id}`)
  }
}
</script>

<template>
  <main class="container">
    <header class="page-header">
      <h1>Mémos de Connaissances</h1>
      <p class="subtitle">Sélectionnez un thème pour explorer les fiches de révision.</p>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement des thèmes...</p>
    </div>

    <div v-else class="theme-grid">
      <div 
        v-for="theme in themes" 
        :key="theme.id" 
        class="theme-card"
        :class="{ inactive: !theme.active }"
        @click="selectTheme(theme)"
      >
        <div class="theme-icon">{{ theme.icon }}</div>
        <div class="theme-content">
          <h3>{{ theme.title_fr }}</h3>
          <p>{{ theme.description_fr }}</p>
        </div>
        <div v-if="theme.active" class="action-text">Explorer →</div>
        <div v-else class="status-tag">Bientôt disponible</div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.container {
  padding: var(--space-lg);
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 48px;
}

h1 {
  font-size: 2rem;
  color: var(--color-text-main);
  margin-bottom: 8px;
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: 1.1rem;
}

.loading-state {
  text-align: center;
  padding: 60px 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #eee;
  border-top-color: var(--color-primary);
  border-radius: 50%;
  margin: 0 auto 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 40px;
}

.theme-card {
  background: white;
  padding: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.theme-card:hover:not(.inactive) {
  border-color: var(--color-primary);
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.theme-card.inactive {
  opacity: 0.6;
  cursor: default;
  background: #f9f9f9;
}

.theme-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.theme-content h3 {
  margin-bottom: 12px;
  font-size: 1.25rem;
  color: var(--color-text-main);
}

.theme-content p {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 24px;
}

.action-text {
  font-weight: 700;
  color: var(--color-primary);
  font-size: 0.9rem;
}

.status-tag {
  background: var(--color-bg-muted);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

@media (max-width: 600px) {
  .theme-grid {
    grid-template-columns: 1fr;
  }
}
</style>
