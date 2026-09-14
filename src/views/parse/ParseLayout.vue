<template>
  <div class="parse-layout">
    <!-- 左侧边栏 -->
    <aside class="sider">
      <div class="sider-top">
        <!-- 品牌区 -->
        <div class="brand">
          <div class="brand-logo">N</div>
          <div class="brand-meta">
            <div class="brand-name">审核任务</div>
            <div class="brand-sub">Document Intelligence</div>
          </div>
        </div>

        <div class="menu">
          <div
            v-for="item in menus"
            :key="item.path"
            class="menu-item"
            :class="{ active: isActive(item.path) }"
            @click="go(item.path)"
          >
            <el-icon :size="16"><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>
      <div class="sider-logo">
        <div class="logo-circle">N</div>
      </div>
    </aside>

    <!-- 主区域 -->
    <div class="main">
      <header class="header">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>审核任务</el-breadcrumb-item>
          <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
        </el-breadcrumb>

        <div class="header-right">
          <div class="icon-btn"><el-icon :size="17"><Grid /></el-icon></div>
          <div class="icon-btn"><el-icon :size="17"><Share /></el-icon></div>
          <div class="icon-btn"><el-icon :size="17"><Bell /></el-icon></div>
          <div class="icon-btn"><el-icon :size="17"><Setting /></el-icon></div>
          <div class="divider"></div>
          <el-dropdown trigger="click" @command="onCommand">
            <div class="user-block">
              <el-avatar :size="34" class="user-avatar">{{ avatarText }}</el-avatar>
              <div class="user-meta">
                <div class="user-name">{{ auth.username }}</div>
                <div class="user-role">管理员</div>
              </div>
              <el-icon color="#909399"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  FolderAdd,
  List,
  Setting,
  Grid,
  Share,
  Bell,
  ArrowDown,
  SwitchButton
} from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const menus = [
  { path: '/parse/new', label: '新建审核', icon: FolderAdd },
  { path: '/parse/history', label: '审核历史', icon: List }
]

const currentTitle = computed(() => route.meta.title || '审核历史')
const avatarText = computed(() => (auth.username || 'U').slice(0, 1).toUpperCase())

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

function go(path) {
  if (route.path !== path) router.push(path)
}

function onCommand(cmd) {
  if (cmd === 'logout') {
    auth.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.parse-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f4f6fc;
}

/* 侧边栏 */
.sider {
  width: 208px;
  flex-shrink: 0;
  height: 100vh;
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(10px);
  border-right: 1px solid #eceef6;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.sider-top {
  padding-top: 20px;
}

/* 品牌区 */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px 18px;
  border-bottom: 1px solid #f0f1f8;
  margin: 0 12px 14px;
}

.brand-logo {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 12px;
  background: var(--brand-gradient);
  color: #fff;
  font-weight: 700;
  font-size: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 14px -4px rgba(90, 92, 245, 0.5);
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink-900);
  letter-spacing: 0.5px;
  line-height: 1.3;
}

.brand-sub {
  font-size: 10.5px;
  color: var(--ink-300);
  letter-spacing: 0.4px;
  transform: scale(0.95);
  transform-origin: left center;
}

.menu {
  padding: 4px 12px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  margin-bottom: 6px;
  border-radius: 999px;
  font-size: 14px;
  color: #5a5f7d;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.menu-item:hover {
  background: #f1f3fb;
  color: var(--ink-900);
  transform: translateX(3px);
}

.menu-item.active {
  background: var(--brand-gradient);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 8px 18px -6px rgba(90, 92, 245, 0.55);
}

.menu-item.active:hover {
  transform: none;
}

.sider-logo {
  padding: 24px;
  display: flex;
  justify-content: center;
}

.logo-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 30%, #a5b4fc, #818cf8 55%, #6366f1);
  color: #fff;
  font-weight: 700;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 18px -4px rgba(99, 102, 241, 0.45), 0 0 0 6px rgba(99, 102, 241, 0.08);
  transition: transform 0.25s ease;
}

.logo-circle:hover {
  transform: rotate(-8deg) scale(1.06);
}

/* 主区 */
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.header {
  height: 60px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #eceef6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--ink-900);
  font-weight: 600;
}

.header :deep(.el-breadcrumb__inner) {
  color: var(--ink-400);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border: 1px solid #e6e8f2;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7194;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  color: var(--brand-500);
  border-color: rgba(79, 110, 247, 0.35);
  background: #f4f6ff;
  box-shadow: 0 6px 14px -6px rgba(79, 110, 247, 0.35);
  transform: translateY(-2px);
}

.divider {
  width: 1px;
  height: 22px;
  background: #e4e7f0;
  margin: 0 6px;
}

.user-block {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  outline: none;
  padding: 5px 10px 5px 6px;
  border-radius: 999px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.user-block:hover {
  background: #fff;
  border-color: #e6e8f2;
  box-shadow: var(--shadow-sm);
}

.user-avatar {
  background: var(--brand-gradient);
  font-weight: 600;
  box-shadow: 0 4px 10px -2px rgba(90, 92, 245, 0.4);
}

.user-meta {
  line-height: 1.25;
}

.user-name {
  font-size: 14px;
  color: var(--ink-900);
  font-weight: 600;
}

.user-role {
  font-size: 12px;
  color: var(--ink-300);
}

.content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 26px 36px;
  background:
    radial-gradient(ellipse 45% 32% at 88% -4%, rgba(124, 92, 255, 0.08), transparent 70%),
    radial-gradient(ellipse 42% 32% at 4% 2%, rgba(79, 110, 247, 0.09), transparent 70%),
    radial-gradient(ellipse 55% 42% at 55% 112%, rgba(56, 189, 248, 0.07), transparent 70%),
    linear-gradient(rgba(79, 110, 247, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(79, 110, 247, 0.035) 1px, transparent 1px),
    linear-gradient(180deg, #f7f8fd 0%, #f2f4fb 100%);
  background-size: auto, auto, auto, 30px 30px, 30px 30px, auto;
}
</style>
