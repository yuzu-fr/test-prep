<script setup>
import { ref, watch, provide, onMounted } from 'vue'
import additionalLangs from './data/language.json'

// Dynamically generate combinations based on the database model
const LANG_COMBOS = [
  { label: 'Français', value: ['fr'] },
  ...additionalLangs.map(lang => ({
    label: `FR + ${lang.name}`,
    value: ['fr', lang.code]
  }))
]

const STORAGE_KEY = 'test_civique_lang_combo'
const globalLanguages = ref(LANG_COMBOS[0].value)

// 初始化：从 localStorage 恢复
onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        globalLanguages.value = parsed
      }
    } catch (e) {
      console.error('Failed to parse saved language combo', e)
    }
  }
})

// 持久化
watch(globalLanguages, (newVal) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal))
}, { deep: true })

// 导出给全站使用：这是全局可选的语言池
provide('globalLanguages', globalLanguages)

function handleComboChange(event) {
  const selectedValue = JSON.parse(event.target.value)
  globalLanguages.value = selectedValue
}

// 辅助函数：将数组转为字符串以便在 select 中匹配
const comboToValue = (combo) => JSON.stringify(combo)
</script>

<template>
  <header class="app-header">
    <nav class="nav">
      <div class="nav-left">
        <router-link to="/">Accueil</router-link>
        <router-link to="/practice">S’entraîner</router-link>
      </div>

      <div class="nav-right">
        <select 
          class="lang-select" 
          :value="comboToValue(globalLanguages)" 
          @change="handleComboChange"
        >
          <option 
            v-for="combo in LANG_COMBOS" 
            :key="combo.label" 
            :value="comboToValue(combo.value)"
          >
            {{ combo.label }}
          </option>
        </select>
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

.lang-select {
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: white;
  font-size: 0.9rem;
  color: var(--color-text-main);
  cursor: pointer;
  outline: none;
}

.lang-select:focus {
  border-color: var(--color-primary);
}
</style>
