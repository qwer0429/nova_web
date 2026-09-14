<template>
  <div class="compare-audit-result">
    <!-- 吸顶区：页面标题 + 结果切换 -->
    <div class="sticky-head">
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
          :loading="busy"
          :disabled="!!task && !canRunAudit"
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
      element-loading-text="正在执行标准页审核，请稍候…"
    >
      <!-- 原文件 -->
      <div class="file-pane page-card">
        <div class="pane-title">原文件</div>
        <p v-if="isImageFile && canLocate" class="pane-tip">
          点击右侧卡片头部的定位按钮可高亮整行，点击项目名 / 规定值 / 实测值可精确高亮对应单元格
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
              :key="bi"
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

        <template v-if="!loading">
          <!-- 尚未审核 -->
          <div v-if="!hasResult" class="page-card empty-card">
            <el-empty
              :description="emptyDesc"
              :image-size="110"
            >
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
                <span
                  class="item-name locatable"
                  :class="{ 'is-active': isTextActive(item, item.项目) }"
                  @click="locateText(item, item.项目)"
                >
                  {{ item.项目 || '未命名项目' }}
                </span>
                <span v-if="locationText(item)" class="item-loc">{{ locationText(item) }}</span>
                <span
                  v-if="hasRowCells(item)"
                  class="locate-btn"
                  :class="{ 'is-active': isRowActive(item) }"
                  @click="locateRow(item)"
                >
                  <el-icon :size="13"><Position /></el-icon>
                  定位
                </span>
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
                    <td class="cell-left">
                      <span
                        class="locatable"
                        :class="{ 'is-active': isTextActive(item, item.规定值) }"
                        @click="locateText(item, item.规定值)"
                      >
                        {{ item.规定值 || '-' }}
                      </span>
                    </td>
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
                          class="value-chip locatable"
                          :class="{ 'is-active': isMeasuredActive(item, mi) }"
                          @click="locateMeasured(item, m, mi)"
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
  QuestionFilled,
  Position
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

// 可执行审核：success 正常执行；failed 允许重试（解析失败时后端会返回明确错误）；
// pending/processing/auditing 进行中禁用
const canRunAudit = computed(() => {
  if (!task.value) return false
  return !['pending', 'processing', 'auditing'].includes(task.value.status)
})

const emptyDesc = computed(() => {
  if (busy.value) return '正在执行标准页审核，请稍候…'
  if (!task.value) return '未找到该任务'
  if (task.value.status === 'processing' || task.value.status === 'pending') {
    return '文档解析中，解析成功后将自动执行标准页审核'
  }
  if (task.value.status === 'failed') {
    return '任务执行失败，可点击「执行审核」重试；若文档解析本身失败请重新上传'
  }
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

// ---------- 原文件区域高亮定位 ----------
// 优先使用审核结果中 定位.单元格 自带的原图坐标；
// 缺失时回退到后端 table_json_to_merged_cells_fix（按子表分组的合并单元格列表，
// 每项 { text, x, y, h, w }，坐标为原图像素）做全文文本匹配
const mergedCells = computed(() => {
  const field = task.value?.table_json_to_merged_cells_fix
  if (!Array.isArray(field)) return []
  return field.flat().filter((c) => c && typeof c === 'object')
})

const imgNatural = ref(null) // { w, h } 原图自然尺寸
const highlightedCells = ref([])
const lastLocateKey = ref('')

// 是否存在可用于定位高亮的数据：审核结果自带坐标，或全文合并单元格
const canLocate = computed(
  () => mergedCells.value.length > 0 || items.value.some((it) => hasRowCells(it))
)

function onImgLoad(e) {
  const img = e.target
  if (img?.naturalWidth && img?.naturalHeight) {
    imgNatural.value = { w: img.naturalWidth, h: img.naturalHeight }
  }
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

// 审核结果自带的行级定位：定位.单元格 为该行所有单元格（含原图坐标）
function rowCellsOf(item) {
  const cells = item?.定位?.单元格
  return Array.isArray(cells)
    ? cells.filter((c) => c && typeof c === 'object' && c.w > 0 && c.h > 0)
    : []
}

function hasRowCells(item) {
  return rowCellsOf(item).length > 0
}

// 行内单元格按 x 排序后，末尾 N 个（N=实测值列表长度）即实测值列（X/Y/Z…），
// 之前的为项目/单位/规定值等列。单元格 OCR 文本常带噪声（如 'Z -10~+10'、
// '-10~+10 -10'），规定值与实测值同文本时纯文本匹配会错位，故按位置划分
function splitRowCells(item) {
  const cells = rowCellsOf(item)
    .slice()
    .sort((a, b) => a.x - b.x)
  const n = (item?.实测值列表 || []).length
  if (n > 0 && cells.length > n) {
    return { rest: cells.slice(0, cells.length - n), measured: cells.slice(cells.length - n) }
  }
  return { rest: cells, measured: [] }
}

// 多个匹配时用锚点文本（项目名/样品号）定位到同一行带：
// 优先 y 区间重叠（同一表格行），否则取垂直中心距离最近的一个
function pickBest(matched, allCells, anchorText) {
  if (matched.length === 1) return matched[0]
  if (anchorText) {
    const anchor = allCells.find((c) => normText(c.text) === anchorText)
    if (anchor) {
      const aBottom = anchor.y + anchor.h
      const overlap = matched.filter((c) => c.y < aBottom && c.y + c.h > anchor.y)
      if (overlap.length) return overlap[0]
      const aMid = anchor.y + anchor.h / 2
      return matched
        .slice()
        .sort((m, n) => Math.abs(m.y + m.h / 2 - aMid) - Math.abs(n.y + n.h / 2 - aMid))[0]
    }
  }
  return matched[0]
}

function locateKey(item, text) {
  return `${normText(item?.项目)}|${normText(text)}`
}

function measuredKey(item, mi) {
  return `${normText(item?.项目)}|m${mi}`
}

// 再次点击同一目标：取消高亮
function toggleHighlight(key, cells) {
  if (lastLocateKey.value === key && highlightedCells.value.length) {
    highlightedCells.value = []
    lastLocateKey.value = ''
    return
  }
  highlightedCells.value = cells
  lastLocateKey.value = key
}

function isTextActive(item, text) {
  return (
    highlightedCells.value.length > 0 && lastLocateKey.value === locateKey(item, text)
  )
}

function isMeasuredActive(item, mi) {
  return (
    highlightedCells.value.length > 0 && lastLocateKey.value === measuredKey(item, mi)
  )
}

function isRowActive(item) {
  return (
    highlightedCells.value.length > 0 && lastLocateKey.value === locateKey(item, '__row__')
  )
}

// 点击卡片头部的定位按钮：高亮该行单元格（不含单位列，只定位项目/规定值/实测值区域）
function locateRow(item) {
  const cells = rowCellsOf(item)
  if (!cells.length) {
    ElMessage.info('该审核项没有可用的定位信息')
    return
  }
  const unit = normText(item?.单位)
  const visible = unit ? cells.filter((c) => normText(c.text) !== unit) : cells
  toggleHighlight(locateKey(item, '__row__'), visible.length ? visible : cells)
}

// 无定位坐标时的回退：在全文合并单元格中做文本匹配
function locateInMergedCells(key, t, anchorText) {
  if (lastLocateKey.value === key && highlightedCells.value.length) {
    highlightedCells.value = []
    lastLocateKey.value = ''
    return
  }
  const matched = matchCells(mergedCells.value, t)
  if (!matched.length) {
    ElMessage.info('未在原文件中定位到对应区域')
    return
  }
  highlightedCells.value = [pickBest(matched, mergedCells.value, anchorText)]
  lastLocateKey.value = key
}

// 点击实测值：坐标唯一，只高亮对应的那一个单元格。
// 优先按列位置映射：行内末尾 N 个单元格即 X/Y/Z… 实测值列，与实测值列表一一对应；
// 无法按位置划分时回退为文本匹配，同值多次出现按出现次序对应 x 升序次序
function locateMeasured(item, m, mi) {
  const t = normText(m?.值)
  if (!t || t === '-') return
  const key = measuredKey(item, mi)
  const { measured } = splitRowCells(item)
  if (measured.length) {
    toggleHighlight(key, [measured[Math.min(mi, measured.length - 1)]])
    return
  }
  const rowCells = rowCellsOf(item)
  if (rowCells.length) {
    const matched = matchCells(rowCells, t)
      .slice()
      .sort((a, b) => a.x - b.x)
    if (!matched.length) {
      // 行内没有匹配文本时，高亮整行
      toggleHighlight(key, rowCells)
      return
    }
    const sameVal = (item.实测值列表 || []).filter((e) => normText(e?.值) === t)
    const occ = Math.max(0, sameVal.indexOf(m))
    toggleHighlight(key, [matched[Math.min(occ, matched.length - 1)]])
    return
  }
  locateInMergedCells(key, t, normText(item?.项目))
}

// 点击项目名/规定值：只在实测值列左侧的单元格中匹配（规定值与实测值同文本时
// 避免命中实测值列），多个匹配取最左侧的一个；匹配不到时高亮整行
function locateText(item, text) {
  const t = normText(text)
  if (!t || t === '-') return
  const key = locateKey(item, text)
  const rowCells = rowCellsOf(item)
  if (rowCells.length) {
    const { rest } = splitRowCells(item)
    const matched = matchCells(rest.length ? rest : rowCells, t)
      .slice()
      .sort((a, b) => a.x - b.x)
    if (matched.length) {
      toggleHighlight(key, [matched[0]])
      return
    }
    const any = matchCells(rowCells, t)
      .slice()
      .sort((a, b) => a.x - b.x)
    toggleHighlight(key, any.length ? [any[0]] : rowCells)
    return
  }
  locateInMergedCells(key, t, normText(item?.项目))
}

const highlightBoxes = computed(() => {
  const nat = imgNatural.value
  if (!nat) return []
  return highlightedCells.value.map((c) => ({
    left: `${((c.x || 0) / nat.w) * 100}%`,
    top: `${((c.y || 0) / nat.h) * 100}%`,
    width: `${((c.w || 0) / nat.w) * 100}%`,
    height: `${((c.h || 0) / nat.h) * 100}%`
  }))
})

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
  if (task.value && task.value.task_type !== 'compare') return
  auditing.value = true
  try {
    // 审核可能较慢，单独放大超时时间
    const { data } = await ensureCompareAudit(taskId)
    auditResult.value = data.audit_result || null
    // 后端审核期间会把任务状态置 auditing，完成后置 success/failed，本地同步
    if (task.value) task.value.status = 'success'
    ElMessage.success(`审核完成，总体结论：${data.audit_result?.总体结论 || '-'}`)
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
