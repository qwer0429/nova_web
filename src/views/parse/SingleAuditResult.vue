<template>
  <div class="single-audit-result">
    <!-- 吸顶区：页面标题 + 结果切换 -->
    <div class="sticky-head">
      <!-- 页面标题区 -->
      <div class="page-head">
        <div class="head-left">
          <div class="back-btn" @click="goBack">
            <el-icon :size="16"><Back /></el-icon>
          </div>
          <div>
            <h1 class="page-title">报告单审核结果</h1>
            <p class="page-desc">
              {{ task?.file_name || '加载中…' }}<template v-if="task?.file_name"> · </template>任务ID：{{ taskId }}
            </p>
          </div>
        </div>
        <el-button
          type="primary"
          :icon="VideoPlay"
          :loading="busy"
          :disabled="!!task && !canRunAudit"
          @click="runAudit"
        >
          {{ hasResult ? '重新执行审核' : '执行审核' }}
        </el-button>
      </div>

      <!-- 结果切换：审核结果 / 查看版面 -->
      <el-tabs v-model="activeTab" class="result-tabs">
        <el-tab-pane label="审核结果" name="audit" />
        <el-tab-pane label="查看版面" name="layout" />
      </el-tabs>
    </div>

    <!-- 查看版面：渲染 task.table_json_to_html_fix，无值时回退 table_json_to_html -->
    <div v-show="activeTab === 'layout'" class="page-card layout-card">
      <div v-if="layoutHtml" class="layout-content" v-html="layoutHtml"></div>
      <el-empty v-else description="暂无版面数据" :image-size="100" />
    </div>

    <!-- 审核结果区：左原文件，右审核结果 -->
    <div
      v-show="activeTab === 'audit'"
      v-loading="auditing"
      class="split-area"
      element-loading-text="正在执行报告单审核，请稍候…"
    >
      <!-- 原文件 -->
      <div class="file-pane page-card">
        <div class="pane-title">原文件</div>
        <p v-if="isImageFile && hasResult" class="pane-tip">
          点击右侧审核单元的样品 / 标准值 / 实测值可精确高亮对应单元格，点击定位按钮高亮整行
        </p>
        <template v-if="fileSrc">
          <div v-if="isImageFile" class="file-stage">
            <el-image
              :src="fileSrc"
              :preview-src-list="[fileSrc]"
              preview-teleported
              fit="contain"
              class="file-img"
              @load="onImgLoad"
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
            <div
              v-for="(box, bi) in highlightBoxes"
              :key="`c${bi}`"
              class="hl-box"
              :style="box"
            ></div>
          </div>
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
        <!-- 任务信息卡（含总体结论与统计） -->
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
              <span class="overall-hint">（任一审核项不通过 → 不通过；有存疑 → 存疑；否则通过）</span>
            </div>

            <!-- 数据审核统计 -->
            <div v-if="compStats" class="stats-row">
              <span class="stat-chip is-total">审核单元 {{ compStats.总数 ?? 0 }}</span>
              <span class="stat-chip is-pass">合格 {{ compStats.合格 ?? 0 }}</span>
              <span class="stat-chip is-fail">不合格 {{ compStats.不合格 ?? 0 }}</span>
              <span class="stat-chip is-none">无法判定 {{ compStats.无法判定 ?? 0 }}</span>
            </div>
          </template>
          <el-empty v-else description="未找到该任务" :image-size="90" />
        </div>

        <template v-if="!loading">
          <!-- 尚未审核 -->
          <div v-if="!hasResult" class="page-card empty-card">
            <el-empty :description="emptyDesc" :image-size="110">
              <el-button
                v-if="canRunAudit"
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
            <!-- AUDIT-S01 数据审核 -->
            <div v-if="comp" class="page-card audit-block">
              <div class="block-head">
                <span class="block-title">{{ comp.audit_item || 'AUDIT-S01 数据审核' }}</span>
                <el-tag :type="resultTagType(comp.result)" effect="dark" size="small">
                  {{ comp.result || '未知' }}
                </el-tag>
              </div>
              <p v-if="comp.reason" class="block-reason">{{ comp.reason }}</p>

              <!-- 判定筛选 -->
              <div v-if="units.length" class="filter-row">
                <span class="filter-label">判定筛选</span>
                <el-radio-group v-model="verdictFilter" size="small">
                  <el-radio-button value="">全部（{{ units.length }}）</el-radio-button>
                  <el-radio-button v-for="v in VERDICTS" :key="v" :value="v">
                    {{ v }}（{{ verdictCount(v) }}）
                  </el-radio-button>
                </el-radio-group>
              </div>

              <!-- 审核单元卡片 -->
              <template v-if="units.length">
                <div
                  v-for="({ u, i }) in filteredUnits"
                  :key="i"
                  class="unit-card"
                  :class="{ 'is-active': isUnitActive(i) }"
                >
                  <div class="item-head">
                    <span class="item-index">#{{ i + 1 }}</span>
                    <span class="item-name">
                      <span
                        class="locatable"
                        :class="{ 'is-active': isFieldActive(i, u.样品) }"
                        @click="locateField(u, i, u.样品)"
                      >
                        {{ u.样品 || '-' }}
                      </span>
                      <template v-if="u.元素"> · {{ u.元素 }}</template>
                    </span>
                    <span
                      v-if="unitCells(u).length"
                      class="locate-btn"
                      :class="{ 'is-active': isUnitActive(i) }"
                      @click="locateUnit(u, i)"
                    >
                      <el-icon :size="13"><Position /></el-icon>
                      定位
                    </span>
                    <el-tag
                      :type="unitTagType(u.判定)"
                      effect="dark"
                      size="small"
                      class="item-verdict"
                    >
                      {{ u.判定 || '未知' }}
                    </el-tag>
                  </div>

                  <table class="layout-table kv-table">
                    <tbody>
                      <tr>
                        <td class="kv-key">标准值</td>
                        <td class="cell-left">
                          <span
                            class="locatable"
                            :class="{ 'is-active': isFieldActive(i, u.标准值) }"
                            @click="locateField(u, i, u.标准值)"
                          >
                            {{ u.标准值 || '-' }}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td class="kv-key">实测值</td>
                        <td class="cell-left">
                          <span
                            class="value-chip locatable"
                            :class="{ 'is-active': isFieldActive(i, u.实测值) }"
                            @click="locateField(u, i, u.实测值)"
                          >
                            {{ u.实测值 || '-' }}
                          </span>
                        </td>
                      </tr>
                      <tr v-if="u.依据">
                        <td class="kv-key">判定依据</td>
                        <td class="cell-left">{{ u.依据 }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <el-empty
                  v-if="!filteredUnits.length"
                  description="当前筛选条件下没有审核单元"
                  :image-size="80"
                />
              </template>
              <div v-else class="empty-note">未提取到审核单元</div>
            </div>

            <!-- AUDIT-S02 签章审核 -->
            <div v-if="seal" class="page-card audit-block">
              <div class="block-head">
                <span class="block-title">{{ seal.audit_item || 'AUDIT-S02 签章审核' }}</span>
                <el-tag :type="resultTagType(seal.result)" effect="dark" size="small">
                  {{ seal.result || '未知' }}
                </el-tag>
              </div>
              <p v-if="seal.reason" class="block-reason">{{ seal.reason }}</p>

              <!-- VLM 检测结果 -->
              <div class="seal-stamped">
                <el-tag
                  v-if="seal.vlm_detection?.has_seal === true"
                  type="success"
                  effect="light"
                  size="small"
                >
                  VLM 检测到章印
                </el-tag>
                <el-tag
                  v-else-if="seal.vlm_detection?.has_seal === false"
                  type="info"
                  effect="light"
                  size="small"
                >
                  VLM 未检测到章印
                </el-tag>
                <el-tag v-else type="warning" effect="light" size="small">
                  是否盖章无法确认
                </el-tag>
                <span v-if="seal.audit_region" class="seal-region-hint">
                  已按判定列区域过滤签章
                </span>
              </div>

              <!-- 有效签章 -->
              <template v-if="(seal.found_seals || []).length">
                <div class="sub-caption">有效签章（{{ seal.found_seals.length }}）</div>
                <div class="seal-list">
                  <div
                    v-for="(s, si) in seal.found_seals"
                    :key="si"
                    class="seal-item"
                  >
                    <el-icon :size="14"><Stamp /></el-icon>
                    <span class="seal-text">{{ s.text || '（未识别章面文字）' }}</span>
                    <el-tag :type="positionTagType(s.position)" effect="plain" size="small">
                      {{ s.position || '未知' }}
                    </el-tag>
                  </div>
                </div>
              </template>

              <!-- 被过滤的签章 -->
              <template v-if="(seal.filtered_seals || []).length">
                <div class="sub-caption">区域外签章（已过滤，{{ seal.filtered_seals.length }}）</div>
                <div class="seal-list">
                  <div
                    v-for="(s, si) in seal.filtered_seals"
                    :key="si"
                    class="seal-item filtered"
                  >
                    <el-icon :size="14"><Stamp /></el-icon>
                    <span class="seal-text">{{ s.text || '（未识别章面文字）' }}</span>
                    <span v-if="s.filter_reason" class="seal-filter-reason">
                      {{ s.filter_reason }}
                    </span>
                  </div>
                </div>
              </template>

              <div
                v-if="!(seal.found_seals || []).length && !(seal.filtered_seals || []).length"
                class="empty-note"
              >
                未检测到签章
              </div>

              <!-- 备注说明 -->
              <el-collapse v-if="(seal.notes || []).length" class="notes-collapse">
                <el-collapse-item :title="`备注说明（${seal.notes.length}）`" name="seal-notes">
                  <ul class="notes-list">
                    <li v-for="(n, ni) in seal.notes" :key="ni">{{ n }}</li>
                  </ul>
                </el-collapse-item>
              </el-collapse>
            </div>
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
  Stamp,
  CircleCheckFilled,
  CircleCloseFilled,
  WarningFilled,
  Position
} from '@element-plus/icons-vue'
import request from '../../api/request'
import { ensureSinglePageAudit } from '../../api/audit'
import { STATUS_META } from '../../constants'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: true, linkify: true, breaks: true })

const route = useRoute()
const router = useRouter()

const taskId = route.params.id

const loading = ref(false)
const auditing = ref(false)

// 本页执行的审核或后端状态为审核中（可能由其他入口触发）都视为审核进行中
const busy = computed(() => auditing.value || task.value?.status === 'auditing')

const task = ref(null)
const auditResult = ref(null)
const verdictFilter = ref('')
const activeTab = ref('audit')

// 查看版面：优先渲染 table_json_to_html_fix，无值时回退 table_json_to_html
const layoutHtml = computed(() => {
  const raw = task.value?.table_json_to_html_fix || task.value?.table_json_to_html || ''
  return raw ? md.render(raw) : ''
})

const VERDICTS = ['合格', '不合格', '无法判定']

const statusMeta = computed(() => STATUS_META[task.value?.status] || STATUS_META.pending)

const hasResult = computed(
  () =>
    !!auditResult.value &&
    typeof auditResult.value === 'object' &&
    Object.keys(auditResult.value).length > 0
)

const overallResult = computed(() => auditResult.value?.result || null)

// AUDIT-S01 数据审核
const comp = computed(() => auditResult.value?.composition_result || null)
const units = computed(() =>
  Array.isArray(comp.value?.审核单元) ? comp.value.审核单元 : []
)
const compStats = computed(() => comp.value?.统计 || null)

// AUDIT-S02 签章审核
const seal = computed(() => auditResult.value?.seal_result || null)

const filteredUnits = computed(() => {
  const indexed = units.value.map((u, i) => ({ u, i }))
  return verdictFilter.value
    ? indexed.filter(({ u }) => u?.判定 === verdictFilter.value)
    : indexed
})

// 可执行审核：success 正常执行；failed 允许重试（解析失败时后端会返回明确错误）；
// pending/processing/auditing 进行中禁用
const canRunAudit = computed(() => {
  if (!task.value) return false
  return !['pending', 'processing', 'auditing'].includes(task.value.status)
})

const emptyDesc = computed(() => {
  if (busy.value) return '正在执行报告单审核，请稍候…'
  if (!task.value) return '未找到该任务'
  if (task.value.status === 'processing' || task.value.status === 'pending') {
    return '文档解析中，解析成功后将自动执行报告单审核'
  }
  if (task.value.status === 'failed') {
    return '任务执行失败，可点击「执行审核」重试；若文档解析本身失败请重新上传'
  }
  return '该任务尚未执行报告单审核'
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

// ---------- 原文件区域高亮定位 ----------
// 审核单元 定位.单元格 的 x/y/w/h 为原图像素坐标；签章坐标不展示定位
// 字段在该单元的 定位.单元格 中匹配不到时（如样品编号格未被纳入），
// 回退到后端 table_json_to_merged_cells_fix（按子表分组的合并单元格列表，
// 每项 { text, x, y, h, w }，坐标同为原图像素）做全文文本匹配
const mergedCells = computed(() => {
  const field = task.value?.table_json_to_merged_cells_fix
  if (!Array.isArray(field)) return []
  return field.flat().filter((c) => c && typeof c === 'object' && c.w > 0 && c.h > 0)
})

const imgNatural = ref(null) // { w, h } 原图自然尺寸
const highlightState = ref({ key: '', cells: [] })

function onImgLoad(e) {
  const img = e.target
  if (img?.naturalWidth && img?.naturalHeight) {
    imgNatural.value = { w: img.naturalWidth, h: img.naturalHeight }
  }
}

// 再次点击同一目标：取消高亮
function toggleHighlight(key, cells) {
  if (highlightState.value.key === key && cells.length) {
    highlightState.value = { key: '', cells: [] }
    return
  }
  highlightState.value = { key, cells }
}

function normText(s) {
  return String(s ?? '').replace(/\s+/g, '')
}

function matchCells(cells, t) {
  const exact = cells.filter((c) => normText(c.text) === t)
  return exact.length
    ? exact
    : cells.filter((c) => {
        const ct = normText(c.text)
        return ct && (ct.includes(t) || t.includes(ct))
      })
}

function unitCells(u) {
  const cells = u?.定位?.单元格
  return Array.isArray(cells)
    ? cells.filter((c) => c && typeof c === 'object' && c.w > 0 && c.h > 0)
    : []
}

// 点击审核单元行：高亮该单元对应的全部单元格（元素符号/标准值/实测值）。
// 样品（项目）格常未纳入 定位.单元格（如化学报告类表格），此时到全文合并
// 单元格中按行锚点补出该格一并高亮
function locateUnit(u, i) {
  const cells = unitCells(u)
  if (!cells.length) {
    ElMessage.info('该审核单元没有可用的定位信息')
    return
  }
  const t = normText(u?.样品)
  if (t && !matchCells(cells, t).length) {
    const global = matchCells(mergedCells.value, t)
    if (global.length) {
      const sample = pickRowMatch(global, cells)
      if (!cells.some((c) => c.x === sample.x && c.y === sample.y)) {
        toggleHighlight(`u${i}`, [...cells, sample])
        return
      }
    }
  }
  toggleHighlight(`u${i}`, cells)
}

function isUnitActive(i) {
  return highlightState.value.key === `u${i}` && highlightState.value.cells.length > 0
}

// 点击字段值（样品/标准值/实测值）：在该单元的 定位.单元格（来自
// table_json_to_merged_cells_fix）中按文本匹配，只高亮该字段所在区域；
// 匹配不到时回退到全文合并单元格查找（如样品编号格未纳入 定位.单元格），
// 用该单元已有单元格的 y 区间作行锚点选出同一表格行的匹配
function locateField(u, i, text) {
  const t = normText(text)
  if (!t || t === '-') return
  const cells = unitCells(u)
  const key = `u${i}|${t}`
  if (cells.length) {
    const matched = matchCells(cells, t).slice().sort((a, b) => a.x - b.x)
    if (matched.length) {
      toggleHighlight(key, [matched[0]])
      return
    }
  }
  const global = matchCells(mergedCells.value, t)
  if (!global.length) {
    if (cells.length) {
      toggleHighlight(key, cells)
    } else {
      ElMessage.info('未在原文件中定位到对应区域')
    }
    return
  }
  toggleHighlight(key, [pickRowMatch(global, cells)])
}

// 全文匹配到多个同名单元格时，优先取与该单元已有单元格 y 区间重叠（同一表格行）
// 的一个，否则取垂直中心距离最近的一个；无锚点时取第一个
function pickRowMatch(matched, anchors) {
  if (matched.length === 1 || !anchors.length) return matched[0]
  for (const a of anchors) {
    const aBottom = a.y + a.h
    const overlap = matched.filter((c) => c.y < aBottom && c.y + c.h > a.y)
    if (overlap.length) return overlap[0]
  }
  const aMid = anchors[0].y + anchors[0].h / 2
  return matched
    .slice()
    .sort((m, n) => Math.abs(m.y + m.h / 2 - aMid) - Math.abs(n.y + n.h / 2 - aMid))[0]
}

function isFieldActive(i, text) {
  return (
    highlightState.value.key === `u${i}|${normText(text)}` &&
    highlightState.value.cells.length > 0
  )
}

const highlightBoxes = computed(() => {
  const nat = imgNatural.value
  if (!nat) return []
  return highlightState.value.cells.map((c) => ({
    left: `${((c.x || 0) / nat.w) * 100}%`,
    top: `${((c.y || 0) / nat.h) * 100}%`,
    width: `${((c.w || 0) / nat.w) * 100}%`,
    height: `${((c.h || 0) / nat.h) * 100}%`
  }))
})

// ---------- 展示辅助 ----------
function verdictCount(v) {
  return units.value.filter((u) => u?.判定 === v).length
}

function resultTagType(r) {
  if (r === '通过') return 'success'
  if (r === '存疑') return 'warning'
  if (r === '不通过') return 'danger'
  return 'info'
}

function unitTagType(v) {
  if (v === '合格') return 'success'
  if (v === '不合格') return 'danger'
  return 'info'
}

function resultClass(r) {
  if (r === '通过') return 'pass'
  if (r === '存疑') return 'warn'
  if (r === '不通过') return 'fail'
  return 'none'
}

function positionTagType(p) {
  if (p === '区域内') return 'success'
  if (p === '未知') return 'warning'
  return 'info'
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
    if (task.value?.task_type !== 'single_page') return
    const st = task.value?.status
    if (st === 'success' && !hasResult.value) {
      // 历史遗留任务（后端自动审核上线前就已 success 但无结果）：进入页面时补触发一次
      runAudit()
    } else if (st === 'processing' || st === 'pending' || st === 'auditing') {
      // 解析/审核进行中（解析完成后由后端自动执行审核）：轮询等待结果
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
  if (task.value && task.value.task_type !== 'single_page') return
  auditing.value = true
  try {
    // 审核可能较慢，单独放大超时时间
    const { data } = await ensureSinglePageAudit(taskId)
    auditResult.value = data.audit_result || null
    // 后端审核期间会把任务状态置 auditing，完成后置 success/failed，本地同步
    if (task.value) task.value.status = 'success'
    ElMessage.success(`审核完成，总体结论：${data.result || data.audit_result?.result || '-'}`)
  } catch (e) {
    if (e.response?.status === 409) {
      // 后端自动审核或其他入口正在执行：转入轮询等待结果
      ElMessage.info(e.response?.data?.detail || '该任务正在审核中')
      clearPoll()
      pollTimer = setTimeout(loadAll, 5000)
    } else {
      if (task.value) task.value.status = 'failed'
      ElMessage.error(e.response?.data?.detail || '执行审核失败，请稍后重试')
    }
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

/* 吸顶区：标题 + 标签页，滚动时固定在内容区顶部 */
.sticky-head {
  position: sticky;
  top: -24px;
  z-index: 20;
  margin: -24px -26px 16px;
  padding: 12px 26px 0;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #eceef6;
}

.result-tabs {
  margin-bottom: 0;
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
  flex: 0 0 55%;
  min-width: 0;
  padding: 16px 18px;
  position: sticky;
  /* 避开吸顶标题区（约 130px 高） */
  top: 130px;
}

.pane-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink-900);
  margin-bottom: 12px;
}

.pane-tip {
  margin: -6px 0 12px;
  font-size: 12px;
  color: var(--ink-300);
}

.file-stage {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
}

.hl-box {
  position: absolute;
  border: 2px solid #f5222d;
  background: rgba(245, 34, 45, 0.14);
  border-radius: 4px;
  pointer-events: none;
  box-sizing: border-box;
  animation: hl-flash 0.9s ease-out;
}

@keyframes hl-flash {
  0% {
    box-shadow: 0 0 0 0 rgba(245, 34, 45, 0.55);
  }
  100% {
    box-shadow: 0 0 0 14px rgba(245, 34, 45, 0);
  }
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

/* 审核块 */
.audit-block {
  padding: 18px 22px 20px;
  margin-bottom: 16px;
}

.block-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.block-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink-900);
}

.block-reason {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--ink-600);
  line-height: 1.7;
}

.sub-caption {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-600);
  margin: 14px 0 8px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.filter-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-600);
}

/* 表格 */
.sheet-scroll {
  overflow-x: auto;
}

.layout-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  color: var(--ink-900);
  background: #fff;
}

.layout-table td {
  border: 1px solid #e6e9f2;
  padding: 8px 12px;
  line-height: 1.7;
}

.kv-key {
  width: 96px;
  min-width: 96px;
  font-weight: 600;
  background: #f7f8fd;
  color: var(--ink-400);
  white-space: nowrap;
}

.cell-left {
  text-align: left;
  word-break: break-all;
}

/* 审核单元卡片 */
.unit-card {
  border: 1px solid #e6e9f2;
  border-radius: 12px;
  padding: 14px 16px 16px;
  margin-bottom: 12px;
  background: #fff;
  transition: all 0.15s ease;
}

.unit-card.is-active {
  border-color: rgba(79, 110, 247, 0.45);
  box-shadow: 0 6px 16px -8px rgba(79, 110, 247, 0.35);
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

.item-verdict {
  margin-left: auto;
}

.locate-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--brand-500);
  background: #f4f6ff;
  border: 1px solid #e3e8fb;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.locate-btn:hover {
  border-color: var(--brand-500);
  box-shadow: 0 4px 10px -4px rgba(79, 110, 247, 0.45);
}

.locate-btn.is-active {
  color: #fff;
  background: var(--brand-500);
  border-color: var(--brand-500);
}

.locatable {
  cursor: pointer;
  transition: all 0.15s ease;
}

.locatable:hover {
  color: var(--brand-500);
  border-color: var(--brand-500);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.locatable.is-active {
  color: var(--brand-500);
  border-color: var(--brand-500);
  background: #eef2ff;
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

.empty-note {
  padding: 18px 0;
  text-align: center;
  font-size: 13px;
  color: var(--ink-300);
}

/* 签章 */
.seal-stamped {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.seal-region-hint {
  font-size: 12px;
  color: var(--ink-300);
}

.seal-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.seal-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  border-radius: 10px;
  background: #f7f8fd;
  border: 1px solid #e6e9f2;
  font-size: 13px;
  color: var(--ink-900);
  transition: all 0.15s ease;
}

.seal-item.filtered {
  color: var(--ink-400);
  background: #fafbfe;
}

.seal-text {
  word-break: break-all;
}

.seal-filter-reason {
  font-size: 12px;
  color: var(--ink-300);
}

.notes-collapse {
  margin-top: 14px;
}

.notes-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--ink-600);
  line-height: 1.9;
}
</style>
