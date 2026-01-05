<script setup>
import { ref, computed, inject, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
  import rawQuestions from '../data/questions.json'
import situationalQuestions from '../data/questions_situation.json'
import langData from '../data/language.json'
import { generateExamPaper } from '../utils/examGenerator'
  
  import ProgressBar from '../practice/ProgressBar.vue'
  import QuestionCard from '../practice/QuestionCard.vue'
  import OptionsList from '../practice/OptionsList.vue'
  import AnswerResult from '../practice/AnswerResult.vue'
  
/* ====== 路由与模式 ====== */
const route = useRoute()
const router = useRouter()
const categoryId = computed(() => route.query.category)
const examMode = computed(() => route.query.mode === 'mock')

// 统一获取当前考试类型 (CSP 或 CR)
const examType = computed(() => {
  if (route.query.exam) return route.query.exam
  if (categoryId.value) return categoryId.value.startsWith('CR') ? 'CR' : 'CSP'
  return 'CSP'
})

/* ====== 考试状态机 (Exam Phases) ====== */
// Phases: 'practice' (default), 'notice', 'loading', 'ready', 'exam', 'result', 'review'
const phase = ref(examMode.value ? 'notice' : 'practice')

/* ====== 语言模式 (Last Version Logic) ====== */
const globalLanguages = inject('globalLanguages')
const activeLanguages = ref(['fr'])
const LANG_PREF_KEY = 'test_civique_lang_pref'

function syncActiveLanguages(pool) {
  const filtered = activeLanguages.value.filter(lang => pool.includes(lang))
  activeLanguages.value = filtered.length === 0 && pool.length > 0 ? [pool[0]] : filtered
}

// 模拟考试强制法语模式
watch(phase, (newPhase) => {
  if (examMode.value && (newPhase === 'exam' || newPhase === 'ready')) {
    activeLanguages.value = ['fr']
  }
})

// 语言切换行为
function toggleLanguage(lang) {
  if (phase.value === 'exam') return // 考试中禁止切换语言
  const idx = activeLanguages.value.indexOf(lang)
  if (idx > -1) {
    if (activeLanguages.value.length > 1) activeLanguages.value.splice(idx, 1)
  } else {
    activeLanguages.value.push(lang)
  }
}

// 持久化语言偏好
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
  clearInterval(timerInterval)
  localStorage.removeItem(EXAM_START_KEY)
}

/* ====== 数据加载与生成 ====== */
const questions = ref([])
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

function transformQuestion(q) {
  const question = {}
  const options = {}
  Object.keys(q).forEach(key => {
    if (key.startsWith('question_')) question[key.replace('question_', '')] = q[key]
  })
  if (q.options && q.options.length > 0) {
    const langs = Object.keys(q.options[0]).filter(k => k.startsWith('text_')).map(k => k.replace('text_', ''))
    langs.forEach(lang => {
      options[lang] = q.options.map(o => o[`text_${lang}`])
    })
  }
  return { 
      id: q._id,
    question, 
    options, 
      answer: q.correct_index,
    isSituational: !!q.is_situational || q._id.includes('SIT') 
  }
}

function initPractice() {
  if (!Array.isArray(rawQuestions)) {
    console.error('Questions data is not an array')
    return
  }
  const pool = categoryId.value ? rawQuestions.filter(q => q.category_id === categoryId.value) : rawQuestions
  questions.value = pool.map(q => transformQuestion(q))
  
  if (questions.value.length === 0) {
    console.warn(`No questions found for category: ${categoryId.value}`)
  }
  
  loadProgress()
}

async function initExam() {
  phase.value = 'loading'
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const rawPaper = generateExamPaper(rawQuestions, situationalQuestions, examType.value)
        questions.value = rawPaper.map(q => transformQuestion(q))
        resolve()
      } catch (e) {
        console.error(e)
        router.push('/')
      }
    }, 1000)
  })
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
  
  activeLanguages.value = savedLangs.length > 0 ? savedLangs : [...globalLanguages.value]
  syncActiveLanguages(globalLanguages.value)

  if (phase.value === 'practice') {
    answers.value = saved.answers || {}
    validatedMap.value = saved.validatedMap || {}
    const firstUnansweredIndex = questions.value.findIndex(q => !validatedMap.value[q.id])
    index.value = (firstUnansweredIndex !== -1) ? firstUnansweredIndex : 0
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
const current = computed(() => questions.value[index.value])
const isCorrect = computed(() => current.value && selected.value === current.value.answer)

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

function startExam() {
  phase.value = 'exam'
  index.value = 0
  answers.value = {}
  startTimer()
}

function submitExam() {
  const startTime = parseInt(localStorage.getItem(EXAM_START_KEY)) || Date.now()
  clearTimer()
  
  let score = 0
  let kCorrect = 0, kTotal = 0, sCorrect = 0, sTotal = 0
  
  questions.value.forEach(q => {
    const userAns = answers.value[q.id]
    const correct = userAns === q.answer
    
    if (q.isSituational) {
      sTotal++
      if (correct) { sCorrect++; score++ }
    } else {
      kTotal++
      if (correct) { kCorrect++; score++ }
    }
  })
  
  const used = Math.floor((Date.now() - startTime) / 1000)
  const mins = Math.floor(used / 60)
  const secs = used % 60

  results.value = {
    score,
    knowledgeCorrect: kCorrect,
    knowledgeTotal: kTotal,
    situationalCorrect: sCorrect,
    situationalTotal: sTotal,
    timeUsed: `${mins}m ${secs}s`
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
    index.value = 0
  }
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
    initPractice()
  }
})

watch(categoryId, () => {
  if (!examMode.value) {
    initPractice()
  }
})

onUnmounted(() => {
  clearInterval(timerInterval)
})
  </script>
  
  <template>
  <main class="container">
    <!-- Header -->
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
    <div v-else-if="['exam', 'practice', 'review'].includes(phase) && current">
      <div class="quiz-header">
        <h2 v-if="phase === 'exam'">Question {{ index + 1 }} / 40</h2>
        <h2 v-else-if="phase === 'review'">Correction : Question {{ index + 1 }} / 40</h2>
        <h2 v-else>Entraînement</h2>
        
        <div v-if="['exam', 'review'].includes(phase)" class="exam-progress-dots">
          <span 
            v-for="(_, i) in questions" 
            :key="i" 
            :class="{ 
              active: i === index, 
              answered: phase === 'exam' && answers[questions[i].id] !== undefined,
              correct: phase === 'review' && answers[questions[i].id] === questions[i].answer,
              wrong: phase === 'review' && (answers[questions[i].id] === undefined || answers[questions[i].id] !== questions[i].answer)
            }"
            @click="index = i"
          ></span>
        </div>
      </div>

      <ProgressBar
        v-if="phase !== 'exam' && phase !== 'review'"
        :current="index + (validated || phase === 'review' ? 1 : 0)"
        :total="questions.length"
      />
  
      <!-- Language Toggle (Hidden during Exam) -->
      <div class="lang-switch" v-if="phase !== 'exam' && globalLanguages.length > 1">
        <button 
          v-for="lang in globalLanguages" 
          :key="lang"
          :class="{ active: activeLanguages.includes(lang) }"
          @click="toggleLanguage(lang)"
        >
          {{ langLabels[lang] || lang.toUpperCase() }}
        </button>
      </div>
  
      <QuestionCard
        :question="current.question"
        :activeLanguages="activeLanguages"
      />
  
      <OptionsList
        :options="current.options"
        :activeLanguages="activeLanguages"
        :selected="selected"
        :validated="phase === 'review' || (phase === 'practice' && validated)"
        :correctIndex="current.answer"
        @select="selectOption"
      />
  
      <!-- Actions -->
      <div class="quiz-actions">
        <!-- Exam Mode Actions -->
        <template v-if="phase === 'exam'">
          <div class="nav-btns">
            <button class="btn-nav" :disabled="index === 0" @click="index--">Précédent</button>
            <button v-if="index < questions.length - 1" class="btn-nav primary" @click="index++">Suivant</button>
            <button v-else class="btn-submit" @click="submitExam">Terminer l'examen</button>
          </div>
        </template>

        <!-- Review Mode Actions -->
        <template v-else-if="phase === 'review'">
          <div class="nav-btns">
            <button class="btn-nav" :disabled="index === 0" @click="index--">Précédent</button>
            <button v-if="index < questions.length - 1" class="btn-nav primary" @click="index++">Suivant</button>
            <button v-else class="btn-nav" @click="phase = 'result'">Retour aux résultats</button>
          </div>
        </template>

        <!-- Practice Mode Actions -->
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

    <!-- Phase: Result -->
    <div v-else-if="phase === 'result'" class="result-view">
      <div class="result-card" :class="{ pass: results.score >= 32 }">
        <div class="result-header">
          <div class="status-icon">{{ results.score >= 32 ? '🎉' : '⏳' }}</div>
          <span class="status-badge">{{ results.score >= 32 ? 'ADMIS' : 'ÉCHEC' }}</span>
          <h3>{{ results.score >= 32 ? 'Félicitations !' : 'Continuez vos efforts' }}</h3>
          <p class="result-subtitle">
            {{ results.score >= 32 ? 'Vous avez réussi la simulation avec succès.' : 'Il vous manque quelques points pour atteindre le seuil de 32/40.' }}
          </p>
        </div>
        
        <div class="score-section">
          <div class="score-circle-container">
            <svg class="score-ring" viewBox="0 0 100 100">
              <circle class="ring-bg" cx="50" cy="50" r="45" />
              <circle class="ring-fill" cx="50" cy="50" r="45" 
                :style="{ strokeDasharray: `${(results.score / 40) * 283} 283` }" />
            </svg>
            <div class="score-content">
              <span class="score-num">{{ results.score }}</span>
              <span class="score-total">/ 40</span>
            </div>
          </div>
          <div class="score-percentage">{{ Math.round((results.score/40)*100) }}% de réussite</div>
        </div>

        <div class="stats-container">
          <div class="stat-card">
            <div class="stat-label">📚 Connaissances</div>
            <div class="stat-value">{{ results.knowledgeCorrect }} / {{ results.knowledgeTotal }}</div>
            <div class="stat-bar"><div class="stat-fill" :style="{ width: (results.knowledgeCorrect/results.knowledgeTotal*100) + '%' }"></div></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">🤝 Situations</div>
            <div class="stat-value">{{ results.situationalCorrect }} / {{ results.situationalTotal }}</div>
            <div class="stat-bar"><div class="stat-fill" :style="{ width: (results.situationalCorrect/results.situationalTotal*100) + '%' }"></div></div>
          </div>
          <div class="stat-card full-width">
            <div class="stat-label">⏱ Temps utilisé</div>
            <div class="stat-value">{{ results.timeUsed }}</div>
          </div>
        </div>

        <div class="result-summary-dots">
          <label>Plan de l'examen</label>
          <div class="exam-progress-dots grid-dots">
            <span 
              v-for="(_, i) in questions" 
              :key="i" 
              :class="{ 
                correct: answers[questions[i].id] === questions[i].answer,
                wrong: answers[questions[i].id] === undefined || answers[questions[i].id] !== questions[i].answer
              }"
              @click="phase = 'review'; index = i"
              :title="'Question ' + (i+1)"
            ></span>
          </div>
        </div>

        <div class="result-actions">
          <button class="btn-primary main-action" @click="phase = 'review'; index = 0">
            🔎 Revoir mes réponses
          </button>
          <button class="btn-secondary" @click="router.push({ path: '/', query: { exam: examType } })">
            🏠 Retour aux thématiques
          </button>
        </div>
      </div>
    </div>

    <!-- Loading Fallback -->
    <div v-else class="loading-view">
      <template v-if="questions.length === 0 && phase === 'practice'">
        <p>Aucune question trouvée pour cette catégorie.</p>
        <router-link to="/" class="btn-primary" style="display: inline-block; margin-top: 20px;">Retour à l'accueil</router-link>
      </template>
      <template v-else>
        <div class="spinner"></div>
        <p>Chargement des questions...</p>
      </template>
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
  color: var(--color-text-main);
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

/* Card View (Notice, Ready) */
.card-view {
  background: white;
  padding: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.rules ul {
  margin: 24px 0;
  padding-left: 20px;
}

.rules li {
  margin-bottom: 12px;
  color: var(--color-text-secondary);
}

.disclaimer {
  font-size: 0.85rem;
  font-style: italic;
  color: var(--color-text-secondary);
    margin-top: 24px;
  }
  
/* Loading */
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

/* Ready */
.ready-view {
  text-align: center;
}

.check-icon {
  font-size: 3rem;
  color: var(--color-success);
    margin-bottom: 16px;
  }
  
.btn-start {
  margin-top: 24px;
  font-size: 1.1rem;
  padding: 14px 40px;
}

/* Quiz UI */
.quiz-header {
  margin-bottom: 16px;
}

.exam-progress-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
    margin-top: 12px;
}

.exam-progress-dots span {
  width: 8px;
  height: 8px;
  background: #eee;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.exam-progress-dots span:hover {
  transform: scale(1.3);
  background: #ddd;
}

.exam-progress-dots span.answered { background: #ccc; }

.exam-progress-dots span.active { 
  background: var(--color-primary) !important;
  transform: scale(1.5);
  box-shadow: 0 4px 12px rgba(79, 124, 255, 0.4);
  z-index: 2;
}
.exam-progress-dots span.correct { background: var(--color-success) !important; }
.exam-progress-dots span.wrong { background: var(--color-danger) !important; }

.exam-progress-dots span:hover:not(.active) {
  background: #d0dbff;
  transform: scale(1.3);
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
    font-weight: 600;
  }
  
.btn-nav.primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-submit {
  flex: 1;
  background: var(--color-success);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 700;
  cursor: pointer;
}

/* Results */
.result-view {
  padding: 10px 0 40px;
}

.result-card {
  background: white;
  padding: 40px 32px;
  border-radius: 24px;
  text-align: center;
  border: 1px solid var(--color-border);
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
  position: relative;
  overflow: hidden;
}

.result-card.pass {
  border-top: 8px solid var(--color-success);
}

.result-card:not(.pass) {
  border-top: 8px solid var(--color-danger);
}

.result-header {
  margin-bottom: 32px;
}

.status-icon {
  font-size: 3.5rem;
  margin-bottom: 12px;
}

.status-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 30px;
  font-weight: 800;
  font-size: 0.9rem;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

.pass .status-badge {
  background: #e6f6ea;
  color: var(--color-success);
}

.result-card:not(.pass) .status-badge {
  background: #fdecea;
  color: var(--color-danger);
}

.result-card h3 {
  font-size: 1.8rem;
  margin-bottom: 8px;
  color: var(--color-text-main);
}

.result-subtitle {
  color: var(--color-text-secondary);
  font-size: 1rem;
  max-width: 300px;
  margin: 0 auto;
}

.score-section {
  margin-bottom: 40px;
}

.score-circle-container {
  position: relative;
  width: 160px;
  height: 160px;
  margin: 0 auto 16px;
}

.score-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: #f0f0f0;
  stroke-width: 8;
}

.ring-fill {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dasharray 1s ease-out;
}

.pass .ring-fill {
  stroke: var(--color-success);
}

.result-card:not(.pass) .ring-fill {
  stroke: var(--color-danger);
}

.score-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
}

.score-num {
  font-size: 3rem;
  font-weight: 900;
  line-height: 1;
}

.score-total {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.score-percentage {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-main);
}

.stats-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 40px;
}

.stat-card {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 16px;
  text-align: left;
}

.stat-card.full-width {
  grid-column: span 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.full-width .stat-label {
  margin-bottom: 0;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--color-text-main);
  margin-bottom: 8px;
}

.full-width .stat-value {
  margin-bottom: 0;
}

.stat-bar {
  height: 6px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  border-radius: 3px;
}

.pass .stat-fill { background: var(--color-success); }
.result-card:not(.pass) .stat-fill { background: var(--color-danger); }

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main-action {
  font-size: 1.1rem;
  padding: 16px !important;
  border-radius: 16px !important;
  box-shadow: 0 4px 15px rgba(79, 124, 255, 0.3);
}

.btn-secondary {
  background: white;
  border: 1px solid var(--color-border);
  padding: 14px;
  border-radius: 16px;
  color: var(--color-text-secondary);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f8f9fa;
  border-color: #ddd;
  color: var(--color-text-main);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 14px;
  border-radius: var(--radius-sm);
  font-weight: 700;
  cursor: pointer;
}

.btn-secondary {
  background: none;
  border: 1px solid var(--color-border);
  padding: 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.lang-switch {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  justify-content: center;
}

.lang-switch button {
  padding: 6px 16px;
  font-size: 0.85rem;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  background: white;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.lang-switch button.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.lang-switch button:hover:not(.active) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.result-summary-dots {
  margin-bottom: 32px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 16px;
}

.result-summary-dots label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 700;
  text-transform: uppercase;
  display: block;
  margin-bottom: 12px;
}

.grid-dots {
  justify-content: center;
  gap: 6px !important;
}

.quiz-actions {
  margin-top: 32px;
  }
  </style>
    