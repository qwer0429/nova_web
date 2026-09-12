<template>
  <div class="parse-result">
    <!-- 页面标题区 -->
    <div class="page-head">
      <div class="head-left">
        <div class="back-btn" @click="goBack">
          <el-icon :size="16"><Back /></el-icon>
        </div>
        <div>
          <h1 class="page-title">解析结果</h1>
          <p class="page-desc">按原文档版面还原识别结果，支持下载与复制</p>
        </div>
      </div>
    </div>

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

        <!-- 失败 / 无结果 -->
        <el-result
          v-if="detail.status === 'failed'"
          icon="error"
          title="解析失败"
          sub-title="该任务解析失败，暂无可展示的结果"
        />
        <el-empty v-else-if="viewMode === 'empty'" description="暂无解析结果" :image-size="100" />

        <template v-else>
          <!-- 表格工具条 -->
          <div class="sheet-bar">
            <div class="sheet-title">
              <el-icon :size="16"><Grid /></el-icon>
              <span>表格</span>
            </div>
            <div v-if="viewMode !== 'json'" class="sheet-actions">
              <el-tooltip content="下载 CSV" placement="top">
                <div class="icon-btn" @click="onDownload">
                  <el-icon :size="16"><Download /></el-icon>
                </div>
              </el-tooltip>
              <el-tooltip content="复制表格" placement="top">
                <div class="icon-btn" @click="onCopy">
                  <el-icon :size="16"><CopyDocument /></el-icon>
                </div>
              </el-tooltip>
            </div>
          </div>

          <!-- 表格标题 -->
          <div class="sheet-caption">{{ sheetCaption }}</div>

          <!-- a. 版面还原表格（dp_layout） -->
          <div v-if="viewMode === 'layout'" class="sheet-scroll">
            <table class="layout-table">
              <tbody>
                <tr v-for="(row, ri) in layoutRows" :key="ri">
                  <td
                    v-for="cell in row"
                    :key="cell.c"
                    :rowspan="cell.rs > 1 ? cell.rs : null"
                    :colspan="cell.cs > 1 ? cell.cs : null"
                    :class="{ 'cell-left': cell.align === 'left', 'cell-strong': cell.strong }"
                  >{{ cell.text }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- b. 数据表回退（dp_tables: columns + rows） -->
          <div v-else-if="viewMode === 'tables'">
            <div v-for="(tb, ti) in tables" :key="ti" class="data-table-block">
              <div class="data-table-name">{{ tb.name || `表格 ${ti + 1}` }}</div>
              <div class="sheet-scroll">
                <table class="layout-table">
                  <thead>
                    <tr>
                      <th v-for="(col, ci) in tb.columns" :key="ci">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, ri) in tb.rows" :key="ri">
                      <td v-for="(_, ci) in tb.columns" :key="ci">
                        {{ Array.isArray(row) ? row[ci] ?? '' : '' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- c. 原始 JSON 兜底 -->
          <pre v-else class="json-view">{{ jsonText }}</pre>
        </template>
      </template>

      <el-empty v-else-if="!loading" description="未找到该任务" :image-size="100" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Folder, Grid, Download, CopyDocument } from '@element-plus/icons-vue'
import request from '../../api/request'
import { STATUS_META } from '../../constants'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detail = ref(null)

const layout = computed(() => {
  const l = detail.value?.dp_layout
  return l && Array.isArray(l.cells) && l.cells.length > 0 ? l : null
})

const statusMeta = computed(
  () => STATUS_META[detail.value?.status] || STATUS_META.pending
)

// dp_tables 可能是 JSON 字符串，先归一化
const tablesRaw = computed(() => {
  const raw = detail.value?.dp_tables
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return raw // 解析失败，保留原始字符串走 JSON 兜底
    }
  }
  return raw
})

// b 级回退：数组且每项有 columns + rows
const tables = computed(() => {
  const raw = tablesRaw.value
  if (
    Array.isArray(raw) &&
    raw.length > 0 &&
    raw.every((t) => Array.isArray(t?.columns) && Array.isArray(t?.rows))
  ) {
    return raw
  }
  return []
})

// c 级回退：其他非空结构 → 美化 JSON 文本
const jsonText = computed(() => {
  const raw = tablesRaw.value
  if (raw === null || raw === undefined || raw === '') return ''
  if (tables.value.length > 0) return ''
  if (typeof raw === 'string') return raw
  try {
    return JSON.stringify(raw, null, 2)
  } catch {
    return String(raw)
  }
})

// 渲染模式：layout > tables > json > empty
const viewMode = computed(() => {
  if (layout.value) return 'layout'
  if (tables.value.length > 0) return 'tables'
  if (jsonText.value) return 'json'
  return 'empty'
})

// 工具条下方的灰色标题行
const sheetCaption = computed(() => {
  if (viewMode.value === 'layout') return layout.value?.title || '未识别到表格标题'
  if (viewMode.value === 'tables') return '未识别到表格标题' // 表名已在每张表上方单独展示
  return '解析结果（原始数据）'
})

// 将 cells 按起始行分组（rowspan 占用的后续行不产生占位 td）
const layoutRows = computed(() => {
  const l = layout.value
  if (!l) return []
  const byRow = new Map()
  l.cells.forEach((cell) => {
    if (!byRow.has(cell.r)) byRow.set(cell.r, [])
    byRow.get(cell.r).push(cell)
  })
  const maxRow = Math.max(...l.cells.map((c) => c.r + (c.rs || 1)))
  const rows = []
  for (let r = 0; r < maxRow; r++) {
    rows.push((byRow.get(r) || []).sort((a, b) => a.c - b.c))
  }
  return rows
})

// 展开为矩阵（合并延续格留空），用于 CSV / TSV 导出
function layoutMatrix() {
  const l = layout.value
  if (!l) return []
  const totalRows = Math.max(...l.cells.map((c) => c.r + (c.rs || 1)))
  const m = Array.from({ length: totalRows }, () => Array(l.col_count).fill(''))
  l.cells.forEach((c) => {
    m[c.r][c.c] = c.text ?? ''
  })
  return m
}

// columns+rows 结构展开为矩阵，多表之间用空行分隔
function tablesMatrix() {
  const out = []
  tables.value.forEach((tb, i) => {
    if (i > 0) out.push([])
    out.push(tb.columns.map((c) => c ?? ''))
    tb.rows.forEach((r) => {
      out.push(tb.columns.map((_, ci) => (Array.isArray(r) ? r[ci] ?? '' : '')))
    })
  })
  return out
}

// 按当前渲染模式取导出矩阵
function exportMatrix() {
  if (viewMode.value === 'layout') return layoutMatrix()
  if (viewMode.value === 'tables') return tablesMatrix()
  return []
}

function escapeCsv(v) {
  const s = String(v ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function onDownload() {
  const matrix = exportMatrix()
  if (matrix.length === 0) {
    ElMessage.warning('当前结果不是表格结构，无法导出 CSV')
    return
  }
  const csv = matrix
    .map((r) => r.map(escapeCsv).join(','))
    .join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${detail.value?.file_name || 'result'}-解析结果.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  ElMessage.success('已开始下载 CSV 文件')
}

async function onCopy() {
  const matrix = exportMatrix()
  if (matrix.length === 0) {
    ElMessage.warning('当前结果不是表格结构，无法复制为表格')
    return
  }
  const tsv = matrix
    .map((r) => r.join('\t'))
    .join('\n')
  try {
    await navigator.clipboard.writeText(tsv)
    ElMessage.success('表格内容已复制到剪贴板')
  } catch {
    // 剪贴板 API 不可用时的降级方案
    const ta = document.createElement('textarea')
    ta.value = tsv
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      ElMessage.success('表格内容已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败，请手动选择复制')
    }
    ta.remove()
  }
}

function goBack() {
  router.push('/parse/history')
}

async function loadDetail() {
  loading.value = true
  try {
    const { data } = await request.get(`/dp/tasks/${route.params.id}/`)
    detail.value = data.task
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
  margin-bottom: 22px;
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

/* 表格工具条 */
.sheet-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sheet-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink-900);
}

.sheet-title .el-icon {
  color: var(--brand-500);
}

.sheet-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #e6e8f2;
  border-radius: 9px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7194;
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

/* 表格标题行 */
.sheet-caption {
  margin: 10px 0 12px;
  font-size: 12.5px;
  color: var(--ink-300);
}

/* 版面还原表格 */
.sheet-scroll {
  overflow-x: auto;
  border-radius: 10px;
}

.layout-table {
  border-collapse: collapse;
  min-width: 100%;
  font-size: 13.5px;
  color: var(--ink-900);
  background: #fff;
}

.layout-table td {
  border: 1px solid #d8dce8;
  padding: 9px 16px;
  text-align: center;
  line-height: 1.6;
  white-space: nowrap;
}

.layout-table td.cell-left {
  text-align: left;
}

.layout-table td.cell-strong {
  font-weight: 600;
  background: #f7f8fd;
}

/* 数据表回退（columns + rows） */
.layout-table th {
  border: 1px solid #d8dce8;
  padding: 9px 16px;
  text-align: center;
  line-height: 1.6;
  white-space: nowrap;
  font-weight: 600;
  background: #f7f8fd;
  color: var(--ink-600);
  font-size: 13px;
}

.data-table-block {
  margin-bottom: 22px;
}

.data-table-block:last-child {
  margin-bottom: 0;
}

.data-table-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-600);
  margin-bottom: 8px;
}

/* 原始 JSON 兜底 */
.json-view {
  background: #f7f8fc;
  border: 1px solid #e9ecf5;
  border-radius: 10px;
  padding: 16px 18px;
  font-size: 12.5px;
  line-height: 1.75;
  overflow: auto;
  max-height: 560px;
  margin: 0;
  color: var(--ink-600);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
