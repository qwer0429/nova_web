<template>
  <div class="new-parse">
    <!-- 页面标题区 -->
    <div class="page-head">
      <h1 class="page-title">新建解析</h1>
      <p class="page-desc">选择审核类型并上传文档，AI 将自动完成版面解析与要素审核</p>
    </div>

    <div class="page-card form-panel">
      <el-form label-position="top">
        <el-form-item label="审核类型">
          <div class="type-radios">
            <div
              v-for="t in TASK_TYPES"
              :key="t.value"
              class="type-radio"
              :class="{ selected: form.task_type === t.value }"
              @click="form.task_type = t.value"
            >
              <div class="type-head">
                <div class="type-icon" :class="`icon-${t.color}`">
                  <el-icon :size="20"><component :is="TYPE_ICONS[t.value]" /></el-icon>
                </div>
                <el-radio :model-value="form.task_type" :value="t.value" @change="form.task_type = t.value">
                  <span class="type-name">{{ t.label }}</span>
                </el-radio>
              </div>
              <div class="type-desc">{{ t.desc }}</div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="上传文件">
          <el-upload
            ref="uploadRef"
            drag
            :auto-upload="false"
            :limit="1"
            :on-change="onFileChange"
            :on-exceed="onExceed"
            :on-remove="onRemove"
            style="width: 100%"
          >
            <div class="drop-inner">
              <div class="drop-icon-wrap">
                <el-icon :size="34"><UploadFilled /></el-icon>
              </div>
              <div class="el-upload__text">将文件拖到此处，或 <em>点击上传</em></div>
              <div class="format-chips">
                <span class="chip">PDF</span>
                <span class="chip">JPG</span>
                <span class="chip">PNG</span>
                <span class="chip chip-note">单次 1 个文件</span>
              </div>
            </div>
            <template #tip>
              <div class="el-upload__tip">支持 PDF / JPG / PNG 等常见文档格式，单次上传 1 个文件</div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item class="action-row">
          <el-button
            type="primary"
            size="large"
            :icon="Promotion"
            :loading="submitting"
            :disabled="!file"
            @click="onSubmit"
          >
            开始解析
          </el-button>
          <el-button size="large" @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, genFileId } from 'element-plus'
import { UploadFilled, Promotion, Document, Connection, CopyDocument } from '@element-plus/icons-vue'
import request from '../../api/request'
import { TASK_TYPES } from '../../constants'

const TYPE_ICONS = {
  single_page: Document,
  cross_page: Connection,
  compare: CopyDocument
}

const route = useRoute()
const router = useRouter()

const form = reactive({ task_type: 'single_page' })
const file = ref(null)
const submitting = ref(false)
const uploadRef = ref(null)

onMounted(() => {
  const t = route.query.type
  if (t && TASK_TYPES.some((x) => x.value === t)) {
    form.task_type = t
  }
})

function onFileChange(uploadFile) {
  file.value = uploadFile.raw
}

function onExceed(files) {
  uploadRef.value?.clearFiles()
  const f = files[0]
  f.uid = genFileId()
  uploadRef.value?.handleStart(f)
  file.value = f
}

function onRemove() {
  file.value = null
}

async function onSubmit() {
  if (!file.value) {
    ElMessage.warning('请先选择要上传的文件')
    return
  }
  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('file', file.value)
    fd.append('task_type', form.task_type)
    await request.post('/dp/upload/', fd)
    ElMessage.success('上传成功，解析任务已创建')
    router.push('/parse/history')
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '上传失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

function onReset() {
  uploadRef.value?.clearFiles()
  file.value = null
  form.task_type = 'single_page'
}
</script>

<style scoped>
.new-parse {
  max-width: 960px;
}

/* 页面标题区 */
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

.form-panel {
  padding: 28px 32px 20px;
}

/* 审核类型卡片 */
.type-radios {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
}

.type-radio {
  border: 1.5px solid #e7e9f3;
  border-radius: 14px;
  padding: 16px 18px;
  cursor: pointer;
  background: #fff;
  transition: all 0.22s ease;
  position: relative;
}

.type-radio:hover {
  border-color: rgba(79, 110, 247, 0.45);
  transform: translateY(-4px);
  box-shadow: 0 14px 28px -12px rgba(79, 110, 247, 0.28);
}

.type-radio.selected {
  border: 1.5px solid transparent;
  background:
    linear-gradient(#fdfdff, #f7f8ff) padding-box,
    var(--brand-gradient) border-box;
  box-shadow: 0 14px 30px -10px rgba(90, 92, 245, 0.4), 0 0 0 4px rgba(79, 110, 247, 0.08);
}

.type-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.type-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.22s ease;
}

.type-radio:hover .type-icon,
.type-radio.selected .type-icon {
  transform: scale(1.06);
}

.icon-blue { background: #e8f1ff; color: #3b82f6; }
.icon-purple { background: #f1ebff; color: #7c5cff; }
.icon-green { background: #e6f9ee; color: #10b981; }

.type-name {
  font-weight: 600;
  color: var(--ink-900);
  font-size: 14.5px;
}

.type-desc {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--ink-400);
}

/* 上传区 */
.drop-inner {
  padding: 30px 0 26px;
}

.drop-icon-wrap {
  width: 72px;
  height: 72px;
  margin: 0 auto 14px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-500);
  background: var(--brand-gradient-soft);
  box-shadow: 0 0 0 8px rgba(79, 110, 247, 0.06);
  transition: all 0.25s ease;
}

.format-chips {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.chip {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--brand-500);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-8);
  border-radius: 999px;
  padding: 3px 12px;
}

.chip-note {
  color: var(--ink-400);
  background: #f3f4f9;
  border-color: #e8eaf2;
  font-weight: 500;
}

/* Element Upload 拖拽区细化 */
.new-parse :deep(.el-upload-dragger) {
  border: 2px dashed #cdd3ea;
  border-radius: 16px;
  background: #fafbfe;
  transition: all 0.25s ease;
  padding: 0;
}

.new-parse :deep(.el-upload-dragger:hover),
.new-parse :deep(.el-upload-dragger.is-dragover) {
  border-color: var(--brand-500);
  background: linear-gradient(180deg, rgba(79, 110, 247, 0.05), rgba(124, 92, 255, 0.05));
}

.new-parse :deep(.el-upload-dragger:hover) .drop-icon-wrap,
.new-parse :deep(.el-upload-dragger.is-dragover) .drop-icon-wrap {
  transform: translateY(-4px) scale(1.05);
  color: var(--brand-purple);
}

.new-parse :deep(.el-upload__text) {
  font-size: 14px;
  color: var(--ink-600);
}

.new-parse :deep(.el-upload__text em) {
  color: var(--brand-500);
  font-weight: 600;
}

.new-parse :deep(.el-upload-list__item) {
  border-radius: 10px;
  transition: all 0.2s ease;
}

.new-parse :deep(.el-upload-list__item:hover) {
  background: #f4f6ff;
}

/* 操作按钮行 */
.action-row {
  margin-top: 4px;
}

.action-row :deep(.el-form-item__content) {
  gap: 12px;
}

.action-row .el-button--large {
  padding: 12px 30px;
  font-size: 15px;
}
</style>
