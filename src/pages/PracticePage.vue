<script setup>
  import { ref, computed, inject, watch } from 'vue'
  import rawQuestions from '../data/questions.json'
  
  import ProgressBar from '../practice/ProgressBar.vue'
  import QuestionCard from '../practice/QuestionCard.vue'
  import OptionsList from '../practice/OptionsList.vue'
  import AnswerResult from '../practice/AnswerResult.vue'
  
/* ====== 语言模式 ====== */
// globalLanguages: 全局可选的语言池 (来自 Navbar)
// activeLanguages: 当前练习页面实际显示的语言 (本地控制)
const globalLanguages = inject('globalLanguages')
const activeLanguages = ref([...globalLanguages.value])

// 当全局语言池改变时，同步更新本地显示语言
watch(globalLanguages, (newPool) => {
  // 确保本地显示的语言都在新的池子里
  activeLanguages.value = activeLanguages.value.filter(lang => newPool.includes(lang))
  // 如果过滤后为空，则默认显示池子里的第一种语言
  if (activeLanguages.value.length === 0 && newPool.length > 0) {
    activeLanguages.value = [newPool[0]]
  }
}, { deep: true })

/* ====== 数据适配 ====== */
function adaptQuestions(raw) {
  return raw.map(q => {
    // 自动提取所有 question_XX 和 text_XX
    const question = {}
    const options = {}

    Object.keys(q).forEach(key => {
      if (key.startsWith('question_')) {
        const lang = key.replace('question_', '')
        question[lang] = q[key]
      }
    })

    // 假设 options 数组中每个对象包含 text_XX
    if (q.options && q.options.length > 0) {
      const langs = Object.keys(q.options[0])
        .filter(k => k.startsWith('text_'))
        .map(k => k.replace('text_', ''))
      
      langs.forEach(lang => {
        options[lang] = q.options.map(o => o[`text_${lang}`])
      })
    }

    return {
      id: q._id,
      question,
      options,
      answer: q.correct_index,
    }
  })
}

const questions = adaptQuestions(rawQuestions)

/* ====== 语言设置 ====== */
const langLabels = {
  fr: 'FR',
  cn: '中文',
  en: 'EN',
  es: 'ES'
}

/* ====== 状态与持久化 ====== */
const STORAGE_KEY = 'test_civique_progress'
const savedProgress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')

const index = ref(savedProgress.index || 0)
const answers = ref(savedProgress.answers || {}) // { questionId: selectedIndex }
const validatedMap = ref(savedProgress.validatedMap || {}) // { questionId: boolean }

// 导出当前题目的状态
const selected = computed({
  get: () => answers.value[questions[index.value].id] ?? null,
  set: (val) => {
    answers.value[questions[index.value].id] = val
  }
})

const validated = computed({
  get: () => validatedMap.value[questions[index.value].id] ?? false,
  set: (val) => {
    validatedMap.value[questions[index.value].id] = val
  }
})

// 语言偏好
if (savedProgress.activeLanguages) {
  activeLanguages.value = savedProgress.activeLanguages
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    index: index.value,
    answers: answers.value,
    validatedMap: validatedMap.value,
    activeLanguages: activeLanguages.value
  }))
}

const current = computed(() => questions[index.value])

const isCorrect = computed(
  () => selected.value === current.value.answer
)

/* ====== 行为 ====== */
function toggleLanguage(lang) {
  const idx = activeLanguages.value.indexOf(lang)
  if (idx > -1) {
    if (activeLanguages.value.length > 1) {
      activeLanguages.value.splice(idx, 1)
    }
  } else {
    activeLanguages.value.push(lang)
  }
  saveProgress()
}

function selectOption(i) {
  if (validated.value) return
  selected.value = i
  saveProgress()
}

function validate() {
  validated.value = true
  saveProgress()
}

function next() {
  index.value = (index.value + 1) % questions.length
  // 不再在这里重置 selected/validated，因为它们是 computed
  saveProgress()
}
</script>

<template>
  <main class="container" v-if="current">
    <h2>Entraînement</h2>

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
  </main>
</template>
  

<style scoped>
.container {
  padding: var(--space-lg);
  max-width: 600px;
  margin: 0 auto;
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
</style>
    