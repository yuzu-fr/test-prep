import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import PracticePage from '../pages/PracticePage.vue'
import FaqPage from '../pages/FaqPage.vue'
import KnowledgeHome from '../pages/KnowledgeHome.vue'
import KnowledgePage from '../pages/KnowledgePage.vue'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', component: Home },
      { path: '/practice', component: PracticePage },
      { path: '/faq', component: FaqPage },
      { path: '/knowledge', component: KnowledgeHome },
      { path: '/knowledge/history', component: KnowledgePage },
    ],
  })

export default router
