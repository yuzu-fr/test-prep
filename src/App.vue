<template>
  <nav class="nav">
    <router-link to="/">Accueil</router-link>
    <router-link to="/practice">S’entraîner</router-link>
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
