<template>
  <main class="container">
    <h2>Entraînement</h2>

    <div class="question-card">
      <p class="question">{{ current.question }}</p>

      <ul class="options">
        <li
          v-for="(opt, i) in current.options"
          :key="i"
          :class="optionClass(i)"
          @click="select(i)"
        >
          {{ opt }}
        </li>
      </ul>

      <p v-if="validated" class="feedback">
        <span v-if="isCorrect">✅ Bonne réponse</span>
        <span v-else>❌ Mauvaise réponse</span>
      </p>

      <button v-if="!validated" @click="validate" :disabled="selected === null">
        Vérifier
      </button>

      <button v-else @click="next">
        Question suivante
      </button>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import rawQuestions from '../data/questions.json'

const questions = adaptQuestions(rawQuestions, 'fr')

const index = ref(0)
const selected = ref(null)
const validated = ref(false)

const current = computed(() => questions[index.value])

const isCorrect = computed(() => selected.value === current.value.answer)

function adaptQuestions(raw, lang = 'fr') {
  return raw.map(q => ({
    id: q._id,
    question: lang === 'fr' ? q.question_fr : q.question_cn,
    options: q.options.map(o =>
      lang === 'fr' ? o.text_fr : o.text_cn
    ),
    answer: q.correct_index,
    examType: q.exam_type,
    categoryId: q.category_id,
  }))
}

function select(i) {
  if (validated.value) return
  selected.value = i
}

function validate() {
  validated.value = true
}

function next() {
  index.value = (index.value + 1) % questions.length
  selected.value = null
  validated.value = false
}

function optionClass(i) {
  if (!validated.value) {
    return { selected: selected.value === i }
  }

  if (i === current.value.answer) {
    return 'correct'
  }

  if (i === selected.value) {
    return 'wrong'
  }

  return ''
}
</script>

<style scoped>
.container {
  padding: 24px;
}

.question-card {
  max-width: 500px;
  margin-top: 24px;
}

.question {
  font-size: 18px;
  margin-bottom: 16px;
}

.options {
  list-style: none;
  padding: 0;
}

.options li {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
}

.options li.selected {
  background: #eef4ff;
  border-color: #4f7cff;
}

.options li.correct {
  background: #e6f6ea;
  border-color: #2ecc71;
}

.options li.wrong {
  background: #fdecea;
  border-color: #e74c3c;
}

.feedback {
  margin-top: 12px;
  font-weight: 600;
}

button {
  margin-top: 16px;
  padding: 10px 16px;
}
</style>
