<template>
  <div class="compare-audit-result">
    <!-- 页面标题区 -->
    <div class="page-head">
      <div class="head-left">
        <div class="back-btn" @click="goBack">
          <el-icon :size="16"><Back /></el-icon>
        </div>
        <div>
          <h1 class="page-title">标准页审核结果</h1>
          <p class="page-desc">
            {{ task?.file_name || '加载中…' }}<template v-if="task?.file_name"> · </template>任务ID：{{ taskId }}
          </p>
        </div>
      </div>
      <el-button
        type="primary"
        :icon="VideoPlay"
        :loading="auditing"
        :disabled="!!task && task.status !== 'success'"
        @click="runAudit"
      >
        {{ hasResult ? '重新执行审核' : '执行审核' }}
      </el-button>
    </div>

    <!-- 结果切换：审核结果 / 查看版面（解析结果标签页暂时隐藏） -->
    <el-tabs v-model="activeTab" class="result-tabs" @tab-click="onTabClick">
      <el-tab-pane label="审核结果" name="audit" />
      <el-tab-pane label="查看版面" name="layout" />
      <!-- <el-tab-pane label="解析结果" name="parse" /> -->
    </el-tabs>

    <!-- 查看版面：渲染 task.table_json_to_html_fix，无值时回退 table_json_to_html -->
    <div v-show="activeTab === 'layout'" class="page-card layout-card">
      <div v-if="layoutHtml" class="layout-content" v-html="layoutHtml"></div>
      <el-empty v-else description="暂无版面数据" :image-size="100" />
    </div>

    <!-- 任务信息卡 -->
    <div v-show="activeTab === 'audit'" v-loading="loading" class="page-card info-card">
      <el-skeleton v-if="loading && !task" :rows="3" animated />
      <template v-else-if="task">
        <div class="task-bar">
          <div class="task-file">
            <div class="file-icon">
              <el-icon :size="18"><Folder /></el-icon>
            </div>
            <span class="file-name">{{ task.file_name || '未命名文件' }}</span>
          </div>
          <div class="task-meta">
            <el-tag effect="light">{{ task.task_type_display || '-' }}</el-tag>
            <el-tag :type="statusMeta.tagType" effect="light">
              {{ task.status_display || statusMeta.label }}
            </el-tag>
            <span class="meta-item">创建时间：{{ task.created_at || '-' }}</span>
          </div>
        </div>

        <div class="bar-divider"></div>

        <!-- 总体审核结论 -->
        <div class="overall-row">
          <span class="overall-label">总体审核结论</span>
          <span v-if="overallResult" class="overall-badge" :class="`is-${resultClass(overallResult)}`">
            <el-icon :size="18">
              <CircleCheckFilled v-if="overallResult === '合格'" />
              <WarningFilled v-else-if="overallResult === '存疑'" />
              <CircleCloseFilled v-else-if="overallResult === '不合格'" />
              <QuestionFilled v-else />
            </el-icon>
            {{ overallResult }}
          </span>
          <span v-else class="overall-none">尚未审核</span>
          <span class="overall-hint">（不合格或缺失 → 不合格；存疑或无法判定 → 存疑；否则合格）</span>
        </div>

        <!-- 统计 -->
        <div v-if="stats" class="stats-row">
          <span class="stat-chip is-total">总数 {{ stats.总数 ?? 0 }}</span>
          <span class="stat-chip is-pass">合格 {{ stats.合格 ?? 0 }}</span>
          <span class="stat-chip is-fail">不合格 {{ stats.不合格 ?? 0 }}</span>
          <span class="stat-chip is-fail">缺失 {{ stats.缺失 ?? 0 }}</span>
          <span class="stat-chip is-warn">存疑 {{ stats.存疑 ?? 0 }}</span>
          <span class="stat-chip is-none">无法判定 {{ stats.无法判定 ?? 0 }}</span>
        </div>
      </template>
      <el-empty v-else description="未找到该任务" :image-size="90" />
    </div>

    <!-- 审核结果区：左原文件，右审核结果 -->
    <div
      v-show="activeTab === 'audit'"
      v-loading="auditing"
      class="split-area"
      element-loading-text="正在执行标准页审核，请稍候…"
    >
      <!-- 原文件 -->
      <div class="file-pane page-card">
        <div class="pane-title">原文件</div>
        <template v-if="fileSrc">
          <el-image
            v-if="isImageFile"
            :src="fileSrc"
            :preview-src-list="[fileSrc]"
            preview-teleported
            fit="contain"
            class="file-img"
          >
            <template #error>
              <div class="file-placeholder">
                <el-icon :size="28"><Picture /></el-icon>
                <span>图片加载失败</span>
              </div>
            </template>
            <template #placeholder>
              <div class="file-placeholder">
                <el-icon :size="28" class="is-loading"><Loading /></el-icon>
              </div>
            </template>
          </el-image>
          <iframe v-else-if="isPdfFile" :src="fileSrc" class="file-pdf" title="原文件"></iframe>
          <div v-else class="file-placeholder">
            <el-icon :size="28"><Document /></el-icon>
            <span>暂不支持预览该格式</span>
            <el-link type="primary" :href="fileSrc" target="_blank">下载查看</el-link>
          </div>
        </template>
        <div v-else class="file-placeholder">
          <el-icon :size="28"><Picture /></el-icon>
          <span>暂无原文件</span>
        </div>
      </div>

      <!-- 审核结果 -->
      <div class="result-pane">
        <template v-if="!loading">
          <!-- 尚未审核 -->
          <div v-if="!hasResult" class="page-card empty-card">
            <el-empty
              :description="emptyDesc"
              :image-size="110"
            >
              <el-button
                v-if="task?.status === 'success'"
                type="primary"
                :icon="VideoPlay"
                :loading="auditing"
                @click="runAudit"
              >
                {{ auditing ? '审核中' : '执行审核' }}
              </el-button>
            </el-empty>
          </div>

          <template v-else>
            <!-- 判定筛选 -->
            <div class="filter-bar page-card">
              <span class="filter-label">判定筛选</span>
              <el-radio-group v-model="verdictFilter" size="small">
                <el-radio-button value="">全部（{{ items.length }}）</el-radio-button>
                <el-radio-button
                  v-for="v in VERDICTS"
                  :key="v"
                  :value="v"
                >
                  {{ v }}（{{ verdictCount(v) }}）
                </el-radio-button>
              </el-radio-group>
            </div>

            <!-- 逐项审核卡片 -->
            <div v-for="(item, idx) in filteredItems" :key="idx" class="page-card audit-item">
              <div class="item-head">
                <span class="item-index">#{{ idx + 1 }}</span>
                <span class="item-name">{{ item.项目 || '未命名项目' }}</span>
                <span v-if="locationText(item)" class="item-loc">{{ locationText(item) }}</span>
                <el-tag
                  :type="verdictTagType(item.判定)"
                  effect="dark"
                  size="small"
                  class="item-verdict"
                >
                  {{ item.判定 || '未知' }}
                </el-tag>
              </div>

              <table class="layout-table kv-table">
                <tbody>
                  <tr v-if="item.单位">
                    <td class="kv-key">单位</td>
                    <td class="cell-left">{{ item.单位 }}</td>
                  </tr>
                  <tr>
                    <td class="kv-key">规定值</td>
                    <td class="cell-left">{{ item.规定值 || '-' }}</td>
                  </tr>
                  <tr v-if="item.判断依据">
                    <td class="kv-key">判断依据</td>
                    <td class="cell-left">{{ item.判断依据 }}</td>
                  </tr>
                  <tr>
                    <td class="kv-key">实测值</td>
                    <td class="cell-left">
                      <template v-if="(item.实测值列表 || []).length">
                        <span
                          v-for="(m, mi) in item.实测值列表"
                          :key="mi"
                          class="value-chip"
                        >
                          <span v-if="m.标签" class="value-label">{{ m.标签 }}</span>
                          {{ m.值 ?? '-' }}
                        </span>
                      </template>
                      <span v-else class="muted">无实测值</span>
                    </td>
                  </tr>
                  <tr>
                    <td class="kv-key">页面已有判定</td>
                    <td class="cell-left">
                      <span>{{ item.页面已有判定 || '无' }}</span>
                      <el-tag
                        v-if="item.已有判定是否正确 && item.已有判定是否正确 !== '无已有判定'"
                        :type="checkTagType(item.已有判定是否正确)"
                        effect="light"
                        size="small"
                        class="check-tag"
                      >
                        {{ item.已有判定是否正确 }}
                      </el-tag>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <el-empty
              v-if="!filteredItems.length"
              description="当前筛选条件下没有审核项"
              :image-size="90"
            />
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Back,
  Folder,
  VideoPlay,
  Picture,
  Loading,
  Document,
  CircleCheckFilled,
  CircleCloseFilled,
  WarningFilled,
  QuestionFilled
} from '@element-plus/icons-vue'
import request from '../../api/request'
import { ensureCompareAudit } from '../../api/audit'
import { STATUS_META } from '../../constants'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: true, linkify: true, breaks: true })

const route = useRoute()
const router = useRouter()

const taskId = route.params.id

function onTabClick(tab) {
  if (tab.paneName === 'parse') {
    router.push(`/parse/result/${taskId}`)
  }
}

const loading = ref(false)
const auditing = ref(false)

const task = ref(null)
const auditResult = ref(null)
const verdictFilter = ref('')
const activeTab = ref('audit')

// 查看版面：优先渲染 table_json_to_html_fix，无值时回退 table_json_to_html
const layoutHtml = computed(() => {
  const raw = task.value?.table_json_to_html_fix || task.value?.table_json_to_html || ''
  return raw ? md.render(raw) : ''
})

const VERDICTS = ['合格', '不合格', '缺失', '存疑', '无法判定']

const statusMeta = computed(() => STATUS_META[task.value?.status] || STATUS_META.pending)

const hasResult = computed(
  () =>
    !!auditResult.value &&
    typeof auditResult.value === 'object' &&
    Object.keys(auditResult.value).length > 0
)

const items = computed(() =>
  Array.isArray(auditResult.value?.逐项审核) ? auditResult.value.逐项审核 : []
)

const stats = computed(() => auditResult.value?.统计 || null)

const overallResult = computed(() => auditResult.value?.总体结论 || null)

const filteredItems = computed(() =>
  verdictFilter.value
    ? items.value.filter((it) => it?.判定 === verdictFilter.value)
    : items.value
)

const emptyDesc = computed(() => {
  if (auditing.value) return '正在执行标准页审核，请稍候…'
  if (!task.value) return '未找到该任务'
  if (task.value.status === 'processing' || task.value.status === 'pending') {
    return '文档解析中，解析成功后将自动执行标准页审核'
  }
  if (task.value.status === 'failed') return '文档解析失败，无法执行审核'
  return '该任务尚未执行标准页审核'
})

// ---------- 原文件 ----------
const fileSrc = computed(() => {
  const p = task.value?.file_path
  if (!p) return ''
  return p.startsWith('/') ? p : `/media/${p}`
})

const fileExt = computed(() => {
  const name = task.value?.file_name || task.value?.file_path || ''
  return name.split('?')[0].split('.').pop().toLowerCase()
})

const isImageFile = computed(() => ['jpg', 'jpeg', 'png', 'bmp', 'webp'].includes(fileExt.value))

const isPdfFile = computed(() => fileExt.value === 'pdf')

function verdictCount(v) {
  return items.value.filter((it) => it?.判定 === v).length
}

function verdictTagType(v) {
  if (v === '合格') return 'success'
  if (v === '不合格' || v === '缺失') return 'danger'
  if (v === '存疑') return 'warning'
  return 'info'
}

function checkTagType(v) {
  if (v === '正确') return 'success'
  if (v === '错误') return 'danger'
  return 'warning'
}

function resultClass(r) {
  if (r === '合格') return 'pass'
  if (r === '存疑') return 'warn'
  if (r === '不合格') return 'fail'
  return 'none'
}

function locationText(item) {
  const loc = item?.定位
  if (!loc) return ''
  const parts = []
  if (loc.page != null) parts.push(`第 ${loc.page} 页`)
  if (loc.row != null) parts.push(`第 ${loc.row} 行`)
  return parts.join(' ')
}

// ---------- 数据加载 ----------
let pollTimer = null

function clearPoll() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

async function loadAll() {
  loading.value = true
  try {
    const { data } = await request.get(`/dp/tasks/${taskId}/`)
    task.value = data.task
    auditResult.value = data.task?.audit_result || null
    loading.value = false
    if (task.value?.task_type !== 'compare') return
    if (task.value?.status === 'success' && !hasResult.value) {
      // 解析成功且尚未审核：自动执行标准页审核
      runAudit()
    } else if (task.value?.status === 'processing' || task.value?.status === 'pending') {
      // 解析进行中：轮询任务状态，成功后自动执行审核
      clearPoll()
      pollTimer = setTimeout(loadAll, 5000)
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '加载任务信息失败')
    loading.value = false
  }
}

async function runAudit() {
  if (auditing.value) return
  if (task.value && task.value.task_type !== 'compare') return
  auditing.value = true
  try {
    // 审核可能较慢，单独放大超时时间
    const { data } = await ensureCompareAudit(taskId)
    auditResult.value = data.audit_result || null
    ElMessage.success(`审核完成，总体结论：${data.audit_result?.总体结论 || '-'}`)
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '执行审核失败，请稍后重试')
  } finally {
    auditing.value = false
  }
}

function goBack() {
  router.push('/parse/history')
}

onMounted(loadAll)
onBeforeUnmount(clearPoll)
</script>

<style scoped>
.compare-audit-result {
  width: 100%;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.result-tabs {
  margin-bottom: 16px;
}

.result-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 600;
}

/* 查看版面 */
.layout-card {
  padding: 22px 26px;
  overflow-x: auto;
}

.layout-content {
  font-size: 13.5px;
  color: var(--ink-900);
  line-height: 1.8;
}

.layout-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
  background: #fff;
}

.layout-content :deep(th),
.layout-content :deep(td) {
  border: 1px solid #e6e9f2;
  padding: 8px 14px;
  line-height: 1.7;
  text-align: center;
}

.layout-content :deep(th) {
  background: #f7f8fd;
  font-weight: 600;
  color: var(--ink-600);
}

.head-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.back-btn {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e6e8f2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-600);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.back-btn:hover {
  color: var(--brand-500);
  border-color: rgba(79, 110, 247, 0.35);
  transform: translateX(-3px);
  box-shadow: 0 6px 14px -6px rgba(79, 110, 247, 0.35);
}

.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.5px;
  background: linear-gradient(120deg, #1f2340 30%, #4f6ef7 75%, #7c5cff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.page-desc {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--ink-400);
  word-break: break-all;
}

/* 任务信息卡 */
.info-card {
  padding: 22px 28px;
  margin-bottom: 20px;
}

.task-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.task-file {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.file-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  background: #fff7e8;
  color: #e6a23c;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink-900);
  word-break: break-all;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 12.5px;
  color: var(--ink-400);
}

.bar-divider {
  height: 1px;
  background: #eef0f7;
  margin: 16px 0 18px;
}

/* 总体结论 */
.overall-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.overall-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-600);
}

.overall-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 18px;
  border-radius: 999px;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 2px;
}

.overall-badge.is-pass {
  color: #2f9e44;
  background: #e9f7ee;
  border: 1px solid #b7e4c7;
}

.overall-badge.is-warn {
  color: #d9850a;
  background: #fdf3e3;
  border: 1px solid #f3d9a4;
}

.overall-badge.is-fail {
  color: #e03131;
  background: #fdecec;
  border: 1px solid #f5c2c2;
}

.overall-badge.is-none {
  color: var(--ink-600);
  background: #f3f4f9;
  border: 1px solid #dfe3ee;
}

.overall-none {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink-300);
}

.overall-hint {
  font-size: 12px;
  color: var(--ink-300);
}

/* 统计 */
.stats-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.stat-chip {
  font-size: 12.5px;
  font-weight: 600;
  padding: 4px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.stat-chip.is-total {
  color: var(--ink-600);
  background: #f3f4f9;
  border-color: #dfe3ee;
}

.stat-chip.is-pass {
  color: #2f9e44;
  background: #e9f7ee;
  border-color: #b7e4c7;
}

.stat-chip.is-fail {
  color: #e03131;
  background: #fdecec;
  border-color: #f5c2c2;
}

.stat-chip.is-warn {
  color: #d9850a;
  background: #fdf3e3;
  border-color: #f3d9a4;
}

.stat-chip.is-none {
  color: var(--ink-400);
  background: #f7f8fd;
  border-color: #e6e8f2;
}

/* 结果区：左原文件，右审核结果 */
.split-area {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  min-height: 120px;
}

.file-pane {
  flex: 0 0 70%;
  min-width: 0;
  padding: 16px 18px;
  position: sticky;
  top: 16px;
}

.pane-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink-900);
  margin-bottom: 12px;
}

.file-img {
  width: 100%;
  display: block;
  border-radius: 10px;
  background: #f7f8fc;
}

.file-pdf {
  width: 100%;
  height: 78vh;
  border: none;
  border-radius: 10px;
  background: #f7f8fc;
}

.file-placeholder {
  width: 100%;
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--ink-300);
  font-size: 13px;
  background: #f7f8fc;
  border-radius: 10px;
}

.result-pane {
  flex: 1;
  min-width: 0;
}

.empty-card {
  padding: 30px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 12px 18px;
  margin-bottom: 16px;
}

.filter-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-600);
}

/* 逐项审核卡片 */
.audit-item {
  padding: 18px 22px 20px;
  margin-bottom: 16px;
}

.item-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.item-index {
  font-size: 13px;
  font-weight: 700;
  color: var(--brand-500);
}

.item-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink-900);
}

.item-loc {
  font-size: 12px;
  color: var(--ink-300);
}

.item-verdict {
  margin-left: auto;
}

/* 表格 */
.layout-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  color: var(--ink-900);
  background: #fff;
}

.layout-table td {
  border: 1px solid #e6e9f2;
  padding: 8px 14px;
  line-height: 1.7;
}

.kv-key {
  width: 110px;
  min-width: 110px;
  font-weight: 600;
  background: #f7f8fd;
  color: var(--ink-400);
  white-space: nowrap;
}

.cell-left {
  text-align: left;
  word-break: break-all;
}

.muted {
  color: var(--ink-300);
}

.value-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 2px 8px 2px 0;
  padding: 2px 10px;
  border-radius: 8px;
  background: #f4f6ff;
  border: 1px solid #e3e8fb;
  font-weight: 600;
  color: var(--ink-900);
}

.value-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--brand-500);
}

.check-tag {
  margin-left: 10px;
}
</style>
