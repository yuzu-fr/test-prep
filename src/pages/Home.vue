<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import themes from '../data/categories.json'

const router = useRouter()

const step = ref(1)
const selectedExam = ref(null)

const examTypes = [
  { 
    id: 'CSP', 
    name: 'Carte de Séjour Pluriannuelle', 
    desc: 'Examen de niveau intermédiaire pour le parcours d’intégration.' 
  },
  { 
    id: 'CR', 
    name: 'Carte de Résident', 
    desc: 'Examen de niveau avancé pour la carte de 10 ans.' 
  }
]

function selectExam(type) {
  selectedExam.value = type
  step.value = 2
}

function startPractice(themeId) {
  // 拼接官方 ID 格式，例如 CSP_01
  const fullId = `${selectedExam.value}_${themeId}`
  router.push({ path: '/practice', query: { category: fullId } })
}

function startMockExam() {
  // 模拟考试模式 (40题)
  router.push({ 
    path: '/practice', 
    query: { 
      exam: selectedExam.value,
      mode: 'mock' 
    } 
  })
}

function reset() {
  step.value = 1
  selectedExam.value = null
}
</script>

<template>
  <main class="container">
    <!-- Header avec Info Officielle -->
    <header class="hero">
      <h1>TestCivique Prep</h1>
      <p class="subtitle">Préparation officielle conforme à la loi du 26 janvier 2024</p>
      
      <div class="exam-info-banner">
        <div class="info-item">
          <strong>40</strong>
          <span>Questions</span>
        </div>
        <div class="info-item">
          <strong>45 min</strong>
          <span>Durée</span>
        </div>
        <div class="info-item">
          <strong>32/40</strong>
          <span>Pour réussir</span>
        </div>
      </div>
    </header>

    <!-- Étape 1 : Choisir le titre de séjour -->
    <section v-if="step === 1" class="step-view">
      <h2 class="section-title">Quel titre de séjour demandez-vous ?</h2>
      <div class="exam-grid">
        <div 
          v-for="exam in examTypes" 
          :key="exam.id" 
          class="exam-card"
          @click="selectExam(exam.id)"
        >
          <span class="exam-tag">{{ exam.id }}</span>
          <h3>{{ exam.name }}</h3>
          <p>{{ exam.desc }}</p>
          <button class="btn-primary">Sélectionner</button>
        </div>
      </div>
    </section>

    <!-- Étape 2 : Choisir le mode d'étude -->
    <section v-else class="step-view">
      <div class="view-header">
        <button class="btn-back" @click="reset">← Changer d'examen</button>
        <h2>Préparation - {{ selectedExam }}</h2>
      </div>

      <div class="prep-layout">
        <!-- Simulation d'examen -->
        <div class="mock-exam-section">
          <div class="mock-card" @click="startMockExam">
            <div class="card-content">
              <h3>Simulation d'examen</h3>
              <p>40 questions aléatoires dans les conditions réelles (45 minutes).</p>
            </div>
            <button class="btn-mock">Lancer le test</button>
          </div>
        </div>

        <!-- Thématiques -->
        <h3 class="subsection-title">Entraînement par thématique</h3>
        <div class="theme-grid">
          <div 
            v-for="theme in themes" 
            :key="theme.id" 
            class="theme-card"
            @click="startPractice(theme.id)"
          >
            <span class="theme-index">{{ theme.id }}</span>
            <h4>{{ theme.name }}</h4>
            <span class="action-text">S'entraîner →</span>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.hero {
  text-align: center;
  margin-bottom: 48px;
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  margin-bottom: 24px;
}

.exam-info-banner {
  display: flex;
  justify-content: center;
  gap: 32px;
  background: white;
  padding: 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  max-width: 500px;
  margin: 0 auto;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-item strong {
  font-size: 1.4rem;
  color: var(--color-primary);
}

.info-item span {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-title {
  text-align: center;
  margin-bottom: 32px;
}

/* Exam Grid */
.exam-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.exam-card {
  background: white;
  padding: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.exam-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-4px);
}

.exam-tag {
  background: var(--color-bg-muted);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-primary);
}

/* Mock Card */
.mock-card {
  background: var(--color-primary);
  color: white;
  padding: 24px;
  border-radius: var(--radius-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  margin-bottom: 40px;
}

.mock-card h3 { color: white; margin-bottom: 8px; }
.mock-card p { color: rgba(255,255,255,0.9); margin: 0; }

.btn-mock {
  background: white;
  color: var(--color-primary);
  border: none;
  padding: 12px 24px;
  border-radius: var(--radius-sm);
  font-weight: 700;
}

/* Theme Grid */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.theme-card {
  background: white;
  padding: 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.theme-card:hover { border-color: var(--color-primary); }

.theme-index {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.theme-card h4 {
  font-size: 1rem;
  margin-bottom: 12px;
  flex: 1;
}

.action-text {
  font-size: 0.85rem;
  color: var(--color-primary);
  font-weight: 600;
}

.btn-back {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  margin-bottom: 12px;
}
</style>
