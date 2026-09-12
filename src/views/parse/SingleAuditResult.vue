<template>
  <div class="single-audit-result">
    <!-- 页面标题区 -->
    <div class="page-head">
      <div class="head-left">
        <div class="back-btn" @click="goBack">
          <el-icon :size="16"><Back /></el-icon>
        </div>
        <div>
          <h1 class="page-title">单页审核结果</h1>
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
        {{ hasAnyResult ? '重新执行审核' : '执行审核' }}
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
          </div>
        </div>

        <div class="bar-divider"></div>

        <!-- 总体审核结论 -->
        <div class="overall-row">
          <span class="overall-label">总体审核结论</span>
          <span v-if="overallResult" class="overall-badge" :class="`is-${resultClass(overallResult)}`">
            <el-icon :size="18">
              <CircleCheckFilled v-if="overallResult === '通过'" />
              <WarningFilled v-else-if="overallResult === '存疑'" />
              <CircleCloseFilled v-else />
            </el-icon>
            {{ overallResult }}
          </span>
          <span v-else class="overall-none">尚未审核</span>
          <span class="overall-hint">（取各分页最差结论：不通过 &gt; 存疑 &gt; 通过）</span>
        </div>
      </template>
      <el-empty v-else description="未找到该任务" :image-size="90" />
    </div>

    <!-- 分页结果区 -->
    <div v-loading="detailsLoading" class="pages-area" element-loading-text="加载分页详情…">
      <template v-if="!loading">
        <!-- 尚未拆分分页：执行审核时自动拆分 -->
        <div v-if="!pages.length" class="page-card empty-card">
          <el-empty
            :description="auditing ? '正在自动拆分分页并逐页审核，请稍候…' : '该任务尚未执行审核'"
            :image-size="110"
          >
            <el-button
              type="primary"
              :icon="VideoPlay"
              :loading="auditing"
              :disabled="!!task && task.status !== 'success'"
              @click="runAudit"
            >
              {{ auditing ? '审核中' : '执行审核' }}
            </el-button>
            <p v-if="!auditing" class="empty-hint">将自动拆分分页，并逐页执行单页审核</p>
          </el-empty>
        </div>

        <template v-else>
          <!-- 全部未审核的引导空状态 -->
          <div v-if="!hasAnyResult && !detailsLoading" class="guide-banner">
            <el-icon :size="20"><InfoFilled /></el-icon>
            <span class="guide-text">该任务尚未执行单页审核，点击右侧按钮生成审核结果</span>
            <el-button type="primary" size="small" :loading="auditing" @click="runAudit">
              执行审核
            </el-button>
          </div>

          <!-- 每页一张卡片 -->
          <div v-for="row in pageRows" :key="row.id" class="page-card page-item">
            <div class="page-item-head">
              <span class="page-num">第 {{ row.page_num }} 页</span>
              <el-tag
                v-if="pageResult(row)"
                :type="resultTagType(pageResult(row))"
                effect="dark"
                size="small"
              >
                {{ pageResult(row) }}
              </el-tag>
              <el-tag v-else type="info" effect="plain" size="small">未审核</el-tag>
            </div>

            <div class="page-item-body">
              <!-- 页面渲染图 -->
              <div class="page-image">
                <el-image
                  v-if="pageImageSrc(row)"
                  :src="pageImageSrc(row)"
                  :preview-src-list="[pageImageSrc(row)]"
                  preview-teleported
                  fit="contain"
                  class="page-img"
                >
                  <template #error>
                    <div class="img-placeholder">
                      <el-icon :size="28"><Picture /></el-icon>
                      <span>图片加载失败</span>
                    </div>
                  </template>
                  <template #placeholder>
                    <div class="img-placeholder">
                      <el-icon :size="28" class="is-loading"><Loading /></el-icon>
                    </div>
                  </template>
                </el-image>
                <div v-else class="img-placeholder no-src">
                  <el-icon :size="28"><Picture /></el-icon>
                  <span>暂无页面图片</span>
                </div>
              </div>

              <!-- 审核结果 -->
              <div class="page-audit">
                <template v-if="hasResult(auditOf(row))">
                  <!-- 新格式：composition_result / seal_result -->
                  <template v-if="isNewFormat(auditOf(row))">
                    <!-- AUDIT-S01 试验数据×结果判定审核 -->
                    <div v-if="auditOf(row).composition_result" class="audit-block">
                      <div class="block-head">
                        <span class="block-title">
                          {{ auditOf(row).composition_result.audit_item || 'AUDIT-S01 试验数据×结果判定审核' }}
                        </span>
                        <el-tag
                          :type="resultTagType(auditOf(row).composition_result.result)"
                          effect="light"
                          size="small"
                        >
                          {{ auditOf(row).composition_result.result || '未知' }}
                        </el-tag>
                      </div>
                      <p v-if="auditOf(row).composition_result.reason" class="block-reason">
                        {{ auditOf(row).composition_result.reason }}
                      </p>

                      <!-- 判定范围表 -->
                      <template v-if="(auditOf(row).composition_result.elements || []).length">
                        <div class="sub-caption">判定范围</div>
                        <div class="sheet-scroll">
                          <table class="layout-table">
                            <thead>
                              <tr>
                                <th>元素</th>
                                <th>原始值</th>
                                <th>标准范围</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(el, ei) in auditOf(row).composition_result.elements" :key="ei">
                                <td>{{ el.element || '-' }}</td>
                                <td>{{ el.element_raw || '-' }}</td>
                                <td>{{ rangeText(el) || el.range_raw || '-' }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </template>

                      <!-- 数据行表 -->
                      <template v-if="(auditOf(row).composition_result.rows || []).length">
                        <div class="sub-caption">检测数据</div>
                        <div class="sheet-scroll">
                          <table class="layout-table">
                            <thead>
                              <tr>
                                <th>样品号</th>
                                <th v-for="col in compColumns(auditOf(row).composition_result)" :key="col">
                                  {{ col }}
                                </th>
                                <th>判定结果</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(r, ri) in auditOf(row).composition_result.rows" :key="ri">
                                <td>{{ r.sample_no || r.row || '-' }}</td>
                                <td
                                  v-for="col in compColumns(auditOf(row).composition_result)"
                                  :key="col"
                                  :class="cellClass(cellOf(r, col))"
                                >
                                  <div>{{ cellText(cellOf(r, col)) }}</div>
                                  <div v-if="cellOf(r, col)?.note" class="cell-note">
                                    {{ cellOf(r, col).note }}
                                  </div>
                                </td>
                                <td>
                                  <el-tag
                                    :type="rowVerdict(r).tagType"
                                    effect="light"
                                    size="small"
                                  >
                                    {{ rowVerdict(r).text }}
                                  </el-tag>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </template>

                      <!-- computed vs declared 结论对比 -->
                      <div
                        v-if="auditOf(row).composition_result.computed_conclusion || auditOf(row).composition_result.declared_conclusion"
                        class="conclusion-compare"
                        :class="{ mismatch: conclusionMismatch(auditOf(row).composition_result) }"
                      >
                        <template v-if="conclusionMismatch(auditOf(row).composition_result)">
                          <el-icon :size="15"><WarningFilled /></el-icon>
                        </template>
                        <span>
                          判定结论：{{ auditOf(row).composition_result.computed_conclusion || '未得出' }}
                          ｜文档声明：{{ auditOf(row).composition_result.declared_conclusion || auditOf(row).composition_result.declared_conclusion_raw || '未识别' }}
                        </span>
                        <span v-if="conclusionMismatch(auditOf(row).composition_result)" class="mismatch-tag">
                          结论不一致
                        </span>
                      </div>

                      <!-- OCR 修正说明 -->
                      <el-collapse
                        v-if="(auditOf(row).composition_result.notes || []).length"
                        class="notes-collapse"
                      >
                        <el-collapse-item
                          :title="`OCR 修正说明（${auditOf(row).composition_result.notes.length}）`"
                          name="comp-notes"
                        >
                          <ul class="notes-list">
                            <li v-for="(n, ni) in auditOf(row).composition_result.notes" :key="ni">{{ n }}</li>
                          </ul>
                        </el-collapse-item>
                      </el-collapse>
                    </div>

                    <!-- AUDIT-S02 签章审核 -->
                    <div v-if="auditOf(row).seal_result" class="audit-block">
                      <div class="block-head">
                        <span class="block-title">
                          {{ auditOf(row).seal_result.audit_item || 'AUDIT-S02 签章审核' }}
                        </span>
                        <el-tag
                          :type="resultTagType(auditOf(row).seal_result.result)"
                          effect="light"
                          size="small"
                        >
                          {{ auditOf(row).seal_result.result || '未知' }}
                        </el-tag>
                      </div>
                      <p v-if="auditOf(row).seal_result.reason" class="block-reason">
                        {{ auditOf(row).seal_result.reason }}
                      </p>

                      <!-- 是否检测到章印 -->
                      <div class="seal-stamped">
                        <el-tag
                          v-if="auditOf(row).seal_result.image_detection?.stamped === true"
                          type="success"
                          effect="light"
                          size="small"
                        >
                          检测到章印
                        </el-tag>
                        <el-tag
                          v-else-if="auditOf(row).seal_result.image_detection?.stamped === false"
                          type="info"
                          effect="light"
                          size="small"
                        >
                          未检测到章印
                        </el-tag>
                      </div>

                      <!-- 需要的签章 -->
                      <template v-if="(auditOf(row).seal_result.required_seals || []).length">
                        <div class="sub-caption">需要的签章</div>
                        <div class="seal-list">
                          <div
                            v-for="(s, si) in auditOf(row).seal_result.required_seals"
                            :key="si"
                            class="seal-item"
                          >
                            <el-icon :size="14"><Stamp /></el-icon>
                            <span class="seal-placeholder">{{ s.placeholder }}</span>
                            <span v-if="(s.keywords || []).length" class="seal-keywords">
                              关键词：{{ s.keywords.join('、') }}
                            </span>
                          </div>
                        </div>
                      </template>

                      <!-- 找到的签章 -->
                      <template v-if="(auditOf(row).seal_result.found_seals || []).length">
                        <div class="sub-caption">找到的签章</div>
                        <div class="seal-list">
                          <div
                            v-for="(s, si) in auditOf(row).seal_result.found_seals"
                            :key="si"
                            class="seal-item found"
                          >
                            <el-icon :size="14"><CircleCheck /></el-icon>
                            <span v-if="s.via === 'image_detection'">
                              图像检测 · {{ s.color || '未知颜色' }}
                            </span>
                            <span v-else-if="s.via === 'text_layer'">
                              文本层 · “{{ s.text }}”
                            </span>
                            <span v-else>{{ s.via || '未知来源' }}</span>
                          </div>
                        </div>
                      </template>

                      <!-- 签章备注 -->
                      <el-collapse
                        v-if="(auditOf(row).seal_result.notes || []).length"
                        class="notes-collapse"
                      >
                        <el-collapse-item
                          :title="`备注说明（${auditOf(row).seal_result.notes.length}）`"
                          name="seal-notes"
                        >
                          <ul class="notes-list">
                            <li v-for="(n, ni) in auditOf(row).seal_result.notes" :key="ni">{{ n }}</li>
                          </ul>
                        </el-collapse-item>
                      </el-collapse>
                    </div>
                  </template>

                  <!-- 旧格式：{ items, result } -->
                  <template v-else-if="Array.isArray(auditOf(row).items)">
                    <div class="audit-block">
                      <div class="sub-caption">审核项</div>
                      <div
                        v-for="(item, ii) in auditOf(row).items"
                        :key="ii"
                        class="legacy-item"
                      >
                        <table v-if="isPlainObject(item)" class="layout-table kv-table">
                          <tbody>
                            <tr v-for="(v, k) in item" :key="k">
                              <td class="kv-key">{{ k }}</td>
                              <td class="cell-left">{{ formatValue(v) }}</td>
                            </tr>
                          </tbody>
                        </table>
                        <p v-else class="legacy-text">{{ formatValue(item) }}</p>
                      </div>
                    </div>
                  </template>

                  <!-- 非空但结构无法识别 -->
                  <div v-else class="empty-note">审核结果格式无法解析</div>
                </template>
                <div v-else class="empty-note">该页暂无审核结果</div>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>
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
  Picture,
  Loading,
  InfoFilled,
  Stamp,
  CircleCheck,
  CircleCheckFilled,
  CircleCloseFilled,
  WarningFilled
} from '@element-plus/icons-vue'
import request from '../../api/request'
import { ensureSinglePageAudit } from '../../api/audit'
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
const detailsLoading = ref(false)
const auditing = ref(false)

const task = ref(null)
const pages = ref([])
// 以分页 id 为键的详情（含 content / audit_result）
const details = ref({})

const statusMeta = computed(() => STATUS_META[task.value?.status] || STATUS_META.pending)

const pageRows = computed(() =>
  pages.value.map((p) => ({ ...p, detail: details.value[p.id] || null }))
)

// ---------- 审核结果工具函数 ----------
const RESULT_RANK = { 通过: 1, 存疑: 2, 不通过: 3 }

function hasResult(ar) {
  return !!ar && typeof ar === 'object' && !Array.isArray(ar) && Object.keys(ar).length > 0
}

function auditOf(row) {
  return row.detail?.audit_result ?? null
}

function pageResult(row) {
  const r = auditOf(row)?.result
  return RESULT_RANK[r] ? r : null
}

function isNewFormat(ar) {
  return hasResult(ar) && (!!ar.composition_result || !!ar.seal_result)
}

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

const hasAnyResult = computed(() => pageRows.value.some((r) => hasResult(auditOf(r))))

const overallResult = computed(() => {
  let worst = null
  pageRows.value.forEach((r) => {
    const res = pageResult(r)
    if (res && (!worst || RESULT_RANK[res] > RESULT_RANK[worst])) worst = res
  })
  return worst
})

// ---------- composition_result 渲染辅助 ----------
function rangeText(el) {
  const range = el?.range
  if (Array.isArray(range) && range.length === 2) {
    const lo = range[0] ?? '-∞'
    const hi = range[1] ?? '+∞'
    return `${lo} ~ ${hi}`
  }
  return ''
}

function compColumns(comp) {
  const names = []
  const seen = new Set()
  const push = (n) => {
    if (n && !seen.has(n)) {
      seen.add(n)
      names.push(n)
    }
  }
  ;(comp?.elements || []).forEach((e) => push(e?.element))
  ;(comp?.rows || []).forEach((r) => (r?.values || []).forEach((v) => push(v?.element)))
  return names
}

function cellOf(row, name) {
  return (row?.values || []).find((v) => v?.element === name) || null
}

function cellText(cell) {
  if (!cell) return '-'
  return cell.value_raw ?? cell.value ?? '-'
}

function cellClass(cell) {
  if (!cell) return 'cell-na'
  if (cell.qualified === false) return 'cell-bad'
  if (cell.qualified === null || cell.qualified === undefined) return 'cell-na'
  return ''
}

function conclusionMismatch(comp) {
  const c = comp?.computed_conclusion
  const d = comp?.declared_conclusion
  return !!c && !!d && c !== d
}

// 行级判定：任一值超区间 -> 不通过；存在无法判定 -> 存疑；否则通过
function rowVerdict(r) {
  const values = r?.values || []
  if (values.some((v) => v?.qualified === false)) {
    return { text: '不通过', tagType: 'danger' }
  }
  if (!values.length || values.some((v) => v?.qualified === null || v?.qualified === undefined)) {
    return { text: '存疑', tagType: 'warning' }
  }
  return { text: '通过', tagType: 'success' }
}

// ---------- 旧格式渲染辅助 ----------
function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function formatValue(v) {
  if (v === null || v === undefined || v === '') return '-'
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

// ---------- 图片路径 ----------
function pageImageSrc(row) {
  const p = row.detail?.page_file_path || row.page_file_path
  if (!p) return ''
  return p.startsWith('/') ? p : `/media/${p}`
}

// ---------- 数据加载 ----------
async function loadAll() {
  loading.value = true
  try {
    const [taskRes, pagesRes] = await Promise.all([
      request.get(`/dp/tasks/${taskId}/`),
      // 未拆分分页时接口可能报错，容错为空列表
      request.get(`/dp/single-page/${taskId}/pages/`).catch(() => null)
    ])
    task.value = taskRes.data.task
    pages.value = pagesRes?.data?.pages || []
    loading.value = false
    if (pages.value.length) {
      loadPageDetails()
    } else if (task.value?.status === 'success' && task.value?.task_type === 'single_page') {
      // 仅单页审核类型解析成功且尚未审核时自动执行（接口会先自动拆分分页），其他类型暂不处理
      runAudit()
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '加载任务信息失败')
    loading.value = false
  }
}

async function loadPageDetails() {
  detailsLoading.value = true
  try {
    const results = await Promise.all(
      pages.value.map((p) =>
        request
          .get(`/dp/single-page/pages/${p.id}/`)
          .then((r) => r.data.page)
          .catch(() => null)
      )
    )
    const map = {}
    results.forEach((pg) => {
      if (pg && pg.id != null) map[pg.id] = pg
    })
    details.value = map
  } finally {
    detailsLoading.value = false
  }
}

async function runAudit() {
  if (auditing.value) return
  if (task.value && task.value.task_type !== 'single_page') return
  auditing.value = true
  try {
    // 审核可能较慢，单独放大超时时间；任务无分页时接口会自动拆分
    const { data } = await ensureSinglePageAudit(taskId)
    // 自动拆分场景：补充分页列表与页面详情，再叠加审核结果
    if (!pages.value.length) {
      const pagesRes = await request
        .get(`/dp/single-page/${taskId}/pages/`)
        .catch(() => null)
      pages.value = pagesRes?.data?.pages || []
      await loadPageDetails()
    }
    const byId = {}
    ;(data.pages || []).forEach((p) => {
      if (p.page_id != null) byId[p.page_id] = p.audit_result
    })
    const map = { ...details.value }
    Object.entries(byId).forEach(([pid, ar]) => {
      map[pid] = { ...(map[pid] || {}), audit_result: ar }
    })
    details.value = map
    ElMessage.success(`审核完成，总体结论：${data.result || '-'}`)
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
</script>

<style scoped>
.single-audit-result {
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

/* 分页区 */
.pages-area {
  min-height: 120px;
}

.empty-card {
  padding: 30px;
}

.empty-hint {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--ink-300);
}

.guide-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: #f4f6ff;
  border: 1px solid rgba(79, 110, 247, 0.28);
  color: var(--brand-500);
}

.guide-text {
  flex: 1;
  font-size: 13.5px;
  font-weight: 600;
}

/* 每页卡片 */
.page-item {
  padding: 20px 24px 24px;
  margin-bottom: 20px;
}

.page-item-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.page-num {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink-900);
}

.page-item-body {
  display: flex;
  gap: 22px;
  align-items: flex-start;
}

/* 页面图片 */
.page-image {
  width: 560px;
  flex-shrink: 0;
  border: 1px solid #e9ecf5;
  border-radius: 12px;
  background: #f7f8fc;
  overflow: hidden;
}

.page-img {
  width: 100%;
  height: 792px;
  display: block;
}

.img-placeholder {
  width: 100%;
  height: 792px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--ink-300);
  font-size: 13px;
}

/* 审核结果 */
.page-audit {
  flex: 1;
  min-width: 0;
}

.audit-block {
  border: 1px solid #eef0f7;
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 14px;
  background: #fff;
}

.audit-block:last-child {
  margin-bottom: 0;
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

/* 表格 */
.sheet-scroll {
  overflow-x: auto;
  border-radius: 10px;
}

.layout-table {
  border-collapse: collapse;
  min-width: 100%;
  font-size: 13px;
  color: var(--ink-900);
  background: #fff;
}

.layout-table th,
.layout-table td {
  border: 1px solid #d8dce8;
  padding: 8px 14px;
  text-align: center;
  line-height: 1.6;
  white-space: nowrap;
}

.layout-table th {
  font-weight: 600;
  background: #f7f8fd;
  color: var(--ink-600);
  font-size: 12.5px;
}

.layout-table td.cell-left {
  text-align: left;
}

.layout-table td.cell-bad {
  background: #fdecec;
  color: #e03131;
  font-weight: 700;
}

.layout-table td.cell-na {
  background: #f7f8fc;
  color: var(--ink-300);
}

.cell-note {
  font-size: 11.5px;
  font-weight: 400;
  color: var(--ink-400);
  white-space: normal;
}

/* 结论对比条 */
.conclusion-compare {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding: 9px 14px;
  border-radius: 9px;
  font-size: 13px;
  background: #f7f8fd;
  border: 1px solid #eef0f7;
  color: var(--ink-600);
}

.conclusion-compare.mismatch {
  background: #fdecec;
  border-color: #f5c2c2;
  color: #e03131;
  font-weight: 600;
}

.mismatch-tag {
  padding: 1px 8px;
  border-radius: 6px;
  background: #e03131;
  color: #fff;
  font-size: 12px;
}

/* 备注折叠 */
.notes-collapse {
  margin-top: 12px;
  border-top: none;
  border-bottom: none;
}

.notes-collapse :deep(.el-collapse-item__header) {
  font-size: 12.5px;
  color: var(--ink-400);
  height: 36px;
}

.notes-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.notes-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--ink-400);
}

/* 签章 */
.seal-stamped {
  margin-top: 10px;
}

.seal-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.seal-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-600);
  padding: 7px 12px;
  border-radius: 8px;
  background: #f7f8fd;
  border: 1px solid #eef0f7;
}

.seal-item.found {
  color: #2f9e44;
  background: #e9f7ee;
  border-color: #b7e4c7;
}

.seal-placeholder {
  font-weight: 600;
  color: var(--ink-900);
}

.seal-keywords {
  font-size: 12px;
  color: var(--ink-400);
}

/* 旧格式 */
.legacy-item {
  margin-bottom: 12px;
}

.legacy-item:last-child {
  margin-bottom: 0;
}

.kv-table td {
  text-align: left;
  white-space: normal;
}

.kv-table .kv-key {
  width: 140px;
  font-weight: 600;
  background: #f7f8fd;
  color: var(--ink-600);
}

.legacy-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-600);
}

.empty-note {
  padding: 28px 0;
  text-align: center;
  font-size: 13.5px;
  color: var(--ink-300);
}

/* 窄屏适配：图片堆叠到上方 */
@media (max-width: 900px) {
  .page-item-body {
    flex-direction: column;
  }

  .page-image {
    width: 100%;
    max-width: 640px;
  }
}
</style>
