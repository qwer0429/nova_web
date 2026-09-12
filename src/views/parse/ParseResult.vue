<template>
  <div class="parse-result">
    <!-- 页面标题区 -->
    <div class="page-head">
      <div class="head-left">
        <div class="back-btn" @click="goBack">
          <el-icon :size="16"><Back /></el-icon>
        </div>
        <div>
          <h1 class="page-title">审核结果</h1>
          <p class="page-desc">查看任务的审核结论与明细</p>
        </div>
      </div>
    </div>

    <!-- 结果切换：审核结果 / 解析结果（解析结果标签页暂时隐藏） -->
    <el-tabs model-value="audit" class="result-tabs" @tab-click="onTabClick">
      <el-tab-pane label="审核结果" name="audit" />
      <!-- <el-tab-pane label="解析结果" name="parse" /> -->
    </el-tabs>

    <div v-loading="loading" class="page-card result-card">
      <template v-if="detail">
        <!-- 任务信息条 -->
        <div class="task-bar">
          <div class="task-file">
            <div class="file-icon">
              <el-icon :size="18"><Folder /></el-icon>
            </div>
            <span class="file-name">{{ detail.file_name || '未命名文件' }}</span>
          </div>
          <div class="task-meta">
            <el-tag effect="light">{{ detail.task_type_display || '-' }}</el-tag>
            <el-tag :type="statusMeta.tagType" effect="light">
              {{ detail.status_display || statusMeta.label }}
            </el-tag>
            <span class="meta-item">任务编号：{{ detail.task_id || '-' }}</span>
            <span class="meta-item">创建时间：{{ detail.created_at || '-' }}</span>
          </div>
        </div>

        <div class="bar-divider"></div>

        <!-- 失败 / 暂无审核结果 -->
        <el-result
          v-if="detail.status === 'failed'"
          icon="error"
          title="解析失败"
          sub-title="该任务解析失败，暂无可展示的结果"
        />

        <!-- DP 解析结果内嵌（暂时隐藏）
        <div v-else v-loading="dpLoading" class="dp-embed" element-loading-text="加载 DP 解析结果…">
          <iframe v-if="dpUrl" :src="dpUrl" class="dp-iframe" title="DP 解析结果"></iframe>
        </div>
        -->
        <el-empty v-else description="暂无审核结果" :image-size="100" />
      </template>

      <el-empty v-else-if="!loading" description="未找到该任务" :image-size="100" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import { Back, Folder } from '@element-plus/icons-vue'
import request from '../../api/request'
import { ensureSinglePageAudit } from '../../api/audit'
import { STATUS_META } from '../../constants'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detail = ref(null)
const dpLoading = ref(false)
const dpUrl = ref('')

// DP 平台结果页内嵌：task-list/{id} 与 __itemId__ 使用任务模型的 task_dp_id；
// iframe 无法设置请求头，加载时先请求 GET /dp/token/ 取最新的 access_token / refresh_token
// 拼为 query 参数（不带 Bearer 前缀），DP 前端会读取并附加到内部请求
async function loadDpResult() {
  const id = detail.value?.task_dp_id
  if (!id || detail.value?.status === 'failed') return
  dpLoading.value = true
  try {
    const { data } = await request.get('/dp/token/')
    const token = data.access_token || data.token || data.access || ''
    const refreshToken = data.refresh_token || data.refresh || ''
    dpUrl.value =
      `http://101.36.73.176:10810/app/layout/dp-layout/task-list/${id}` +
      `?__itemId__=${id}&access_token=${encodeURIComponent(token)}` +
      `&refresh_token=${encodeURIComponent(refreshToken)}`
  } catch {
    ElMessage.error('获取 DP token 失败，无法加载解析结果')
  } finally {
    dpLoading.value = false
  }
}

// 仅单页/交叉审核类型有独立审核结果页，其他类型默认停留在本页展示「暂无审核结果」
const canAudit = computed(() =>
  ['single_page', 'cross_page'].includes(detail.value?.task_type)
)

function onTabClick(tab) {
  if (tab.paneName !== 'audit' || !canAudit.value) return
  const path =
    detail.value.task_type === 'cross_page'
      ? `/parse/cross-result/${route.params.id}`
      : `/parse/single-result/${route.params.id}`
  router.push(path)
}

// 解析成功后自动执行审核（接口在任务无分页时会先自动拆分）
async function maybeAutoAudit() {
  const t = detail.value
  if (t?.status !== 'success' || t?.task_type !== 'single_page') return
  const pagesRes = await request
    .get(`/dp/single-page/${route.params.id}/pages/`)
    .catch(() => null)
  const pages = pagesRes?.data?.pages || []
  if (pages.length) {
    // 已有分页：抽查首页，已有审核结果则不再重复审核
    const first = await request
      .get(`/dp/single-page/pages/${pages[0].id}/`)
      .catch(() => null)
    const ar = first?.data?.page?.audit_result
    if (ar && typeof ar === 'object' && Object.keys(ar).length) return
  }
  ElNotification({
    title: '自动审核中',
    message: '解析成功，正在自动拆分分页并逐页审核，完成后可在「审核结果」中查看',
    type: 'info',
    duration: 8000
  })
  ensureSinglePageAudit(route.params.id)
    .then(() => {
      ElNotification({
        title: '审核完成',
        message: '单页审核已完成，切换到「审核结果」即可查看',
        type: 'success',
        duration: 6000
      })
    })
    .catch(() => {})
}

const statusMeta = computed(
  () => STATUS_META[detail.value?.status] || STATUS_META.pending
)

function goBack() {
  router.push('/parse/history')
}

async function loadDetail() {
  loading.value = true
  try {
    const { data } = await request.get(`/dp/tasks/${route.params.id}/`)
    detail.value = data.task
    maybeAutoAudit()
    // loadDpResult() // 内嵌 DP 页面暂时隐藏，不再请求 token
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '加载任务详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadDetail)
</script>

<style scoped>
.parse-result {
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

.head-left {
  display: flex;
  align-items: center;
  gap: 14px;
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
}

.result-card {
  padding: 24px 28px 30px;
  min-height: 320px;
}

/* 任务信息条 */
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
  margin: 18px 0 20px;
}

/* DP 解析结果内嵌 */
.dp-embed {
  min-height: 400px;
}

.dp-iframe {
  width: 100%;
  height: 76vh;
  border: none;
  border-radius: 8px;
  background: #fff;
}
</style>
