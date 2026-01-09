<script setup>
/**
 * Main App Container
 * Handles global layout and top-level navigation.
 */
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
</style>
