<template>
  <div class="parse-history">
    <!-- 页面标题区 -->
    <div class="page-head">
      <div>
        <h1 class="page-title">审核历史</h1>
        <p class="page-desc">查看所有解析任务的状态与结果，支持按关键词、状态、类型和时间筛选</p>
      </div>
      <el-button type="primary" :icon="Upload" size="large" @click="goNew">上传文件</el-button>
    </div>

    <div class="page-card table-card">
    <!-- 筛选行 -->
    <div class="filters">
      <el-input
        v-model="filters.keyword"
        placeholder="请输入关键词"
        clearable
        :prefix-icon="Search"
        style="width: 200px"
        @change="onFilterChange"
        @clear="onFilterChange"
      />
      <el-select
        v-model="filters.status"
        placeholder="状态：全部"
        style="width: 160px"
        @change="onFilterChange"
      >
        <el-option
          v-for="o in STATUS_OPTIONS"
          :key="o.value"
          :label="o.value === '' ? '状态：全部' : o.label"
          :value="o.value"
        />
      </el-select>
      <el-select
        v-model="filters.task_type"
        placeholder="类型：全部"
        style="width: 170px"
        @change="onFilterChange"
      >
        <el-option label="类型：全部" value="" />
        <el-option
          v-for="t in TASK_TYPES"
          :key="t.value"
          :label="t.label"
          :value="t.value"
        />
      </el-select>
      <span class="filter-prefix">创建时间：</span>
      <el-date-picker
        v-model="filters.dates"
        type="daterange"
        range-separator="→"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        style="width: 280px"
        @change="onFilterChange"
      />
      <el-tooltip content="清空筛选" placement="top">
        <el-button :icon="Delete" circle @click="onClear" />
      </el-tooltip>
    </div>

    <!-- 表格 -->
    <el-table v-loading="loading" :data="list" stripe class="task-table" style="width: 100%" @selection-change="() => {}">
      <el-table-column type="selection" width="46" />
      <el-table-column label="序号" width="70">
        <template #default="{ $index }">
          {{ (page - 1) * pageSize + $index + 1 }}
        </template>
      </el-table-column>
      <el-table-column label="文件名称" min-width="240">
        <template #default="{ row }">
          <div class="file-cell">
            <el-icon color="#e6a23c" :size="18"><Folder /></el-icon>
            <el-link type="primary" :underline="false" @click="openDetail(row)">
              {{ row.file_name }}
            </el-link>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="审核类型" width="140">
        <template #default="{ row }">{{ row.task_type_display }}</template>
      </el-table-column>
      <el-table-column label="状态" width="130">
        <template #default="{ row }">
          <span class="status-cell">
            <span class="status-dot" :style="{ background: statusMeta(row).color }"></span>
            <el-tag :type="statusMeta(row).tagType" size="small" effect="light">
              {{ row.status_display }}
            </el-tag>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="150">
        <template #default="{ row }">
          <div class="time-cell">
            <div>{{ datePart(row.created_at) }}</div>
            <div class="time-sub">{{ timePart(row.created_at) }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="创建人" width="110">
        <template #default="{ row }">{{ row.creator || auth.username || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="openDetail(row)">
            查看结果
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无解析任务" :image-size="90" />
      </template>
    </el-table>

    <!-- 分页 -->
    <div class="pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="loadTasks"
        @size-change="onSizeChange"
      />
    </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Delete, Upload, Folder, View } from '@element-plus/icons-vue'
import request from '../../api/request'
import { useAuthStore } from '../../stores/auth'
import { TASK_TYPES, STATUS_OPTIONS, STATUS_META } from '../../constants'

const router = useRouter()
const auth = useAuthStore()

const filters = reactive({ keyword: '', status: '', task_type: '', dates: null })
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)

let refreshTimer = null

function statusMeta(row) {
  return STATUS_META[row?.status] || STATUS_META.pending
}

function datePart(s) {
  return (s || '').split(' ')[0] || '-'
}

function timePart(s) {
  return (s || '').split(' ')[1] || ''
}

function goNew() {
  router.push('/parse/new')
}

function buildParams() {
  const p = { page: page.value, page_size: pageSize.value }
  if (filters.keyword) p.keyword = filters.keyword
  if (filters.status) p.status = filters.status
  if (filters.task_type) p.task_type = filters.task_type
  if (filters.dates && filters.dates.length === 2) {
    p.date_from = filters.dates[0]
    p.date_to = filters.dates[1]
  }
  return p
}

async function loadTasks(silent = false) {
  if (!silent) loading.value = true
  try {
    const { data } = await request.get('/dp/tasks/', { params: buildParams() })
    list.value = data.results || []
    total.value = data.count || 0
    scheduleRefresh()
  } catch (e) {
    if (!silent) ElMessage.error(e.response?.data?.detail || '加载任务列表失败')
  } finally {
    if (!silent) loading.value = false
  }
}

// 存在进行中任务时每 10 秒自动刷新
function scheduleRefresh() {
  clearTimer()
  const hasActive = list.value.some(
    (t) => t.status === 'processing' || t.status === 'pending' || t.status === 'auditing'
  )
  if (hasActive) {
    refreshTimer = setInterval(() => loadTasks(true), 10000)
  }
}

function clearTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

function onFilterChange() {
  page.value = 1
  loadTasks()
}

function onSizeChange() {
  page.value = 1
  loadTasks()
}

function onClear() {
  filters.keyword = ''
  filters.status = ''
  filters.task_type = ''
  filters.dates = null
  page.value = 1
  loadTasks()
}

function openDetail(row) {
  // 默认展示审核结果；无对应审核页的类型进入解析结果
  if (row.task_type === 'single_page') {
    router.push(`/parse/single-result/${row.id}`)
  } else if (row.task_type === 'cross_page') {
    router.push(`/parse/cross-result/${row.id}`)
  } else if (row.task_type === 'compare') {
    router.push(`/parse/compare-result/${row.id}`)
  } else {
    router.push(`/parse/result/${row.id}`)
  }
}

onMounted(loadTasks)
onBeforeUnmount(clearTimer)
</script>

<style scoped>
.parse-history {
  width: 100%;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
  gap: 16px;
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
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--ink-400);
}

.table-card {
  padding: 22px 24px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 18px;
  padding: 14px 16px;
  background: #f7f8fd;
  border: 1px solid #eef0f7;
  border-radius: 12px;
}

.filter-prefix {
  font-size: 13px;
  color: var(--ink-600);
  margin-right: -6px;
}

.file-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-cell :deep(.el-link__inner) {
  font-weight: 500;
}

.status-cell {
  display: inline-flex;
  align-items: center;
}

.time-cell {
  line-height: 1.5;
  font-size: 13px;
}

.time-sub {
  color: var(--ink-300);
  font-size: 12px;
}

/* 表格细化 */
.task-table {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #eef0f7;
}

.task-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.task-table :deep(.el-table__row--striped td.el-table__cell) {
  background: #fafbfe;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}
</style>
