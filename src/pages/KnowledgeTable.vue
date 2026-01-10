<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchKnowledgeTable, fetchKnowledgeCards } from '../services/knowledgeService'

const props = defineProps({
  theme: {
    type: String,
    required: true
  }
})

const router = useRouter()
const tableData = ref(null)
const cards = ref([])
const loading = ref(true)
const viewMode = ref('table') // 'table' | 'review'
const currentLang = ref('fr')

// Review State
const reviewIndex = ref(0)
const shuffledItems = ref([])
const isReviewFlipped = ref(false)

// Dynamically load data
onMounted(async () => {
  try {
    // 1. Fetch Table Data
    const tableResult = await fetchKnowledgeTable(props.theme)
    if (tableResult) {
      tableData.value = tableResult
    }

    // 2. Fetch Cards Data (for Review)
    cards.value = await fetchKnowledgeCards(props.theme)
  } catch (e) {
    console.error('Failed to load theme data:', e)
  } finally {
    loading.value = false
  }
})

function startReview() {
  if (cards.value.length === 0) return
  
  const items = []
  cards.value.forEach(card => {
    if (Array.isArray(card.front_prompt)) {
      card.front_prompt.forEach(prompt => {
        items.push({ card, prompt })
      })
    } else {
      items.push({ card, prompt: card.front_prompt })
    }
  })

  shuffledItems.value = items.sort(() => Math.random() - 0.5)
  reviewIndex.value = 0
  isReviewFlipped.value = false
  viewMode.value = 'review'
}

function exitReview() {
  viewMode.value = 'table'
}

function nextReview() {
  if (reviewIndex.value < shuffledItems.value.length - 1) {
    reviewIndex.value++
    isReviewFlipped.value = false
  } else {
    viewMode.value = 'table'
  }
}

function getLangText(obj) {
  if (!obj) return { main: '', sub: '' }
  if (typeof obj === 'string') return { main: obj, sub: '' }
  
  const main = obj['fr'] || ''
  let sub = ''
  if (currentLang.value !== 'fr') {
    sub = obj[currentLang.value] || ''
  }
  return { main, sub }
}

// Helper to get text for flashcards (Copy from KnowledgeStandard.vue)
function getCardText(card, field) {
  if (!card) return { main: '', sub: '' }
  const main = card[`${field}_fr`] || ''
  let sub = ''
  if (currentLang.value !== 'fr') {
    sub = card[`${field}_${currentLang.value}`] || ''
  }
  return { main, sub }
}

function getReviewPromptText(item) {
  if (!item || !item.prompt) return { main: '', sub: '' }
  const main = item.prompt.fr || ''
  let sub = ''
  if (currentLang.value !== 'fr') {
    sub = item.prompt[currentLang.value] || ''
  }
  return { main, sub }
}
</script>

<template>
  <div class="knowledge-table-view" v-if="tableData">
    <header class="table-header">
      <div class="header-main-nav">
        <router-link to="/knowledge" class="btn-back">← Retour</router-link>
        <div class="title-group">
          <h1>{{ viewMode === 'table' ? getLangText(tableData.title).main : 'Révision : ' + getLangText(tableData.title).main }}</h1>
          <p v-if="getLangText(tableData.title).sub" class="title-sub">{{ getLangText(tableData.title).sub }}</p>
        </div>
      </div>
      
      <div class="header-controls">
        <div class="lang-selector">
          <button :class="{ active: currentLang === 'fr' }" @click="currentLang = 'fr'">FR</button>
          <button :class="{ active: currentLang === 'cn' }" @click="currentLang = 'cn'">CN</button>
          <button :class="{ active: currentLang === 'en' }" @click="currentLang = 'en'">EN</button>
        </div>

        <div class="header-actions" v-if="cards.length > 0">
          <button v-if="viewMode === 'table'" class="btn-action-primary" @click="startReview">
            🗂️ Réviser
          </button>
          <button v-else class="btn-action-secondary" @click="exitReview">✕ Quitter</button>
        </div>
      </div>
    </header>

    <!-- TABLE VIEW -->
    <div v-if="viewMode === 'table'" class="table-container shadow-sm fade-in">
      <table>
        <thead>
          <tr>
            <th v-for="col in tableData.columns" :key="col.key">
              <div class="header-cell">
                <span class="header-main">{{ getLangText(col.label).main }}</span>
                <span v-if="getLangText(col.label).sub" class="header-sub">{{ getLangText(col.label).sub }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in tableData.rows" :key="index">
            <td v-for="col in tableData.columns" :key="col.key">
              <div class="cell-content">
                <span class="main-text">{{ getLangText(row[col.key]).main }}</span>
                <span v-if="getLangText(row[col.key]).sub" class="sub-text">{{ getLangText(row[col.key]).sub }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- REVIEW VIEW (Copy of KnowledgeStandard.vue logic) -->
    <div v-else class="review-view fade-in">
      <div v-if="shuffledItems.length > 0" class="review-container">
        <div class="review-meta">
          <span class="progress-text">Carte {{ reviewIndex + 1 }} sur {{ shuffledItems.length }}</span>
          <span class="difficulty-indicator" :class="'diff-' + shuffledItems[reviewIndex].card.difficulty">
            Niveau {{ shuffledItems[reviewIndex].card.difficulty }}
          </span>
        </div>

        <div class="flashcard-wrapper">
          <div class="flashcard" :class="{ flipped: isReviewFlipped }" @click="isReviewFlipped = !isReviewFlipped">
            <div class="card-inner">
              <!-- Front -->
              <div class="card-face front">
                <div class="card-label">QUESTION</div>
                <div class="card-body">
                  <div class="prompt-container">
                    <p class="prompt-text">{{ getReviewPromptText(shuffledItems[reviewIndex]).main }}</p>
                    <p v-if="getReviewPromptText(shuffledItems[reviewIndex]).sub" class="prompt-sub">{{ getReviewPromptText(shuffledItems[reviewIndex]).sub }}</p>
                  </div>
                </div>
                <div class="card-hint">Cliquer pour révéler la réponse</div>
              </div>
              <!-- Back -->
              <div class="card-face back">
                <div class="card-label">RÉPONSE</div>
                <div class="card-body">
                  <div class="answer-container">
                    <p class="answer-text">{{ getCardText(shuffledItems[reviewIndex].card, 'core').main }}</p>
                    <p v-if="getCardText(shuffledItems[reviewIndex].card, 'core').sub" class="answer-sub">{{ getCardText(shuffledItems[reviewIndex].card, 'core').sub }}</p>
                  </div>
                </div>
                <div class="card-hint">Cliquer pour retourner</div>
              </div>
            </div>
          </div>
        </div>

        <div class="review-actions">
          <button class="btn-action-primary main-action" @click="nextReview">
            {{ reviewIndex === shuffledItems.length - 1 ? 'Session Terminée' : 'Question Suivante →' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="loading-state">
    <p>Chargement du tableau...</p>
  </div>
</template>

<style scoped>
.knowledge-table-view {
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.table-header {
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.header-main-nav {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
}

.btn-back {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.btn-back:hover {
  color: var(--color-primary);
}

h1 {
  font-size: 1.8rem;
  color: var(--color-text-main);
  margin: 0;
  font-weight: 800;
  line-height: 1.2;
}

.title-sub {
  font-size: 1rem;
  color: var(--color-text-secondary);
  font-style: italic;
  margin-top: 4px;
}

.lang-selector {
  display: flex;
  gap: 8px;
}

.lang-selector button {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: white;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.lang-selector button.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-action-primary {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-action-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-action-secondary {
  background: white;
  border: 1px solid var(--color-border);
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
}

/* Table Container */
.table-container {
  background: white;
  border-radius: 12px;
  overflow-x: auto;
  border: 1px solid var(--color-border);
}

/* ... existing table styles ... */

/* Flashcard Styles (Review View) */
.review-view {
  margin-top: 20px;
}

.review-container {
  max-width: 500px;
  margin: 0 auto;
}

.review-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.progress-text {
  font-weight: 700;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.difficulty-indicator {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.diff-1 { background: #e6f6ea; color: #059669; }
.diff-2 { background: #fff7ed; color: #d97706; }
.diff-3 { background: #fef2f2; color: #dc2626; }

.flashcard-wrapper {
  margin-bottom: 32px;
}

.flashcard {
  width: 100%;
  height: 380px;
  perspective: 1000px;
  cursor: pointer;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

.flashcard.flipped .card-inner { transform: rotateY(180deg); }

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 24px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid var(--color-border);
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
}

.card-face.back {
  transform: rotateY(180deg);
  background: #fcfdff;
}

.card-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-primary);
  font-weight: 900;
  letter-spacing: 2px;
  margin-bottom: 24px;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.prompt-container, .answer-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prompt-text, .answer-text {
  font-size: 1.4rem;
  line-height: 1.4;
  font-weight: 700;
  color: var(--color-text-main);
  margin: 0;
  white-space: pre-line;
}

.prompt-sub, .answer-sub {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  font-style: italic;
}

.card-hint {
  margin-top: auto;
  font-size: 0.8rem;
  color: var(--color-text-light);
  text-align: center;
  opacity: 0.6;
}

.review-actions {
  display: flex;
  justify-content: center;
}

.main-action {
  width: 100%;
  padding: 16px !important;
  font-size: 1.1rem !important;
  border-radius: 16px !important;
}

.fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: stretch;
  }
  .header-controls {
    align-items: flex-start;
  }
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

th {
  background: #f8f9fa;
  padding: 16px;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--color-text-main);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
}

.header-cell {
  display: flex;
  flex-direction: column;
}

.header-sub {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 400;
  font-style: italic;
}

td {
  padding: 16px;
  font-size: 0.95rem;
  color: var(--color-text-main);
  border-bottom: 1px solid #eee;
  line-height: 1.5;
}

tr:last-child td {
  border-bottom: none;
}

tr:hover td {
  background-color: #fcfcfc;
}

.cell-content {
  display: flex;
  flex-direction: column;
}

.main-text {
  font-weight: 500;
}

.sub-text {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-style: italic;
  margin-top: 4px;
}

.loading-state {
  text-align: center;
  padding: 100px;
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  th, td {
    padding: 12px;
    font-size: 0.85rem;
  }
}
</style>
