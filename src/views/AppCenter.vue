<template>
  <div class="app-center aurora-bg">
    <!-- 顶栏 -->
    <div class="topbar">
      <div class="topbar-left">
        <span class="hub-badge"><span class="hub-dot"></span>AI PLATFORM HUB</span>
      </div>
      <div class="topbar-right">
        <el-dropdown trigger="click" @command="onCommand">
          <div class="user-chip">
            <el-avatar :size="30" class="user-avatar">{{ avatarText }}</el-avatar>
            <span class="user-name">{{ auth.username }}</span>
            <el-icon><ArrowDown /></el-icon>
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
    </div>

    <!-- 标题区 -->
    <div class="hero">
      <h1 class="hero-title">应用中心</h1>
      <p class="hero-sub">探索智能文档处理全链路能力，从识别、解析到审核，一站式 AI 驱动解决方案</p>
    </div>

    <!-- 应用卡片 -->
    <div class="card-grid">
      <div
        v-for="app in apps"
        :key="app.type"
        class="app-card"
        @click="enter(app.type)"
      >
        <div class="card-cover" :class="`cover-${app.color}`">
          <component :is="app.cover" />
        </div>
        <div class="card-body">
          <div class="card-title">{{ app.title }}</div>
          <div class="card-tags">
            <span
              v-for="(tag, i) in app.tags"
              :key="tag"
              class="tag-pill"
              :class="`pill-${['blue', 'purple', 'orange', 'green'][i % 4]}`"
            >{{ tag }}</span>
          </div>
          <div class="card-desc">{{ app.desc }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowDown, SwitchButton } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const avatarText = computed(() => (auth.username || 'U').slice(0, 1).toUpperCase())

function enter(type) {
  router.push({ path: '/parse/new', query: { type } })
}

function onCommand(cmd) {
  if (cmd === 'logout') {
    auth.logout()
    router.push('/login')
  }
}

// ---- 粉彩 3D 插画风封面（纯 SVG，无外部图片） ----
const svgWrap = (inner) =>
  h('svg', {
    viewBox: '0 0 200 120',
    width: '100%',
    height: '100%',
    preserveAspectRatio: 'xMidYMid slice',
    innerHTML: inner
  })

const CoverSingle = () => svgWrap(`
  <ellipse cx="100" cy="104" rx="62" ry="10" fill="rgba(255,255,255,0.5)"/>
  <rect x="62" y="14" width="76" height="92" rx="7" fill="#ffffff" opacity="0.95"/>
  <rect x="72" y="26" width="38" height="6" rx="3" fill="#93c5fd"/>
  <rect x="72" y="40" width="56" height="4" rx="2" fill="#dbeafe"/>
  <rect x="72" y="50" width="56" height="4" rx="2" fill="#dbeafe"/>
  <rect x="72" y="60" width="40" height="4" rx="2" fill="#dbeafe"/>
  <rect x="72" y="74" width="26" height="18" rx="4" fill="#bfdbfe"/>
  <circle cx="140" cy="80" r="16" fill="none" stroke="#3b82f6" stroke-width="4"/>
  <line x1="152" y1="92" x2="163" y2="103" stroke="#3b82f6" stroke-width="5" stroke-linecap="round"/>
`)

const CoverCross = () => svgWrap(`
  <ellipse cx="100" cy="104" rx="64" ry="10" fill="rgba(255,255,255,0.5)"/>
  <rect x="46" y="22" width="66" height="80" rx="7" fill="#ede9fe" transform="rotate(-6 79 62)"/>
  <rect x="88" y="16" width="66" height="80" rx="7" fill="#ffffff" opacity="0.96" transform="rotate(4 121 56)"/>
  <rect x="98" y="28" width="34" height="6" rx="3" fill="#c4b5fd"/>
  <rect x="98" y="42" width="46" height="4" rx="2" fill="#ede9fe"/>
  <rect x="98" y="52" width="46" height="4" rx="2" fill="#ede9fe"/>
  <path d="M60 88 C 80 100, 120 100, 142 86" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 6"/>
  <circle cx="60" cy="88" r="5" fill="#8b5cf6"/>
  <circle cx="142" cy="86" r="5" fill="#8b5cf6"/>
`)

const CoverCompare = () => svgWrap(`
  <ellipse cx="100" cy="104" rx="64" ry="10" fill="rgba(255,255,255,0.5)"/>
  <rect x="34" y="24" width="58" height="72" rx="7" fill="#ffffff" opacity="0.95"/>
  <rect x="42" y="36" width="30" height="5" rx="2.5" fill="#a7f3d0"/>
  <rect x="42" y="48" width="42" height="4" rx="2" fill="#d1fae5"/>
  <rect x="42" y="58" width="42" height="4" rx="2" fill="#d1fae5"/>
  <rect x="108" y="24" width="58" height="72" rx="7" fill="#ffffff" opacity="0.95"/>
  <rect x="116" y="36" width="30" height="5" rx="2.5" fill="#a7f3d0"/>
  <rect x="116" y="48" width="42" height="4" rx="2" fill="#fde68a"/>
  <rect x="116" y="58" width="42" height="4" rx="2" fill="#d1fae5"/>
  <circle cx="100" cy="60" r="17" fill="#10b981"/>
  <path d="M92 60 l6 6 l11 -12" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
`)

const apps = [
  {
    type: 'single_page',
    title: '单页审核',
    tags: ['版面解析', '要素抽取', '单页文档'],
    desc: '面向单据、证件、单页合同等独立页面文档，自动完成版面解析与关键要素审核，秒级返回结构化结果。',
    color: 'blue',
    cover: CoverSingle
  },
  // {
  //   type: 'cross_page',
  //   title: '交叉审核',
  //   tags: ['跨页关联', '一致性校验', '多页文档'],
  //   desc: '对多页合同、标书、申报材料进行跨页关联分析，自动校验前后要素一致性，发现潜在矛盾点。',
  //   color: 'purple',
  //   cover: CoverCross
  // },
  {
    type: 'compare',
    title: '比对审核',
    tags: ['差异比对', '版本管理', '合同比对'],
    desc: '对两份或多份文档逐条比对，精准定位内容差异与篡改痕迹，适用于合同版本比对等场景。',
    color: 'green',
    cover: CoverCompare
  }
]
</script>

<style scoped>
.app-center {
  min-height: 100vh;
  padding: 24px 56px 64px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hub-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 2px;
  font-weight: 600;
  color: #5b54e8;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(91, 84, 232, 0.22);
  padding: 6px 14px;
  border-radius: 999px;
  box-shadow: 0 4px 14px -6px rgba(91, 84, 232, 0.3);
}

.hub-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f6ef7, #7c5cff);
  box-shadow: 0 0 0 3px rgba(91, 84, 232, 0.15);
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(6px);
  padding: 5px 14px 5px 5px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  outline: none;
  box-shadow: 0 4px 14px -8px rgba(90, 80, 160, 0.4);
  transition: all 0.2s ease;
}

.user-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -8px rgba(90, 80, 160, 0.5);
}

.user-avatar {
  background: var(--brand-gradient);
  font-size: 13px;
  font-weight: 600;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-900);
}

.hero {
  margin: 60px 0 40px;
}

.hero-title {
  margin: 0;
  font-size: 42px;
  font-weight: 800;
  letter-spacing: 1px;
  background: linear-gradient(120deg, #1f2340 25%, #4f6ef7 70%, #7c5cff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-sub {
  margin: 14px 0 0;
  font-size: 15px;
  color: #7d829e;
  letter-spacing: 0.3px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  max-width: 1320px;
}

@media (max-width: 1100px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}

.app-card {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 6px 24px -8px rgba(90, 80, 160, 0.16);
  transition: transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.28s ease;
}

.app-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 22px 44px -14px rgba(90, 92, 180, 0.32);
}

.card-cover {
  height: 190px;
}

.cover-blue {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 55%, #e0f2fe 100%);
}

.cover-purple {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 55%, #f3e8ff 100%);
}

.cover-green {
  background: linear-gradient(135deg, #d1fae5 0%, #bbf7d0 55%, #fef3c7 100%);
}

.card-body {
  padding: 20px 22px 24px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2340;
  margin-bottom: 10px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.tag-pill {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
}

.pill-blue { background: #e8f1ff; color: #3b82f6; }
.pill-purple { background: #f1ebff; color: #8b5cf6; }
.pill-orange { background: #fff1e3; color: #f59e0b; }
.pill-green { background: #e6f9ee; color: #10b981; }

.card-desc {
  font-size: 13px;
  line-height: 1.7;
  color: #9aa0b5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
