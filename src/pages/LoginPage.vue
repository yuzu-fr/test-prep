<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { login, register, user } from '../services/authService'

const router = useRouter()
const route = useRoute()
const isLogin = ref(true)

onMounted(() => {
  if (route.query.mode === 'register') {
    isLogin.value = false
  }
})

watch(() => route.query.mode, (newMode) => {
  isLogin.value = newMode !== 'register'
})

// Auto-redirect if user becomes authenticated (e.g. after email confirmation)
watch(user, (newUser) => {
  if (newUser) {
    router.push('/')
  }
}, { immediate: true })

const username = ref('')
const password = ref('')
const email = ref('')
const error = ref('')

async function handleSubmit() {
  error.value = ''
  
  try {
    if (isLogin.value) {
      // For login, we'll use email as the identifier in Supabase
      // If the user entered a username in the 'username' field, we'll treat it as email for now
      // Or we can add an email field for login as well.
      await login(email.value || username.value, password.value)
      router.push('/')
    } else {
      await register(username.value, email.value, password.value)
      // Supabase might send a confirmation email, or auto-login depending on settings
      if (user.value) {
        router.push('/')
      } else {
        error.value = 'Veuillez vérifier votre boîte mail pour confirmer votre inscription.'
      }
    }
  } catch (e) {
    error.value = e.message || 'Une erreur est survenue'
  }
}
</script>

<template>
  <main class="auth-container">
    <div class="auth-card shadow-sm fade-in">
      <div class="auth-header">
        <h1>{{ isLogin ? 'Connexion' : 'Inscription' }}</h1>
        <p>{{ isLogin ? 'Ravie de vous revoir !' : 'Rejoignez-nous pour suivre vos progrès.' }}</p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="!isLogin" class="form-group">
          <label for="username">Nom d'utilisateur</label>
          <input 
            type="text" 
            id="username" 
            v-model="username" 
            required 
            placeholder="Ex: jean_dupont"
          >
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            required 
            placeholder="Ex: jean@example.com"
          >
        </div>

        <div class="form-group">
          <label for="password">Mot de passe</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            required 
            placeholder="••••••••"
          >
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" class="btn-primary auth-submit">
          {{ isLogin ? 'Se connecter' : 'S\'inscrire' }}
        </button>
      </form>

      <div class="auth-footer">
        <p v-if="isLogin">
          Pas encore de compte ? 
          <a @click="isLogin = false">Créer un compte</a>
        </p>
        <p v-else>
          Déjà un compte ? 
          <a @click="isLogin = true">Se connecter</a>
        </p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px);
  padding: 20px;
  background-color: #f8f9fa;
}

.auth-card {
  background: white;
  padding: 40px;
  border-radius: 24px;
  width: 100%;
  max-width: 450px;
  border: 1px solid var(--color-border);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-header h1 {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text-main);
  margin-bottom: 8px;
}

.auth-header p {
  color: var(--color-text-secondary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text-main);
}

.form-group input {
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  font-size: 1rem;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(79, 124, 255, 0.1);
}

.auth-submit {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  font-size: 1rem;
  margin-top: 10px;
}

.error-message {
  color: var(--color-danger);
  background: #fef2f2;
  padding: 12px;
  border-radius: 12px;
  font-size: 0.9rem;
  text-align: center;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.auth-footer a {
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}

.fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
