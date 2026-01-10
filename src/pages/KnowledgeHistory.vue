<script setup>
import { ref, computed } from 'vue'
import historyCards from '../data/knowledge_cards_history.json'

defineProps({
  theme: String
})

// ====== State ======
const viewMode = ref('timeline') // 'timeline' | 'review'
const activeCardId = ref(null)
const activeModalPrompt = ref(null) // Stores the specific prompt chosen for the modal
const isModalFlipped = ref(false)
const expandedYears = ref(new Set()) 
const currentLang = ref('fr') // 'fr' | 'cn' | 'en'

// Review State
const reviewIndex = ref(0)
const shuffledItems = ref([]) // Each item: { card, prompt }
const isReviewFlipped = ref(false)
const selectedTag = ref('all')

// ====== Data Processing ======
const sortedCards = [...historyCards].sort((a, b) => a.timeline_order - b.timeline_order)

const allTags = computed(() => {
  const tags = new Set()
  historyCards.forEach(c => {
    if (c.tags) c.tags.forEach(t => tags.add(t))
  })
  return ['all', ...Array.from(tags)]
})

// Timeline Grouping
const timelineData = computed(() => {
  const periods = {}
  sortedCards.forEach(card => {
    if (!periods[card.period]) periods[card.period] = {}
    if (!periods[card.period][card.timeline_order]) periods[card.period][card.timeline_order] = []
    periods[card.period][card.timeline_order].push(card)
  })
  return periods
})

const activeCard = computed(() => historyCards.find(c => c.card_id === activeCardId.value))

// ====== Actions ======
function openCard(cardId) {
  const card = historyCards.find(c => c.card_id === cardId)
  if (!card) return
  
  activeCardId.value = cardId
  isModalFlipped.value = false
  
  // Pick one random prompt for this view
  if (Array.isArray(card.front_prompt)) {
    activeModalPrompt.value = card.front_prompt[Math.floor(Math.random() * card.front_prompt.length)]
  } else {
    activeModalPrompt.value = card.front_prompt
  }
}

function closeCard() {
  activeCardId.value = null
  activeModalPrompt.value = null
}

function toggleYear(yearKey) {
  if (expandedYears.value.has(yearKey)) {
    expandedYears.value.delete(yearKey)
  } else {
    expandedYears.value.add(yearKey)
  }
}

function startReview() {
  const pool = selectedTag.value === 'all' 
    ? historyCards 
    : historyCards.filter(c => c.tags.includes(selectedTag.value))
  
  // Explode cards: one prompt = one card in review
  const items = []
  pool.forEach(card => {
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
  viewMode.value = 'timeline'
}

function nextReview() {
  if (reviewIndex.value < shuffledItems.value.length - 1) {
    reviewIndex.value++
    isReviewFlipped.value = false
  } else {
    viewMode.value = 'timeline'
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

function getModalPromptText() {
  if (!activeModalPrompt.value) return { main: '', sub: '' }
  const main = activeModalPrompt.value.fr || ''
  let sub = ''
  if (currentLang.value !== 'fr') {
    sub = activeModalPrompt.value[currentLang.value] || ''
  }
  return { main, sub }
}

const periodColors = {
  "Moyen Âge": "#634392",
  "Ancien Régime": "#2c3e50",
  "Révolution / Républiques": "#a02d23",
  "Empire / Monarchies": "#b37d12",
  "Républiques modernes": "#0e7490",
  "Guerres mondiales": "#374151",
  "Décolonisation": "#92400e",
  "Europe / Société contemporaine": "#1d4ed8"
}
</script>

<template>
  <main class="container">
    <!-- Header Navigation -->
    <header class="page-header">
      <div class="header-content">
        <router-link to="/knowledge" class="btn-back-nav">← Retour aux thèmes</router-link>
        <h1>{{ viewMode === 'timeline' ? 'Histoire de France' : 'Révision : Histoire' }}</h1>
        
        <!-- Language Selector -->
        <div class="lang-selector">
          <button :class="{ active: currentLang === 'fr' }" @click="currentLang = 'fr'">FR</button>
          <button :class="{ active: currentLang === 'cn' }" @click="currentLang = 'cn'">CN</button>
          <button :class="{ active: currentLang === 'en' }" @click="currentLang = 'en'">EN</button>
        </div>
      </div>
      
      <div class="header-actions">
        <template v-if="viewMode === 'timeline'">
          <div class="filter-group">
            <button class="btn-primary" @click="startReview">
              🗂️ Réviser
            </button>
          </div>
        </template>
        <button v-else class="btn-secondary" @click="exitReview">✕ Quitter</button>
      </div>
    </header>

    <!-- TIMELINE VIEW -->
    <div v-if="viewMode === 'timeline'" class="timeline-view fade-in">
      <div v-for="(years, period) in timelineData" :key="period" class="period-group">
        <div class="period-header">
          <h2 class="period-title" :style="{ color: periodColors[period] }">{{ period }}</h2>
          <div class="period-line" :style="{ backgroundColor: periodColors[period] }"></div>
        </div>
        
        <div class="year-list">
          <div v-for="(cards, year) in years" :key="year" class="year-row">
            <!-- Single Event -->
            <div v-if="cards.length === 1" class="event-card" @click="openCard(cards[0].card_id)">
              <div class="dot" :style="{ borderColor: periodColors[period] }"></div>
              <span class="year-label">{{ year }}</span>
              <div class="title-container">
                <span class="title-label">{{ getCardText(cards[0], 'title').main }}</span>
                <span v-if="getCardText(cards[0], 'title').sub" class="title-sub">{{ getCardText(cards[0], 'title').sub }}</span>
              </div>
            </div>

            <!-- Multi Event -->
            <div v-else class="shared-year-group">
              <div class="event-card summary" @click="toggleYear(`${period}-${year}`)">
                <div class="dot" :style="{ borderColor: periodColors[period] }"></div>
                <span class="year-label">{{ year }}</span>
                <div class="title-container">
                  <span class="title-label">{{ getCardText(cards[0], 'title').main }}</span>
                  <span v-if="getCardText(cards[0], 'title').sub" class="title-sub">{{ getCardText(cards[0], 'title').sub }}</span>
                </div>
                <span class="badge-more">+{{ cards.length - 1 }}</span>
              </div>
              <transition name="slide">
                <div v-if="expandedYears.has(`${period}-${year}`)" class="sub-events">
                  <div v-for="card in cards.slice(1)" :key="card.card_id" class="event-card sub" @click="openCard(card.card_id)">
                    <div class="title-container">
                      <span class="title-label">{{ getCardText(card, 'title').main }}</span>
                      <span v-if="getCardText(card, 'title').sub" class="title-sub">{{ getCardText(card, 'title').sub }}</span>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
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
      
      <div v-else class="empty-state card-view">
        <p>Aucune fiche trouvée pour ce thème.</p>
        <button class="btn-primary" @click="exitReview">Retour à la chronologie</button>
      </div>
    </div>

    <!-- MODAL LOOKUP -->
    <transition name="fade">
      <div v-if="activeCardId && activeCard" class="modal-overlay" @click.self="closeCard">
        <div class="modal-container">
          <button class="btn-close-modal" @click="closeCard">✕</button>
          
          <div class="flashcard modal-card" :class="{ flipped: isModalFlipped }" @click="isModalFlipped = !isModalFlipped">
            <div class="card-inner">
              <div class="card-face front">
                <div class="modal-header">
                  <span class="modal-year">[{{ activeCard.timeline_order }}]</span>
                  <div class="title-container">
                    <span class="modal-title">{{ getCardText(activeCard, 'title').main }}</span>
                    <span v-if="getCardText(activeCard, 'title').sub" class="modal-title-sub">{{ getCardText(activeCard, 'title').sub }}</span>
                  </div>
                </div>
                <div class="card-label">QUESTION</div>
                <div class="card-body">
                  <div class="prompt-container">
                    <p class="prompt-text">{{ getModalPromptText().main }}</p>
                    <p v-if="getModalPromptText().sub" class="prompt-sub">{{ getModalPromptText().sub }}</p>
                  </div>
                </div>
                <div class="card-hint">Cliquer pour voir la réponse</div>
              </div>
              
              <div class="card-face back">
                <div class="modal-header">
                  <span class="modal-title">RÉPONSE</span>
                </div>
                <div class="card-body">
                  <div class="answer-container">
                    <p class="answer-text">{{ getCardText(activeCard, 'core').main }}</p>
                    <p v-if="getCardText(activeCard, 'core').sub" class="answer-sub">{{ getCardText(activeCard, 'core').sub }}</p>
                  </div>
                </div>
                <div class="card-hint">Cliquer pour retourner</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </main>
</template>

<style scoped>
.container {
  padding: var(--space-lg) 20px;
  max-width: 800px;
  margin: 0 auto;
}

/* Page Header */
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

.header-actions {
  display: flex;
  align-items: center;
}

.filter-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Timeline Styles */
.period-group {
  margin-bottom: 56px;
}

.period-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.period-title {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 900;
  margin: 0;
  white-space: nowrap;
}

.period-line {
  height: 2px;
  flex: 1;
  opacity: 0.2;
}

.year-list {
  border-left: 2px solid var(--color-border);
  padding-left: 32px;
  margin-left: 8px;
}

.year-row {
  margin-bottom: 20px;
  position: relative;
}

.event-card {
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  padding: 12px 16px;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
  position: relative;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.event-card:hover {
  border-color: var(--color-primary);
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.event-card .dot {
  position: absolute;
  left: -41px;
  width: 16px;
  height: 16px;
  background: white;
  border: 4px solid;
  border-radius: 50%;
  z-index: 2;
  box-shadow: 0 0 0 4px white;
}

.year-label {
  font-family: monospace;
  font-weight: 800;
  color: var(--color-primary);
  font-size: 1.1rem;
  min-width: 50px;
}

.title-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.title-label {
  font-weight: 600;
  color: var(--color-text-main);
}

.title-sub {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 400;
}

.badge-more {
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 700;
}

.sub-events {
  margin-top: 12px;
  padding-left: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-card.sub {
  background: #fafafa;
  padding: 10px 16px;
  font-size: 0.95rem;
}

/* Flashcard Component Base */
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

/* Review View Specifics */
.review-container { max-width: 500px; margin: 0 auto; }
.review-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.progress-text { font-weight: 700; color: var(--color-text-secondary); font-size: 0.9rem; }
.difficulty-indicator { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; }
.diff-1 { background: #e6f6ea; color: #059669; }
.diff-2 { background: #fff7ed; color: #d97706; }
.diff-3 { background: #fef2f2; color: #dc2626; }
.review-actions { margin-top: 32px; display: flex; justify-content: center; }
.main-action { width: 100%; padding: 16px !important; font-size: 1.1rem !important; border-radius: 16px !important; }

/* Modal Specifics */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(8px); padding: 20px; }
.modal-container { width: 100%; max-width: 480px; position: relative; }
.btn-close-modal { position: absolute; top: -48px; right: 0; background: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
.modal-header { margin-bottom: 20px; display: flex; gap: 8px; align-items: baseline; border-bottom: 1px solid #eee; padding-bottom: 12px; }
.modal-title { font-weight: 800; font-size: 1rem; color: var(--color-text-main); }
.modal-title-sub { font-size: 0.8rem; color: var(--color-text-secondary); font-weight: 500; }

/* Base Styles (Buttons & Helpers) */
.btn-primary { background: var(--color-primary); color: white; border: none; padding: 10px 24px; border-radius: var(--radius-sm); font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-secondary { background: white; border: 1px solid var(--color-border); padding: 8px 16px; border-radius: 20px; font-weight: 600; color: var(--color-text-secondary); cursor: pointer; }
.card-view { background: white; padding: 32px; border-radius: var(--radius-md); border: 1px solid var(--color-border); text-align: center; }
.fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: all 0.3s ease; max-height: 500px; }
.slide-enter-from, .slide-leave-to { opacity: 0; max-height: 0; transform: translateY(-10px); }

@media (max-width: 600px) {
  .page-header { flex-direction: column; align-items: stretch; }
  .filter-group { flex-direction: column; width: 100%; }
  .btn-primary { width: 100%; }
  .year-list { padding-left: 24px; }
  .event-card .dot { left: -33px; }
}
</style>
