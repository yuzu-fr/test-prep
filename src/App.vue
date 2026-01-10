<script setup>
import { user, logout } from './services/authService'
import { useRouter } from 'vue-router'

const router = useRouter()

function handleLogout() {
  logout()
  router.push('/login')
}
</script>

<template>
  <header class="app-header">
    <nav class="nav">
      <div class="nav-left">
        <router-link to="/">Accueil</router-link>
        <router-link to="/practice">S’entraîner</router-link>
        <router-link to="/knowledge">Mémos</router-link>
        <router-link to="/faq">FAQ</router-link>
      </div>

      <div class="nav-right">
        <div v-if="user" class="user-profile">
          <img :src="user.avatar" :alt="user.displayName" class="user-avatar">
          <span class="user-name">{{ user.displayName }}</span>
          <button @click="handleLogout" class="btn-logout">Déconnexion</button>
        </div>
        <div v-else class="auth-buttons">
          <router-link to="/login" class="btn-login">Connexion</router-link>
          <router-link :to="{ path: '/login', query: { mode: 'register' } }" class="btn-register">S'inscrire</router-link>
        </div>
      </div>
    </nav>
  </header>

  <router-view />
</template>

<style>
.app-header {
  background: white;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
}

.nav-left {
  display: flex;
  gap: 20px;
}

.nav-left a {
  text-decoration: none;
  color: var(--color-text-secondary);
  font-weight: 500;
  transition: color 0.2s;
}

.nav-left a.router-link-active {
  color: var(--color-primary);
}

.nav-right {
  display: flex;
  align-items: center;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
}

.user-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text-main);
}

.btn-login {
  background: transparent;
  color: var(--color-primary) !important;
  padding: 8px 16px;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-login:hover {
  background: rgba(79, 124, 255, 0.05);
}

.btn-register {
  background: var(--color-primary);
  color: white !important;
  padding: 8px 20px;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: opacity 0.2s;
}

.btn-register:hover {
  opacity: 0.9;
}

.auth-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-logout {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: #fef2f2;
  color: var(--color-danger);
  border-color: var(--color-danger);
}
</style>
