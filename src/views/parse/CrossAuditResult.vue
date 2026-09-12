<template>
  <div class="cross-audit-result">
    <!-- 页面标题区 -->
    <div class="page-head">
      <div class="head-left">
        <div class="back-btn" @click="goBack">
          <el-icon :size="16"><Back /></el-icon>
        </div>
        <div>
          <h1 class="page-title">交叉审核结果</h1>
          <p class="page-desc">
            {{ task?.file_name || '加载中…' }}<template v-if="task?.file_name"> · </template>任务ID：{{ taskId }}
          </p>
        </div>
      </div>
      <el-button type="primary" :icon="VideoPlay" :loading="comparing" @click="openCompareDialog">
        {{ crossReview ? '重新比对' : '执行比对' }}
      </el-button>
    </div>

    <!-- 结果切换：审核结果 / 解析结果（解析结果标签页暂时隐藏） -->
    <el-tabs model-value="audit" class="result-tabs" @tab-click="onTabClick">
      <el-tab-pane label="审核结果" name="audit" />
      <!-- <el-tab-pane label="解析结果" name="parse" /> -->
    </el-tabs>

    <!-- 任务信息卡 -->
    <div v-loading="loading" class="page-card info-card">
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
            <span v-if="crossReview?.updated_at" class="meta-item">
              比对更新时间：{{ crossReview.updated_at }}
            </span>
          </div>
        </div>

        <div class="bar-divider"></div>

        <!-- 总体比对结论 -->
        <div class="overall-row">
          <span class="overall-label">总体比对结论</span>
          <span v-if="overallResult" class="overall-badge" :class="`is-${resultClass(overallResult)}`">
            <el-icon :size="18">
              <CircleCheckFilled v-if="overallResult === '通过'" />
              <WarningFilled v-else-if="overallResult === '存疑'" />
              <CircleCloseFilled v-else />
            </el-icon>
            {{ overallResult }}
          </span>
          <span v-else class="overall-none">未比对</span>
          <span class="overall-hint">（AUDIT-02 执行标准一致性比对：两侧执行标准归一化后集合一致即为通过）</span>
        </div>
      </template>
      <el-empty v-else description="未找到该任务" :image-size="90" />
    </div>

    <!-- 比对结果区 -->
    <div v-loading="loading" class="compare-area" element-loading-text="加载比对详情…">
      <template v-if="!loading">
        <!-- 尚未比对：引导空状态 -->
        <div v-if="!crossReview" class="page-card empty-card">
          <el-empty description="该任务尚未执行交叉比对" :image-size="110">
            <el-button type="primary" :icon="VideoPlay" :loading="comparing" @click="openCompareDialog">
              执行比对
            </el-button>
          </el-empty>
        </div>

        <template v-else>
          <!-- 审核项卡片 -->
          <div class="page-card compare-card">
            <div class="block-head">
              <span class="block-title">
                {{ compareResult?.audit_item || 'AUDIT-02 执行标准一致性比对' }}
              </span>
              <el-tag :type="resultTagType(overallResult)" effect="light" size="small">
                {{ overallResult || '未知' }}
              </el-tag>
            </div>
            <p v-if="compareResult?.reason" class="block-reason">{{ compareResult.reason }}</p>

            <!-- 双栏对比视图 -->
            <div class="dual-cols">
              <div
                v-for="col in dualColumns"
                :key="col.key"
                class="doc-col"
                :class="{ 'is-empty': !col.standards.length }"
              >
                <div class="doc-col-head">
                  <el-icon :size="16"><Document /></el-icon>
                  <span class="doc-name">{{ col.title }}</span>
                  <span class="doc-cells">识别单元格 {{ col.cellCount ?? '-' }}</span>
                </div>

                <template v-if="col.standards.length">
                  <div
                    v-for="(s, si) in col.standards"
                    :key="si"
                    class="std-card"
                  >
                    <div class="std-main">
                      <span class="std-normalized">{{ s.normalized || s.raw || '-' }}</span>
                      <el-tag
                        v-if="s.raw && s.normalized && s.raw.trim() !== s.normalized"
                        type="warning"
                        effect="plain"
                        size="small"
                      >
                        OCR 修正
                      </el-tag>
                    </div>
                    <div v-if="s.raw" class="std-raw">OCR 原文：{{ s.raw }}</div>
                    <div class="std-meta">
                      <el-tag :type="viaTagType(s.via)" effect="light" size="small">
                        {{ viaLabel(s.via) }}
                      </el-tag>
                      <span v-if="s.x != null || s.y != null" class="std-coord">
                        坐标 ({{ s.x ?? '-' }}, {{ s.y ?? '-' }})
                      </span>
                    </div>
                  </div>
                </template>
                <div v-else class="std-empty">
                  <el-icon :size="16"><WarningFilled /></el-icon>
                  <span>未提取到执行标准</span>
                </div>
              </div>
            </div>

            <!-- 一致性对比条 -->
            <div class="compare-bar" :class="compareBarClass">
              <el-icon :size="15">
                <CircleCheckFilled v-if="overallResult === '通过'" />
                <WarningFilled v-else-if="overallResult === '存疑'" />
                <CircleCloseFilled v-else />
              </el-icon>
              <template v-if="overallResult === '通过'">
                <span>
                  两侧标准一致：<b>{{ comparisonSets.report.join('、') || comparisonSets.certificate.join('、') || '-' }}</b>
                </span>
              </template>
              <template v-else-if="overallResult === '不通过'">
                <span>两侧标准不一致：</span>
                <span class="cmp-side">报告单 {{ formatSet(comparisonSets.report) }}</span>
                <span class="cmp-side">证明书 {{ formatSet(comparisonSets.certificate) }}</span>
              </template>
              <template v-else>
                <span>任一侧未提取到执行标准，建议人工复核：</span>
                <span class="cmp-side">报告单 {{ formatSet(comparisonSets.report) }}</span>
                <span class="cmp-side">证明书 {{ formatSet(comparisonSets.certificate) }}</span>
              </template>
            </div>

            <!-- 关联任务 -->
            <template v-if="extractedInfo">
              <div class="sub-caption">关联任务</div>
              <el-descriptions :column="2" border size="small" class="rel-desc">
                <el-descriptions-item label="报告单任务ID">
                  {{ extractedInfo.report_task_id ?? '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="证明书任务ID">
                  {{ extractedInfo.certificate_task_id ?? '-' }}
                </el-descriptions-item>
              </el-descriptions>
            </template>
          </div>
        </template>
      </template>
    </div>

    <!-- 执行比对对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="crossReview ? '重新执行比对' : '执行比对'"
      width="420px"
      :close-on-click-modal="!comparing"
      :close-on-press-escape="!comparing"
      :show-close="!comparing"
    >
      <el-form label-position="top">
        <el-form-item label="证明书任务ID" required :error="certIdError">
          <el-input-number
            v-model="certTaskId"
            :min="1"
            :step="1"
            step-strictly
            :disabled="comparing"
            placeholder="请输入产品质量证明书的任务ID"
            style="width: 100%"
            controls-position="right"
          />
        </el-form-item>
        <p class="dialog-hint">
          将以当前任务（ID：{{ taskId }}）作为报告单，与指定证明书任务进行执行标准一致性比对，耗时可能较长。
        </p>
      </el-form>
      <template #footer>
        <el-button :disabled="comparing" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="comparing" @click="runCompare">
          {{ comparing ? '比对中…' : '开始比对' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Back,
  Folder,
  VideoPlay,
  Document,
  CircleCheckFilled,
  CircleCloseFilled,
  WarningFilled
} from '@element-plus/icons-vue'
import request from '../../api/request'
import { STATUS_META } from '../../constants'

const route = useRoute()
const router = useRouter()

const taskId = route.params.id

function onTabClick(tab) {
  if (tab.paneName === 'parse') {
    router.push(`/parse/result/${taskId}`)
  }
}

const loading = ref(false)
const comparing = ref(false)

const task = ref(null)

const dialogVisible = ref(false)
const certTaskId = ref(null)
const certIdError = ref('')

const statusMeta = computed(() => STATUS_META[task.value?.status] || STATUS_META.pending)

// 交叉审核数据（可能为 null）
const crossReview = computed(() => task.value?.cross_review || null)
const compareResult = computed(() => crossReview.value?.compare_result || null)
const extractedInfo = computed(() => crossReview.value?.extracted_info || null)

// 结论工具
const RESULT_RANK = { 通过: 1, 存疑: 2, 不通过: 3 }

const overallResult = computed(() => {
  const r = compareResult.value?.result
  return RESULT_RANK[r] ? r : null
})

function resultTagType(r) {
  if (r === '通过') return 'success'
  if (r === '存疑') return 'warning'
  if (r === '不通过') return 'danger'
  return 'info'
}

function resultClass(r) {
  if (r === '通过') return 'pass'
  if (r === '存疑') return 'warn'
  if (r === '不通过') return 'fail'
  return 'none'
}

// 双栏文档数据（键名固定为中文，防御性读取）
const DOC_KEYS = [
  { key: 'report', title: '材料化学分析结果报告单', docKeys: ['材料化学分析结果报告单', '报告单'] },
  { key: 'certificate', title: '产品质量证明书', docKeys: ['产品质量证明书', '证明书'] }
]

function pickDocument(obj, keys) {
  if (!obj || typeof obj !== 'object') return null
  for (const k of keys) {
    if (obj[k] && typeof obj[k] === 'object') return obj[k]
  }
  return null
}

const dualColumns = computed(() => {
  const docs = compareResult.value?.documents || {}
  return DOC_KEYS.map((d) => {
    const doc = pickDocument(docs, d.docKeys)
    return {
      key: d.key,
      title: d.title,
      cellCount: doc?.cell_count ?? null,
      standards: Array.isArray(doc?.standards_found) ? doc.standards_found : []
    }
  })
})

// 一致性对比数据
const comparisonSets = computed(() => {
  const cmp = compareResult.value?.comparison || {}
  const pick = (keys) => {
    for (const k of keys) {
      if (Array.isArray(cmp[k])) return cmp[k]
    }
    return []
  }
  return {
    report: pick(['报告单', '材料化学分析结果报告单']),
    certificate: pick(['证明书', '产品质量证明书'])
  }
})

function formatSet(list) {
  return list.length ? list.join('、') : '（未提取到）'
}

const compareBarClass = computed(() => {
  if (overallResult.value === '通过') return 'is-pass'
  if (overallResult.value === '不通过') return 'is-fail'
  return 'is-warn'
})

// 提取方式映射
const VIA_META = {
  same_cell: { label: '同格提取', tagType: 'success' },
  same_row_cell: { label: '同行提取', tagType: 'primary' },
  fallback_scan: { label: '全文兜底', tagType: 'info' }
}

function viaLabel(via) {
  return VIA_META[via]?.label || via || '未知方式'
}

function viaTagType(via) {
  return VIA_META[via]?.tagType || 'info'
}

// ---------- 数据加载 ----------
async function loadTask() {
  loading.value = true
  try {
    const { data } = await request.get(`/dp/tasks/${taskId}/`)
    task.value = data.task
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '加载任务信息失败')
  } finally {
    loading.value = false
  }
}

// ---------- 执行比对 ----------
function openCompareDialog() {
  certIdError.value = ''
  // 重新比对时默认带出上次的证明书任务ID
  certTaskId.value = extractedInfo.value?.certificate_task_id ?? null
  dialogVisible.value = true
}

function isComparePayload(d) {
  return !!d && typeof d === 'object' && (!!d.audit_item || !!d.compare_result || !!d.cross_review_id)
}

async function runCompare() {
  if (!certTaskId.value) {
    certIdError.value = '请输入证明书任务ID'
    return
  }
  certIdError.value = ''
  comparing.value = true
  try {
    // 比对可能较慢，单独放大超时时间
    const { data } = await request.post(
      '/dp/compare/exec-standard/',
      { report_id: Number(taskId), certificate_id: certTaskId.value },
      { timeout: 300000 }
    )
    dialogVisible.value = false
    await loadTask()
    ElMessage.success(`比对完成，结论：${data?.result || overallResult.value || '-'}`)
  } catch (e) {
    // 结论为“存疑”时后端返回 422，但 body 仍是正常的比对结果，按成功处理
    if (e.response?.status === 422 && isComparePayload(e.response.data)) {
      dialogVisible.value = false
      await loadTask()
      ElMessage.warning(`比对完成，结论：${e.response.data.result || '存疑'}，建议人工复核`)
    } else {
      ElMessage.error(e.response?.data?.detail || '执行比对失败，请稍后重试')
    }
  } finally {
    comparing.value = false
  }
}

function goBack() {
  router.push('/parse/history')
}

onMounted(loadTask)
</script>

<style scoped>
.cross-audit-result {
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

.overall-none {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink-300);
}

.overall-hint {
  font-size: 12px;
  color: var(--ink-300);
}

/* 比对区 */
.compare-area {
  min-height: 120px;
}

.empty-card {
  padding: 30px;
}

.compare-card {
  padding: 20px 24px 24px;
  margin-bottom: 20px;
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.block-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink-900);
}

.block-reason {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-600);
}

.sub-caption {
  margin: 14px 0 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-400);
}

/* 双栏对比视图 */
.dual-cols {
  display: flex;
  gap: 18px;
  margin-top: 16px;
}

.doc-col {
  flex: 1;
  min-width: 0;
  border: 1px solid #eef0f7;
  border-radius: 12px;
  padding: 14px 16px;
  background: #fff;
}

.doc-col.is-empty {
  border-color: #f3d9a4;
  background: #fffdf7;
}

.doc-col-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px dashed #eef0f7;
  color: var(--brand-500);
}

.doc-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink-900);
  flex: 1;
  min-width: 0;
}

.doc-cells {
  font-size: 12px;
  color: var(--ink-300);
  white-space: nowrap;
}

/* 标准命中卡 */
.std-card {
  border: 1px solid #eef0f7;
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 10px;
  background: #f7f8fd;
}

.std-card:last-child {
  margin-bottom: 0;
}

.std-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.std-normalized {
  font-size: 16px;
  font-weight: 800;
  color: var(--ink-900);
  letter-spacing: 0.3px;
}

.std-raw {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-400);
  word-break: break-all;
}

.std-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.std-coord {
  font-size: 12px;
  color: var(--ink-300);
}

.std-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 22px 0;
  font-size: 13px;
  font-weight: 600;
  color: #d9850a;
}

/* 一致性对比条 */
.compare-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding: 10px 16px;
  border-radius: 9px;
  font-size: 13px;
}

.compare-bar.is-pass {
  background: #e9f7ee;
  border: 1px solid #b7e4c7;
  color: #2f9e44;
}

.compare-bar.is-fail {
  background: #fdecec;
  border: 1px solid #f5c2c2;
  color: #e03131;
  font-weight: 600;
}

.compare-bar.is-warn {
  background: #fdf3e3;
  border: 1px solid #f3d9a4;
  color: #d9850a;
}

.cmp-side {
  padding: 1px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

/* 关联任务描述 */
.rel-desc {
  margin-bottom: 4px;
}

.rel-desc :deep(.el-descriptions__label) {
  color: var(--ink-400);
}

/* 对话框 */
.dialog-hint {
  margin: 4px 0 0;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-400);
}

/* 窄屏适配：双栏堆叠 */
@media (max-width: 900px) {
  .dual-cols {
    flex-direction: column;
  }
}
</style>
