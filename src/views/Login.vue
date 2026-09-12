<template>
  <div class="login-page aurora-bg">
    <div class="login-card">
      <div class="brand">
        <div class="brand-logo">N</div>
        <div class="brand-name">Nova · 智能文档审核平台</div>
        <div class="brand-sub">智能文档审核 / 版面解析</div>
      </div>

      <el-alert
        v-if="isMock"
        type="info"
        :closable="false"
        show-icon
        title="Mock 模式：任意账号密码即可登录"
        style="margin-bottom: 18px"
      />

      <el-form :model="form" size="large" @keyup.enter="onSubmit">
        <el-form-item>
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item style="margin-bottom: 8px">
          <el-button
            type="primary"
            style="width: 100%"
            :loading="loading"
            @click="onSubmit"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const isMock = import.meta.env.VITE_MOCK === 'true'
const form = reactive({ username: '', password: '' })
const loading = ref(false)

async function onSubmit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await auth.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.push(route.query.redirect || '/')
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.login-card {
  width: 400px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 22px;
  padding: 44px 38px 34px;
  box-shadow: 0 24px 60px -16px rgba(90, 80, 180, 0.3), 0 4px 16px rgba(90, 80, 160, 0.08);
}

.brand {
  text-align: center;
  margin-bottom: 30px;
}

.brand-logo {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 16px;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 27px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 24px -6px rgba(90, 92, 245, 0.5), 0 0 0 8px rgba(79, 110, 247, 0.08);
}

.brand-name {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.5px;
  background: linear-gradient(120deg, #1f2340 30%, #4f6ef7 80%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-sub {
  margin-top: 8px;
  font-size: 13px;
  color: var(--ink-400);
  letter-spacing: 1px;
}

.login-card :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 14px;
}

.login-card :deep(.el-button--large) {
  border-radius: 10px;
  font-size: 15px;
  letter-spacing: 6px;
  font-weight: 600;
}
</style>
