<script setup>
import { ref, computed, inject, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import rawQuestions from '../data/questions.json'
import langData from '../data/language.json'

import ProgressBar from '../practice/ProgressBar.vue'
import QuestionCard from '../practice/QuestionCard.vue'
import OptionsList from '../practice/OptionsList.vue'
import AnswerResult from '../practice/AnswerResult.vue'

/* ====== 路由与模式 ====== */
const route = useRoute()
const categoryId = computed(() => route.query.category)
const examMode = computed(() => route.query.mode === 'mock')
const examType = computed(() => route.query.exam)

/* ====== 语言模式 (Last Version Logic) ====== */
const globalLanguages = inject('globalLanguages')
const activeLanguages = ref(['fr'])

const LANG_PREF_KEY = 'test_civique_lang_pref'

function syncActiveLanguages(pool) {
  const filtered = activeLanguages.value.filter(lang => pool.includes(lang))
  activeLanguages.value = filtered.length === 0 && pool.length > 0 ? [pool[0]] : filtered
}

// 监听全局池变化
watch(globalLanguages, (newPool) => {
  syncActiveLanguages(newPool)
}, { deep: true })

// 语言切换行为
function toggleLanguage(lang) {
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

/* ====== 数据适配与随机化 ====== */
function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5)
}

function adaptQuestions(raw, category, isMock, type) {
  let pool = raw
  
  if (isMock) {
    pool = raw.filter(q => q.exam_type === type)
    pool = shuffleArray(pool).slice(0, 40)
  } else if (category) {
    pool = raw.filter(q => q.category_id === category)
  }

  return pool.map(q => {
    const question = {}
    const options = {}
    Object.keys(q).forEach(key => {
      if (key.startsWith('question_')) {
        question[key.replace('question_', '')] = q[key]
      }
    })
    if (q.options && q.options.length > 0) {
      Object.keys(q.options[0]).forEach(k => {
        if (k.startsWith('text_')) {
          const lang = k.replace('text_', '')
          options[lang] = q.options.map(o => o[k])
        }
      })
    }
    return { id: q._id, question, options, answer: q.correct_index }
  })
}

const questions = ref([])
const index = ref(0)
const answers = ref({})
const validatedMap = ref({})
const examFinished = ref(false)

/* ====== 状态与持久化 ====== */
const STORAGE_KEY_PREFIX = 'test_civique_progress_'
const storageKey = computed(() => {
  if (examMode.value) return `${STORAGE_KEY_PREFIX}mock_${examType.value}`
  return `${STORAGE_KEY_PREFIX}${categoryId.value || 'all'}`
})

function loadProgress() {
  const saved = JSON.parse(localStorage.getItem(storageKey.value) || '{}')
  
  // 加载语言偏好
  const savedLangs = JSON.parse(localStorage.getItem(LANG_PREF_KEY) || '[]')
  if (savedLangs.length > 0) {
    activeLanguages.value = savedLangs
  } else {
    activeLanguages.value = [...globalLanguages.value]
  }
  syncActiveLanguages(globalLanguages.value)

  // 模拟考试模式下不恢复答题进度
  if (!examMode.value) {
    index.value = saved.index || 0
    answers.value = saved.answers || {}
    validatedMap.value = saved.validatedMap || {}
  }
}

onMounted(() => {
  questions.value = adaptQuestions(rawQuestions, categoryId.value, examMode.value, examType.value)
  loadProgress()
})

watch(categoryId, () => {
  questions.value = adaptQuestions(rawQuestions, categoryId.value, examMode.value, examType.value)
  loadProgress()
})

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

function saveProgress() {
  if (examMode.value) return 
  localStorage.setItem(storageKey.value, JSON.stringify({
    index: index.value,
    answers: answers.value,
    validatedMap: validatedMap.value
  }))
}

const current = computed(() => questions.value[index.value])
const isCorrect = computed(() => current.value && selected.value === current.value.answer)

const score = computed(() => {
  return Object.keys(validatedMap.value).filter(id => {
    const q = questions.value.find(quest => quest.id === id)
    return q && answers.value[id] === q.answer
  }).length
})

/* ====== 行为 ====== */
const langLabels = computed(() => {
  const labels = { fr: 'FR' }
  langData.forEach(lang => { labels[lang.code] = lang.name })
  return labels
})

function selectOption(i) {
  if (validated.value) return
  selected.value = i
}

function validate() {
  validated.value = true
  saveProgress()
}

function next() {
  if (index.value < questions.value.length - 1) {
    index.value++
    saveProgress()
  } else if (examMode.value) {
    examFinished.value = true
  } else {
    index.value = 0
  }
}
</script>

<template>
  <main class="container">
    <div class="header-nav">
      <router-link to="/" class="back-link">← Retour</router-link>
      <div v-if="examMode" class="exam-badge">Simulation {{ examType }}</div>
    </div>

    <!-- 考试结果 -->
    <div v-if="examFinished" class="result-view">
      <div class="result-card" :class="{ pass: score >= 32 }">
        <h3>{{ score >= 32 ? 'Félicitations !' : 'Continuez vos efforts' }}</h3>
        <div class="score-circle">
          <span class="score-num">{{ score }}</span>
          <span class="score-total">/ 40</span>
        </div>
        <p v-if="score >= 32">Vous avez réussi la simulation (seuil 32/40).</p>
        <p v-else>Il vous manque {{ 32 - score }} points pour réussir (seuil 32/40).</p>
        <button class="btn-back" style="width: 100%" @click="$router.push('/')">Retour à l'accueil</button>
      </div>
    </div>

    <!-- 答题界面 -->
    <div v-else-if="current">
      <h2 v-if="!examMode">Entraînement</h2>
      <h2 v-else>Question {{ index + 1 }} / 40</h2>

      <ProgressBar
        :current="index + (validated ? 1 : 0)"
        :total="questions.length"
      />

      <div class="lang-switch" v-if="globalLanguages.length > 1">
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
        :validated="validated"
        :correctIndex="current.answer"
        @select="selectOption"
      />

      <AnswerResult
        :validated="validated"
        :isCorrect="isCorrect"
        :canValidate="selected !== null"
        @validate="validate"
        @next="next"
      />
    </div>

    <div v-else class="loading">
      Chargement des questions...
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

.exam-badge {
  background: var(--color-primary);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
}

h2 {
  text-align: center;
  margin-bottom: var(--space-lg);
  color: var(--color-text-main);
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

.result-view {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.result-card {
  background: white;
  padding: 40px;
  border-radius: var(--radius-md);
  text-align: center;
  border: 2px solid #eee;
  max-width: 400px;
  width: 100%;
}

.result-card.pass { border-color: var(--color-success); }

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 8px solid #eee;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 24px auto;
}

.pass .score-circle { border-color: var(--color-success); }

.score-num { font-size: 2.5rem; font-weight: 800; color: var(--color-text-main); }
.score-total { font-size: 1rem; color: var(--color-text-secondary); }

.loading {
  text-align: center;
  padding: 40px;
  color: var(--color-text-secondary);
}

.btn-back {
  display: inline-block;
  margin-top: 20px;
  padding: 10px 24px;
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  border-radius: var(--radius-sm);
  font-weight: 600;
  border: none;
  cursor: pointer;
}
</style>
