import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    name: 'app-center',
    component: () => import('../views/AppCenter.vue'),
    meta: { requiresAuth: true, title: '应用中心' }
  },
  {
    path: '/parse',
    component: () => import('../views/parse/ParseLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/parse/history' },
      {
        path: 'new',
        name: 'parse-new',
        component: () => import('../views/parse/NewParse.vue'),
        meta: { requiresAuth: true, title: '新建解析' }
      },
      {
        path: 'history',
        name: 'parse-history',
        component: () => import('../views/parse/ParseHistory.vue'),
        meta: { requiresAuth: true, title: '解析历史' }
      },
      {
        path: 'types',
        name: 'parse-types',
        component: () => import('../views/parse/TypeConfig.vue'),
        meta: { requiresAuth: true, title: '类型配置' }
      },
      {
        path: 'result/:id',
        name: 'parse-result',
        component: () => import('../views/parse/ParseResult.vue'),
        meta: { requiresAuth: true, title: '审核结果' }
      },
      {
        path: 'single-result/:id',
        name: 'parse-single-result',
        component: () => import('../views/parse/SingleAuditResult.vue'),
        meta: { requiresAuth: true, title: '单页审核结果' }
      },
      {
        path: 'cross-result/:id',
        name: 'parse-cross-result',
        component: () => import('../views/parse/CrossAuditResult.vue'),
        meta: { requiresAuth: true, title: '交叉审核结果' }
      },
      {
        path: 'compare-result/:id',
        name: 'parse-compare-result',
        component: () => import('../views/parse/CompareAuditResult.vue'),
        meta: { requiresAuth: true, title: '比对审核结果' }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // mock 模式下的演示便捷入口：URL 携带 ?mock_login=1 时自动登录（用于截图/演示）
  if (import.meta.env.VITE_MOCK === 'true' && to.query.mock_login && !auth.isLoggedIn) {
    try {
      await auth.login('xiewei', 'mock123456')
    } catch (e) {
      // 忽略，走正常登录流程
    }
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && auth.isLoggedIn) {
    return { path: '/' }
  }
  document.title = to.meta.title
    ? `${to.meta.title} · Nova 智能文档审核平台`
    : 'Nova · 智能文档审核平台'
  return true
})

export default router
