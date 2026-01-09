<script setup>
import { ref } from 'vue'
import faqData from '../data/faq.json'

const activeItems = ref({})

function toggleItem(categoryIndex, itemIndex) {
  const key = `${categoryIndex}-${itemIndex}`
  activeItems.value[key] = !activeItems.value[key]
}
</script>

<template>
  <main class="container">
    <header class="header-nav">
      <h1>Foire Aux Questions (FAQ)</h1>
      <p class="subtitle">Retrouvez les réponses aux questions les plus fréquentes sur la formation et l'examen civique.</p>
    </header>

    <div class="faq-content">
      <div v-for="(category, cIdx) in faqData" :key="cIdx" class="faq-category">
        <h2 class="category-title">{{ category.category }}</h2>
        
        <div class="faq-list">
          <div 
            v-for="(item, iIdx) in category.items" 
            :key="iIdx" 
            class="faq-item"
            :class="{ active: activeItems[`${cIdx}-${iIdx}`] }"
          >
            <button class="faq-question" @click="toggleItem(cIdx, iIdx)">
              <span>{{ item.question }}</span>
              <span class="icon">{{ activeItems[`${cIdx}-${iIdx}`] ? '−' : '+' }}</span>
            </button>
            <div class="faq-answer" v-show="activeItems[`${cIdx}-${iIdx}`]">
              <p v-if="item.answer && item.answer.fr">{{ item.answer.fr }}</p>
              <p v-else-if="typeof item.answer === 'string'">{{ item.answer }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer class="faq-footer">
      <p>Source : <a href="https://formation-civique.interieur.gouv.fr/" target="_blank">Site officiel de la formation civique</a></p>
    </footer>
  </main>
</template>

<style scoped>
.container {
  padding: 40px var(--space-lg);
  max-width: 800px;
  margin: 0 auto;
}

.header-nav {
  margin-bottom: 48px;
  text-align: center;
}

h1 {
  font-size: 2.5rem;
  color: var(--color-text-main);
  margin-bottom: 12px;
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: 1.1rem;
}

.faq-category {
  margin-bottom: 40px;
}

.category-title {
  font-size: 1.25rem;
  color: var(--color-primary);
  border-bottom: 2px solid var(--color-bg-muted);
  padding-bottom: 12px;
  margin-bottom: 20px;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faq-item {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all 0.2s;
}

.faq-item.active {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.faq-question {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: none;
  border: none;
  text-align: left;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text-main);
  cursor: pointer;
}

.faq-question:hover {
  background: var(--color-bg-muted);
}

.faq-answer {
  padding: 0 20px 20px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.icon {
  font-size: 1.5rem;
  font-weight: 300;
  color: var(--color-primary);
}

.faq-footer {
  margin-top: 60px;
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.faq-footer a {
  color: var(--color-primary);
  text-decoration: none;
}
</style>
