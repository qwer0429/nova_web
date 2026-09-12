import { defineStore } from 'pinia'
import request from '../api/request'

const ACCESS_KEY = 'nova_access'
const REFRESH_KEY = 'nova_refresh'
const USER_KEY = 'nova_user'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    access: localStorage.getItem(ACCESS_KEY) || '',
    refresh: localStorage.getItem(REFRESH_KEY) || '',
    user: JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  }),
  getters: {
    isLoggedIn: (s) => !!s.access,
    username: (s) => s.user?.username || ''
  },
  actions: {
    async login(username, password) {
      const { data } = await request.post('/login/', { username, password })
      this.setSession(data)
    },
    setSession({ access, refresh, user }) {
      this.access = access
      if (refresh) this.refresh = refresh
      if (user) this.user = user
      localStorage.setItem(ACCESS_KEY, this.access)
      localStorage.setItem(REFRESH_KEY, this.refresh)
      localStorage.setItem(USER_KEY, JSON.stringify(this.user))
    },
    logout() {
      this.access = ''
      this.refresh = ''
      this.user = null
      localStorage.removeItem(ACCESS_KEY)
      localStorage.removeItem(REFRESH_KEY)
      localStorage.removeItem(USER_KEY)
    }
  }
})
