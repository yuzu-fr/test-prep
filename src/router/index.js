import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import Practice from '../pages/Practice.vue'

const router = createRouter({
  history: createWebHistory('/test-prep/'),
  routes: [
    { path: '/', component: Home },
    { path: '/practice', component: Practice },
  ],
})

export default router
