<template>
  <div class="type-config">
    <!-- 页面标题区 -->
    <div class="page-head">
      <h1 class="page-title">类型配置</h1>
      <p class="page-desc">查看当前支持的审核类型及其说明</p>
    </div>

    <div class="page-card config-card">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="以下为前端展示的只读配置，实际类型定义以后端 task_type 枚举为准。"
        style="margin-bottom: 18px"
      />

      <el-table :data="TASK_TYPES" class="config-table" style="width: 100%">
        <el-table-column label="类型标识" width="180">
          <template #default="{ row }">
            <code class="type-code">{{ row.value }}</code>
          </template>
        </el-table-column>
        <el-table-column label="中文名称" width="160">
          <template #default="{ row }">
            <el-tag :type="tagType(row.color)" effect="light">{{ row.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="说明">
          <template #default="{ row }">{{ row.desc }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { TASK_TYPES } from '../../constants'

function tagType(color) {
  return { blue: 'primary', purple: 'warning', green: 'success' }[color] || 'info'
}
</script>

<style scoped>
.type-config {
  max-width: 960px;
}

.page-head {
  margin-bottom: 22px;
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

.config-card {
  padding: 24px 26px;
}

.config-table {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #eef0f7;
}

.config-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.type-code {
  background: #f1f3fb;
  border: 1px solid #e4e7f3;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--brand-600);
}
</style>
