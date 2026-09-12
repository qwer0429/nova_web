import axios from 'axios'
import { ElMessage } from 'element-plus'
import { mockAdapter } from './mock'

const isMock = import.meta.env.VITE_MOCK === 'true'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
  ...(isMock ? { adapter: mockAdapter } : {})
})

// 请求拦截：自动携带 token
request.interceptors.request.use((config) => {
  const access = localStorage.getItem('nova_access')
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

let refreshingPromise = null

async function tryRefresh() {
  const refresh = localStorage.getItem('nova_refresh')
  if (!refresh) throw new Error('no refresh token')
  refreshingPromise =
    refreshingPromise ||
    axios.post('/api/token/refresh/', { refresh }, isMock ? { adapter: mockAdapter } : {})
  try {
    const { data } = await refreshingPromise
    localStorage.setItem('nova_access', data.access)
    return data.access
  } finally {
    refreshingPromise = null
  }
}

async function forceLogout(msg) {
  const { useAuthStore } = await import('../stores/auth')
  const auth = useAuthStore()
  auth.logout()
  if (window.location.pathname !== '/login') {
    ElMessage.error(msg || '登录已过期，请重新登录')
    window.location.href = '/login'
  }
}

// 响应拦截：401 时先尝试 refresh 并重试一次，失败则跳登录页
request.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error
    if (!response || !config) return Promise.reject(error)

    const url = config.url || ''
    const isAuthApi = url.includes('/login') || url.includes('/token/refresh')

    if (response.status === 401 && !isAuthApi && !config.__retried) {
      try {
        const newAccess = await tryRefresh()
        config.__retried = true
        config.headers.Authorization = `Bearer ${newAccess}`
        return request(config)
      } catch (e) {
        await forceLogout('登录已过期，请重新登录')
        return Promise.reject(error)
      }
    }

    if (response.status === 401) {
      await forceLogout(response.data?.detail || '登录已过期，请重新登录')
    }
    return Promise.reject(error)
  }
)

export default request
