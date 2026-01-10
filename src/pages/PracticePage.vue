<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import langData from '../data/language.json'
import { generateExamPaper } from '../utils/examGenerator'
import { fetchPracticeQuestions, fetchAllQuestionsForExam, fetchModuleInfo } from '../services/questionService'

import ProgressBar from '../practice/ProgressBar.vue'
import QuestionCard from '../practice/QuestionCard.vue'
import OptionsList from '../practice/OptionsList.vue'
import AnswerResult from '../practice/AnswerResult.vue'

/* ====== 路由与模式 ====== */
const route = useRoute()
const router = useRouter()
const categoryId = computed(() => route.query.category)
const examMode = computed(() => route.query.mode === 'mock')

const examType = computed(() => {
  if (route.query.exam) return route.query.exam
  if (categoryId.value) return categoryId.value.startsWith('CR') ? 'CR' : 'CSP'
  return 'CSP'
})

/* ====== 考试状态机 (Exam Phases) ====== */
const phase = ref(examMode.value ? 'notice' : 'practice')

/* ====== 数据状态 (Data State) ====== */
const questions = ref([])
const loading = ref(false)
const moduleInfo = ref(null)
const index = ref(0)
const answers = ref({})
const validatedMap = ref({})
const results = ref({
  score: 0,
  knowledgeCorrect: 0,
  knowledgeTotal: 0,
  situationalCorrect: 0,
  situationalTotal: 0,
  timeUsed: ''
})

const current = computed(() => questions.value[index.value])

/* ====== 语言模式 (Self-contained in Practice) ====== */
const ALL_LANGS = ['fr', ...langData.map(l => l.code)]
const activeLanguages = ref(['fr'])
const LANG_PREF_KEY = 'test_civique_lang_pref'

const currentAvailableLangs = computed(() => {
  if (!current.value) return ['fr']
  const langs = ['fr']
  ALL_LANGS.forEach(lang => {
    if (lang === 'fr') return
    const hasQuestion = current.value.question && current.value.question[lang]
    const hasOptions = current.value.options && current.value.options[lang]
    if (hasQuestion || hasOptions) {
      langs.push(lang)
    }
  })
  return langs
})

watch(currentAvailableLangs, (newAvailable) => {
  activeLanguages.value = activeLanguages.value.filter(lang => 
    lang === 'fr' || newAvailable.includes(lang)
  )
})

function syncActiveLanguages() {
  const filtered = activeLanguages.value.filter(lang => ALL_LANGS.includes(lang))
  activeLanguages.value = filtered.length === 0 ? ['fr'] : filtered
}

watch(phase, (newPhase) => {
  if (examMode.value && (newPhase === 'exam' || newPhase === 'ready')) {
    activeLanguages.value = ['fr']
  }
})

function toggleLanguage(lang) {
  if (phase.value === 'exam') return 
  const idx = activeLanguages.value.indexOf(lang)
  if (idx > -1) {
    if (activeLanguages.value.length > 1) activeLanguages.value.splice(idx, 1)
  } else {
    activeLanguages.value.push(lang)
  }
}

watch(activeLanguages, (newVal) => {
  localStorage.setItem(LANG_PREF_KEY, JSON.stringify(newVal))
}, { deep: true })

/* ====== 计时器逻辑 (Absolute Timestamps) ====== */
const EXAM_DURATION_MINS = 45
const timeLeft = ref(EXAM_DURATION_MINS * 60)
const timerDisplay = computed(() => {
  const mins = Math.floor(timeLeft.value / 60)
  const secs = timeLeft.value % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

let timerInterval = null
const EXAM_START_KEY = 'test_civique_exam_start'

function startTimer() {
  const startTime = localStorage.getItem(EXAM_START_KEY) || Date.now().toString()
  localStorage.setItem(EXAM_START_KEY, startTime)
  
  const updateTimer = () => {
    const elapsedSecs = Math.floor((Date.now() - parseInt(startTime)) / 1000)
    timeLeft.value = Math.max(0, EXAM_DURATION_MINS * 60 - elapsedSecs)
    
    if (timeLeft.value <= 0) {
      clearInterval(timerInterval)
      submitExam()
    }
  }
  
  updateTimer()
  timerInterval = setInterval(updateTimer, 1000)
}

function clearTimer() {
  if (timerInterval) clearInterval(timerInterval)
  localStorage.removeItem(EXAM_START_KEY)
}

/* ====== 数据加载与生成 ====== */
function transformQuestion(q) {
  try {
    const question = {
      fr: q.question_fr,
      cn: q.question_cn,
      en: q.question_en
    }
    
    let rawOptions = q.options
    if (typeof rawOptions === 'string') {
      try {
        rawOptions = JSON.parse(rawOptions)
      } catch (e) {
        rawOptions = []
      }
    }

    if (!Array.isArray(rawOptions) || rawOptions.length === 0) return null

    // Use a deterministic seed based on question ID to keep options stable across refreshes
    // but randomized relative to the database order.
    const seed = String(q.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const indexedOptions = rawOptions.map((opt, idx) => ({ opt, originalIdx: idx }))
    
    // Deterministic shuffle
    const deterministicShuffle = (array, seed) => {
      let m = array.length, t, i;
      while (m) {
        i = Math.floor(Math.abs(Math.sin(seed++)) * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
      }
      return array;
    }

    deterministicShuffle(indexedOptions, seed)

    // Find where the original correct option moved to
    const newCorrectIndex = indexedOptions.findIndex(item => item.originalIdx === q.correct_index)

    const options = {}
    const availableLangs = ['fr', 'cn', 'en']
    
    availableLangs.forEach(lang => {
      options[lang] = indexedOptions.map(item => item.opt[`text_${lang}`] || item.opt[lang])
    })

    return { 
      id: q.id,
      question, 
      options, 
      answer: newCorrectIndex,
      isSituational: q.question_form === 'situation'
    }
  } catch (err) {
    console.error('[PracticePage] transform error for question:', q.id, err)
    return null
  }
}

async function initPractice() {
  if (!categoryId.value) return
  
  loading.value = true
  try {
    const [rawQuestions, info] = await Promise.all([
      fetchPracticeQuestions(categoryId.value),
      fetchModuleInfo(categoryId.value)
    ])
    
    moduleInfo.value = info
    
    if (!rawQuestions || rawQuestions.length === 0) {
      questions.value = []
    } else {
      questions.value = rawQuestions.map(q => transformQuestion(q)).filter(q => q !== null)
    }
    loadProgress()
  } catch (e) {
    console.error('[PracticePage] Failed to load practice questions:', e)
    router.push('/')
  } finally {
    loading.value = false
  }
}

async function initExam() {
  phase.value = 'loading'
  try {
    const allQuestions = await fetchAllQuestionsForExam(examType.value)
    const knowledgePool = allQuestions.filter(q => q.question_form === 'knowledge')
    const situationalPool = allQuestions.filter(q => q.question_form === 'situation')
    
    const rawPaper = generateExamPaper(knowledgePool, situationalPool, examType.value)
    questions.value = rawPaper.map(q => transformQuestion(q))
  } catch (e) {
    console.error('Failed to generate exam:', e)
    router.push('/')
  }
}

function startNewExam() {
  initExam().then(() => {
    index.value = 0
    answers.value = {}
    phase.value = 'exam'
    startTimer()
  })
}

/* ====== 状态持久化 (Practice Only) ====== */
const STORAGE_KEY_PREFIX = 'test_civique_progress_'
const storageKey = computed(() => `${STORAGE_KEY_PREFIX}${categoryId.value || 'all'}`)

function loadProgress() {
  const saved = JSON.parse(localStorage.getItem(storageKey.value) || '{}')
  const savedLangs = JSON.parse(localStorage.getItem(LANG_PREF_KEY) || '[]')
  
  if (savedLangs.length > 0) activeLanguages.value = savedLangs
  syncActiveLanguages()

  if (phase.value === 'practice') {
    answers.value = saved.answers || {}
    validatedMap.value = saved.validatedMap || {}
    const firstUnansweredIndex = questions.value.findIndex(q => !validatedMap.value[q.id])
    if (firstUnansweredIndex === -1 && questions.value.length > 0) {
      // All questions finished, go directly to review mode instead of finished card
      phase.value = 'review'
      index.value = 0
    } else {
      index.value = (firstUnansweredIndex !== -1) ? firstUnansweredIndex : 0
    }
  }
}

function saveProgress() {
  if (phase.value !== 'practice') return 
  localStorage.setItem(storageKey.value, JSON.stringify({
    index: index.value,
    answers: answers.value,
    validatedMap: validatedMap.value
  }))
}

/* ====== 行为控制 ====== */
const selected = computed({
  get: () => {
    const q = questions.value[index.value]
    return q ? (answers.value[q.id] ?? null) : null
  },
  set: (val) => {
    const q = questions.value[index.value]
    if (q) answers.value[q.id] = val
  }
})

const validated = computed({
  get: () => {
    const q = questions.value[index.value]
    return q ? (validatedMap.value[q.id] ?? false) : false
  },
  set: (val) => {
    const q = questions.value[index.value]
    if (q) validatedMap.value[q.id] = val
  }
})

const isCorrect = computed(() => current.value && selected.value === current.value.answer)

function submitExam() {
  const startTime = parseInt(localStorage.getItem(EXAM_START_KEY)) || Date.now()
  clearTimer()
  
  let score = 0
  let kCorrect = 0, kTotal = 0, sCorrect = 0, sTotal = 0
  
  questions.value.forEach(q => {
    const userAns = answers.value[q.id]
    const correct = userAns === q.answer
    if (q.isSituational) {
      sTotal++; if (correct) { sCorrect++; score++ }
    } else {
      kTotal++; if (correct) { kCorrect++; score++ }
    }
  })
  
  const used = Math.floor((Date.now() - startTime) / 1000)
  results.value = {
    score, knowledgeCorrect: kCorrect, knowledgeTotal: kTotal,
    situationalCorrect: sCorrect, situationalTotal: sTotal,
    timeUsed: `${Math.floor(used / 60)}m ${used % 60}s`
  }
  phase.value = 'result'
}

function validatePractice() {
  validated.value = true
  saveProgress()
}

function next() {
  if (index.value < questions.value.length - 1) {
    index.value++
    saveProgress()
  } else if (phase.value === 'practice') {
    phase.value = 'practice_finished'
  }
}

function restartPractice() {
  // Clear progress for this category
  localStorage.removeItem(storageKey.value)
  answers.value = {}
  validatedMap.value = {}
  index.value = 0
  phase.value = 'practice'
}

function selectOption(i) {
  if (phase.value === 'practice' && validated.value) return
  selected.value = i
}

const langLabels = computed(() => {
  const labels = { fr: 'FR' }
  langData.forEach(lang => { labels[lang.code] = lang.name })
  return labels
})

onMounted(async () => {
  if (examMode.value) {
    if (localStorage.getItem(EXAM_START_KEY)) {
      await initExam()
      phase.value = 'exam'
      startTimer()
    }
  } else {
    await initPractice()
  }
})

watch(categoryId, async (newId) => {
  if (!examMode.value && newId) {
    await initPractice()
  }
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<template>
  <main class="container">
    <div class="header-nav">
      <router-link :to="{ path: '/', query: { exam: examType } }" class="back-link" @click="clearTimer">← Retour</router-link>
      <div v-if="phase === 'exam'" class="timer" :class="{ warning: timeLeft < 300 }">
        ⏱ {{ timerDisplay }}
      </div>
      <div v-if="examMode && phase !== 'practice'" class="exam-badge">Simulation {{ examType }}</div>
    </div>

    <!-- Phase: Notice -->
    <div v-if="phase === 'notice'" class="card-view">
      <h2>Consignes de l'examen</h2>
      <div class="rules">
        <ul>
          <li><strong>Nombre de questions :</strong> 40</li>
          <li><strong>Durée :</strong> 45 minutes maximum</li>
          <li><strong>Seuil de réussite :</strong> 32 bonnes réponses (80%)</li>
          <li><strong>Format :</strong> QCM (1 seule bonne réponse par question)</li>
          <li><strong>Contenu :</strong> 28 questions de connaissances + 12 mises en situation</li>
          <li><strong>Langue :</strong> L'examen se déroule exclusivement en Français</li>
        </ul>
        <p class="disclaimer">Note : Cette simulation est destinée à l'entraînement et ne garantit pas le résultat officiel.</p>
      </div>
      <button class="btn-primary" style="width: 100%;margin-top: 20px;" @click="startNewExam">J'ai compris, lancer la simulation</button>
    </div>

    <!-- Phase: Loading -->
    <div v-else-if="phase === 'loading'" class="loading-view">
      <div class="spinner"></div>
      <p>Génération de votre sujet d'examen personnalisé...</p>
    </div>

    <!-- Phase: Exam or Practice or Review -->
    <div v-else-if="loading" class="loading-view">
      <div class="spinner"></div>
      <p>Chargement des questions...</p>
    </div>

    <div v-else-if="['exam', 'practice', 'review'].includes(phase) && current">
      <div class="quiz-header">
        <h2 v-if="phase === 'exam'">Question {{ index + 1 }} / 40</h2>
        <h2 v-else-if="phase === 'review'">Révision : {{ moduleInfo?.title_fr || 'Thématique' }}</h2>
        <h2 v-else>{{ moduleInfo?.title_fr || 'Entraînement' }}</h2>
        
        <div v-if="['exam', 'review'].includes(phase)" class="exam-progress-dots">
          <span 
            v-for="(_, i) in questions" 
            :key="i" 
            :class="{ 
              active: i === index, 
              answered: phase === 'exam' && answers[questions[i].id] !== undefined,
              correct: phase === 'review' && answers[questions[i].id] === questions[i].answer,
              wrong: phase === 'review' && answers[questions[i].id] !== undefined && answers[questions[i].id] !== questions[i].answer,
              skipped: phase === 'review' && answers[questions[i].id] === undefined
            }"
            @click="index = i"
          ></span>
        </div>
      </div>

      <ProgressBar
        v-if="phase !== 'exam' && phase !== 'review'"
        :current="index + (validated ? 1 : 0)"
        :total="questions.length"
      />
  
      <div class="lang-switch" v-if="phase !== 'exam' && currentAvailableLangs.length > 1">
        <button 
          v-for="lang in currentAvailableLangs" 
          :key="lang"
          :class="{ active: activeLanguages.includes(lang) }"
          @click="toggleLanguage(lang)"
        >
          {{ langLabels[lang] || lang.toUpperCase() }}
        </button>
      </div>
  
      <QuestionCard :question="current.question" :activeLanguages="activeLanguages" />
  
      <OptionsList
        :options="current.options"
        :activeLanguages="activeLanguages"
        :selected="selected"
        :validated="phase === 'review' || (phase === 'practice' && validated)"
        :correctIndex="current.answer"
        @select="selectOption"
      />
  
      <div class="quiz-actions">
        <template v-if="phase === 'exam'">
          <div class="nav-btns">
            <button class="btn-nav" :disabled="index === 0" @click="index--">Précédent</button>
            <button v-if="index < questions.length - 1" class="btn-nav primary" @click="index++">Suivant</button>
            <button v-else class="btn-submit" @click="submitExam">Terminer l'examen</button>
          </div>
        </template>

        <template v-else-if="phase === 'review'">
          <div class="nav-btns">
            <button class="btn-nav" :disabled="index === 0" @click="index--">Précédent</button>
            <button v-if="index < questions.length - 1" class="btn-nav primary" @click="index++">Suivant</button>
            <button v-else-if="examMode" class="btn-nav" @click="phase = 'result'">Retour aux résultats</button>
            <button v-else class="btn-nav primary" @click="phase = 'practice_finished'">Terminer la révision</button>
          </div>
        </template>

        <template v-else>
          <AnswerResult
            :validated="validated"
            :isCorrect="isCorrect"
            :canValidate="selected !== null"
            @validate="validatePractice"
            @next="next"
          />
        </template>
      </div>
    </div>

    <!-- Phase: Practice Finished -->
    <div v-else-if="phase === 'practice_finished'" class="result-view fade-in">
      <div class="result-card practice-end-card">
        <div class="celebration-icon">🏆</div>
        
        <div class="result-header">
          <span class="status-badge practice-badge">THÉMATIQUE TERMINÉE</span>
          <h3>Félicitations !</h3>
          <p class="practice-end-desc">
            Vous avez terminé l'ensemble des questions pour :<br>
            <strong>{{ moduleInfo?.title_fr || categoryId }}</strong>
          </p>
        </div>

        <div class="practice-stats">
          <div class="stat-item">
            <span class="stat-num">{{ questions.length }}</span>
            <span class="stat-label">Questions traitées</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">100%</span>
            <span class="stat-label">Progression</span>
          </div>
        </div>

        <div class="result-actions vertical">
          <button class="btn-restart" @click="restartPractice">
            <span class="btn-icon">🔄</span>
            <div class="btn-text">
              <span class="btn-title">Recommencer</span>
              <span class="btn-subtitle">Reprendre cette série à zéro</span>
            </div>
          </button>
          
          <button class="btn-switch" @click="router.push({ path: '/', query: { exam: examType } })">
            <span class="btn-icon">📚</span>
            <div class="btn-text">
              <span class="btn-title">Changer de thème</span>
              <span class="btn-subtitle">Explorer d'autres catégories</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Phase: Result -->
    <div v-else-if="phase === 'result'" class="result-view">
      <div class="result-card" :class="results.score >= 32 ? 'pass' : 'fail'">
        <div class="result-header">
          <div class="status-icon">{{ results.score >= 32 ? '🎉' : '⏳' }}</div>
          <span class="status-badge">{{ results.score >= 32 ? 'ADMIS' : 'ÉCHEC' }}</span>
          <h3>{{ results.score >= 32 ? 'Félicitations !' : 'Continuez vos efforts' }}</h3>
        </div>
        
        <div class="score-section">
          <div class="score-circle-container">
            <svg class="score-ring" viewBox="0 0 100 100">
              <circle class="ring-bg" cx="50" cy="50" r="45" fill="none" />
              <circle class="ring-fill" cx="50" cy="50" r="45" fill="none"
                :style="{ strokeDasharray: `${(results.score / 40) * 282.7} 282.7` }" />
            </svg>
            <div class="score-content">
              <span class="score-num">{{ results.score }}</span>
              <span class="score-total">/ 40</span>
            </div>
          </div>
        </div>

        <div class="stats-container">
          <div class="stat-card">
            <div class="stat-label">📚 Connaissances</div>
            <div class="stat-value">{{ results.knowledgeCorrect }} / {{ results.knowledgeTotal }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">🤝 Situations</div>
            <div class="stat-value">{{ results.situationalCorrect }} / {{ results.situationalTotal }}</div>
          </div>
        </div>

        <div class="result-actions vertical">
          <button class="btn-restart" @click="phase = 'review'; index = 0">
            <span class="btn-icon">👁️</span>
            <div class="btn-text">
              <span class="btn-title">Revoir mes réponses</span>
              <span class="btn-subtitle">Vérifier chaque question</span>
            </div>
          </button>
          
          <button class="btn-switch" @click="router.push({ path: '/', query: { exam: examType } })">
            <span class="btn-icon">🏠</span>
            <div class="btn-text">
              <span class="btn-title">Retour à l'accueil</span>
              <span class="btn-subtitle">Quitter le mode examen</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <div v-else class="loading-view">
      <div class="spinner"></div>
      <p>Chargement...</p>
    </div>
  </main>
</template>

<style scoped>
.container {
  padding: var(--space-lg);
  max-width: 600px;
  margin: 0 auto;
}

.header-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.back-link {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-weight: 500;
}

.timer {
  font-family: monospace;
  font-size: 1.2rem;
  font-weight: bold;
  background: #eee;
  padding: 4px 12px;
  border-radius: 6px;
}

.timer.warning {
  color: white;
  background: var(--color-danger);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

.exam-badge {
  background: var(--color-primary);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
}

.card-view {
  background: white;
  padding: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.loading-view {
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

.exam-progress-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 16px;
  justify-content: center;
  padding: 8px;
  background: #f8fafc;
  border-radius: 12px;
}

.exam-progress-dots span {
  width: 10px;
  height: 10px;
  background: #e2e8f0;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.exam-progress-dots span:hover {
  transform: scale(1.2);
  background: #cbd5e1;
}

.exam-progress-dots span.answered { 
  background: #94a3b8;
}

.exam-progress-dots span.active { 
  background: var(--color-primary) !important;
  transform: scale(1.4);
  box-shadow: 0 0 0 3px rgba(79, 124, 255, 0.2);
  z-index: 1;
}

.exam-progress-dots span.correct { 
  background: #22c55e !important; /* Softer Green */
}

.exam-progress-dots span.wrong { 
  background: #ef4444 !important; /* Softer Red */
}

.exam-progress-dots span.skipped { 
  background: #cbd5e1 !important;
  opacity: 0.6;
}

.nav-btns {
  display: flex;
  gap: 12px;
  margin-top: 32px;
}

.btn-nav {
  flex: 1;
  padding: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: white;
  cursor: pointer;
}

.btn-nav.primary {
  background: var(--color-primary);
  color: white;
}

.btn-submit {
  flex: 1;
  background: var(--color-success);
  color: white;
  border: none;
  padding: 12px;
  border-radius: var(--radius-sm);
  font-weight: 700;
  cursor: pointer;
}

.lang-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  justify-content: center;
}

.lang-switch button {
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  background: white;
  cursor: pointer;
}

.lang-switch button.active {
  background: var(--color-primary);
  color: white;
}

.result-card {
  background: white;
  padding: 40px;
  border-radius: 24px;
  text-align: center;
  border-top: 8px solid var(--color-danger);
}

.result-card.pass {
  border-top: 8px solid var(--color-success);
}

.practice-end-card {
  border-top: 8px solid #ffd700 !important; /* Gold for trophy */
}

.celebration-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
  40% {transform: translateY(-20px);}
  60% {transform: translateY(-10px);}
}

.practice-badge {
  background: #fff9db !important;
  color: #f08c00 !important;
  border: 1px solid #ffe066;
}

.practice-end-desc {
  color: var(--color-text-secondary);
  margin-top: 12px;
  font-size: 1.05rem;
  line-height: 1.6;
}

.practice-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin: 32px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--color-primary);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.result-actions.vertical {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
}

.btn-restart, .btn-switch {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 16px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  width: 100%;
}

.btn-restart {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 4px 12px rgba(79, 124, 255, 0.2);
}

.btn-restart:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(79, 124, 255, 0.3);
  filter: brightness(1.05);
}

.btn-switch {
  background: white;
  color: var(--color-text-main);
  border: 2px solid var(--color-border);
}

.btn-switch:hover {
  background: #f8f9fa;
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-2px);
}

.btn-icon {
  font-size: 1.5rem;
  background: rgba(255, 255, 255, 0.2);
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.btn-switch .btn-icon {
  background: #f0f2f5;
}

.btn-text {
  display: flex;
  flex-direction: column;
}

.btn-title {
  font-size: 1.05rem;
  font-weight: 700;
}

.btn-subtitle {
  font-size: 0.8rem;
  opacity: 0.8;
}

.btn-switch .btn-subtitle {
  color: var(--color-text-secondary);
}

.result-card.pass {
  border-top: 8px solid var(--color-success);
}

.result-card.fail {
  border-top: 8px solid var(--color-danger);
}

.score-circle-container {
  position: relative;
  width: 180px;
  height: 180px;
  margin: 0 auto 32px;
}

.score-ring {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.ring-bg {
  stroke: #f1f5f9;
  stroke-width: 8;
}

.ring-fill {
  stroke: var(--color-success);
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dasharray 1s ease;
}

.result-card.fail .ring-fill {
  stroke: var(--color-danger);
}

.score-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-num {
  font-size: 3.5rem;
  font-weight: 900;
  line-height: 1;
  color: var(--color-text-main);
  margin: 0;
}

.score-total {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.stat-card {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 16px;
  margin-bottom: 12px;
}
</style>
