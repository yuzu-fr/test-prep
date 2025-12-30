<template>
  <nav class="nav">
    <a href="/test-prep/">Accueil</a>
    <a href="/test-prep/practice">S’entraîner</a>
  </nav>

  <router-view />
</template>

<style>
.nav {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.nav a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
}
</style>
