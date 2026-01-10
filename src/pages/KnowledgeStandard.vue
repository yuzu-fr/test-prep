<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchKnowledgeCards } from '../services/knowledgeService'

const props = defineProps({
  theme: {
    type: String,
    required: true
  }
})

const router = useRouter()

// ====== State ======
const cards = ref([])
const loading = ref(true)
const viewMode = ref('list') // 'list' | 'review'
const currentLang = ref('fr') // 'fr' | 'cn' | 'en'

// Review State
const reviewIndex = ref(0)
const shuffledItems = ref([]) // Each item: { card, prompt }
const isReviewFlipped = ref(false)

// ====== Data Loading ======
onMounted(async () => {
  try {
    cards.value = await fetchKnowledgeCards(props.theme)
  } catch (e) {
    console.error('Failed to load theme data:', e)
  } finally {
    loading.value = false
  }
})

// Helper to get title for the current theme
const themeTitle = computed(() => {
  const titles = {
    history: 'Histoire',
    droit: 'Droit & Institutions',
    geography: 'Géographie',
    culture: 'Culture'
  }
  return titles[props.theme] || 'Mémos'
})

// ====== Actions ======
function startReview() {
  if (cards.value.length === 0) return
  
  // Explode cards: one prompt = one card in review
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
  viewMode.value = 'list'
}

function nextReview() {
  if (reviewIndex.value < shuffledItems.value.length - 1) {
    reviewIndex.value++
    isReviewFlipped.value = false
  } else {
    viewMode.value = 'list'
  }
}

// Helper to get text based on current display logic
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
  <main class="container">
    <!-- Header Navigation -->
    <header class="page-header">
      <div class="header-content">
        <router-link to="/knowledge" class="btn-back-nav">← Retour aux thèmes</router-link>
        <h1>{{ viewMode === 'list' ? themeTitle : 'Révision : ' + themeTitle }}</h1>
        
        <!-- Language Selector -->
        <div class="lang-selector">
          <button :class="{ active: currentLang === 'fr' }" @click="currentLang = 'fr'">FR</button>
          <button :class="{ active: currentLang === 'cn' }" @click="currentLang = 'cn'">CN</button>
          <button :class="{ active: currentLang === 'en' }" @click="currentLang = 'en'">EN</button>
        </div>
      </div>
      
      <div class="header-actions" v-if="cards.length > 0">
        <button v-if="viewMode === 'list'" class="btn-primary" @click="startReview">
          🗂️ Réviser
        </button>
        <button v-else class="btn-secondary" @click="exitReview">✕ Quitter</button>
      </div>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement des fiches...</p>
    </div>

    <!-- LIST VIEW -->
    <div v-else-if="viewMode === 'list'" class="list-view fade-in">
      <div v-if="cards.length > 0" class="info-list">
        <div 
          v-for="card in cards" 
          :key="card.card_id" 
          class="info-item-card"
        >
          <div class="info-header">
            <div class="title-container">
              <h3>{{ getCardText(card, 'title').main }}</h3>
              <span v-if="getCardText(card, 'title').sub" class="title-sub">{{ getCardText(card, 'title').sub }}</span>
            </div>
            <span class="difficulty-tag" :class="'diff-' + card.difficulty">Niv. {{ card.difficulty }}</span>
          </div>
          <div class="info-body">
            <p class="body-main">{{ getCardText(card, 'core').main }}</p>
            <p v-if="getCardText(card, 'core').sub" class="body-sub">{{ getCardText(card, 'core').sub }}</p>
          </div>
        </div>
      </div>
      <div v-else class="empty-state card-view">
        <p>Ce thème n'est pas encore disponible.</p>
        <router-link to="/knowledge" class="btn-primary">Retour</router-link>
      </div>
    </div>

    <!-- REVIEW VIEW -->
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
          <button class="btn-primary main-action" @click="nextReview">
            {{ reviewIndex === shuffledItems.length - 1 ? 'Session Terminée' : 'Question Suivante →' }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.container {
  padding: var(--space-lg) 20px;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 48px;
  gap: 20px;
}

h1 {
  font-size: 1.8rem;
  color: var(--color-text-main);
  margin: 0 0 12px 0;
  font-weight: 800;
}

.lang-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
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

.btn-back-nav {
  display: inline-block;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 12px;
  transition: color 0.2s;
}

.btn-back-nav:hover {
  color: var(--color-primary);
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: 1rem;
  margin: 0;
}

/* List View */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-item-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.title-container {
  display: flex;
  flex-direction: column;
}

.info-header h3 {
  font-size: 1.1rem;
  margin: 0;
  color: var(--color-primary);
  font-weight: 700;
}

.title-sub {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.difficulty-tag {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.info-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.body-main {
  font-size: 1.1rem;
  line-height: 1.6;
  margin: 0;
  color: var(--color-text-main);
}

.body-sub {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  font-style: italic;
  margin: 0;
}

/* Flashcard Styles (Shared) */
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

/* Review Specifics */
.review-container { max-width: 500px; margin: 0 auto; }
.review-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.progress-text { font-weight: 700; color: var(--color-text-secondary); font-size: 0.9rem; }
.difficulty-indicator { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; }
.diff-1 { background: #e6f6ea; color: #059669; }
.diff-2 { background: #fff7ed; color: #d97706; }
.diff-3 { background: #fef2f2; color: #dc2626; }
.review-actions { margin-top: 32px; display: flex; justify-content: center; }
.main-action { width: 100%; padding: 16px !important; font-size: 1.1rem !important; border-radius: 16px !important; }

/* Buttons & Helpers */
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

.btn-primary { background: var(--color-primary); color: white; border: none; padding: 10px 24px; border-radius: var(--radius-sm); font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-secondary { background: white; border: 1px solid var(--color-border); padding: 8px 16px; border-radius: 20px; font-weight: 600; color: var(--color-text-secondary); cursor: pointer; }
.card-view { background: white; padding: 32px; border-radius: var(--radius-md); border: 1px solid var(--color-border); text-align: center; }
.fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 600px) {
  .page-header { flex-direction: column; align-items: stretch; }
  .btn-primary { width: 100%; }
}
</style>
