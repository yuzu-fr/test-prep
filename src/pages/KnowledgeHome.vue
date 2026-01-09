<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const themes = [
  { 
    id: 'history', 
    name: 'Histoire', 
    desc: 'Les dates clés, les personnages et les événements fondateurs.',
    icon: '🏰',
    active: true
  },
  { 
    id: 'geography', 
    name: 'Géographie', 
    desc: 'Les fleuves, les montagnes, les régions et les symboles.',
    icon: '🌍',
    active: false
  },
  { 
    id: 'culture', 
    name: 'Culture', 
    desc: 'La langue française, les arts, les sciences et les sports.',
    icon: '🎨',
    active: false
  }
]

function selectTheme(theme) {
  if (theme.active) {
    router.push('/knowledge/history')
  }
}
</script>

<template>
  <main class="container">
    <header class="page-header">
      <h1>Mémos de Connaissances</h1>
      <p class="subtitle">Sélectionnez un thème pour explorer les fiches de révision.</p>
    </header>

    <div class="theme-grid">
      <div 
        v-for="theme in themes" 
        :key="theme.id" 
        class="theme-card"
        :class="{ inactive: !theme.active }"
        @click="selectTheme(theme)"
      >
        <div class="theme-icon">{{ theme.icon }}</div>
        <div class="theme-content">
          <h3>{{ theme.name }}</h3>
          <p>{{ theme.desc }}</p>
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
