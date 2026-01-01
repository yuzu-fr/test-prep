import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import PracticePage from '../pages/PracticePage.vue'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', component: Home },
      { path: '/practice', component: PracticePage },
    ],
  })

export default router
