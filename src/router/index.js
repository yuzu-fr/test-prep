import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import Practice from '../pages/Practice.vue'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', component: Home },
      { path: '/practice', component: Practice },
    ],
  })

export default router
