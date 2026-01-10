import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import PracticePage from '../pages/PracticePage.vue'
import FaqPage from '../pages/FaqPage.vue'
import KnowledgeHome from '../pages/KnowledgeHome.vue'
import KnowledgePage from '../pages/KnowledgePage.vue'
import LoginPage from '../pages/LoginPage.vue'

const router = createRouter({
    history: createWebHistory('/test-prep/'),
    routes: [
      { path: '/', component: Home },
      { path: '/practice', component: PracticePage },
      { path: '/faq', component: FaqPage },
      { path: '/knowledge', component: KnowledgeHome },
      { path: '/knowledge/:theme', component: KnowledgePage, props: true },
      { path: '/login', component: LoginPage },
    ],
  })

export default router
