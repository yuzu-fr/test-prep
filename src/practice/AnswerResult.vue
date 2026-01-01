<script setup>
const props = defineProps({
  validated: Boolean,
  isCorrect: Boolean,
  canValidate: Boolean,
})

const emit = defineEmits(['validate', 'next'])
</script>

<template>
  <div class="answer-result">
    <div v-if="validated" class="feedback-box" :class="{ 'is-correct': isCorrect }">
      <p class="feedback-text">
        <span v-if="isCorrect" class="icon">✅</span>
        <span v-else class="icon">❌</span>
        {{ isCorrect ? 'Bonne réponse !' : 'Mauvaise réponse.' }}
      </p>
    </div>

    <div class="actions">
      <button
        v-if="!validated"
        class="btn btn-primary"
        :disabled="!canValidate"
        @click="emit('validate')"
      >
        Vérifier
      </button>

      <button
        v-else
        class="btn btn-next"
        @click="emit('next')"
      >
        Question suivante
      </button>
    </div>
  </div>
</template>

<style scoped>
.answer-result {
  margin-top: 32px;
}

.feedback-box {
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 24px;
  text-align: center;
}

.feedback-box.is-correct {
  background: #e6f6ea;
  border: 1px solid #2ecc71;
}

.feedback-box:not(.is-correct) {
  background: #fdecea;
  border: 1px solid #e74c3c;
}

.feedback-text {
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.actions {
  display: flex;
  justify-content: center;
}

.btn {
  padding: 14px 32px;
  border-radius: 12px;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 300px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary, #4f7cff);
  color: white;
}

.btn-primary:not(:disabled):hover {
  background: #3d68e6;
  transform: translateY(-1px);
}

.btn-next {
  background: #333;
  color: white;
}

.btn-next:hover {
  background: #000;
  transform: translateY(-1px);
}
</style>