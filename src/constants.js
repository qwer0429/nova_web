// 审核类型常量（与后端 task_type 枚举保持一致，以后端为准）
export const TASK_TYPES = [
  {
    value: 'single_page',
    label: '报告单审核',
    desc: '对单页文档进行版面解析与要素审核，适用于单据、证件、单页合同等独立页面文档。',
    color: 'blue'
  },
  // {
  //   value: 'cross_page',
  //   label: '交叉审核',
  //   desc: '对多页文档进行跨页关联分析与一致性校验，适用于多页合同、标书、申报材料等。',
  //   color: 'purple'
  // },
  {
    value: 'compare',
    label: '标准页审核',
    desc: '对两份或多份文档进行差异比对，识别内容不一致项，适用于合同版本比对等场景。',
    color: 'green'
  }
]

export const STATUS_META = {
  pending: { label: '等待中', color: '#909399', tagType: 'info' },
  processing: { label: '解析中', color: '#409eff', tagType: 'primary' },
  auditing: { label: '审核中', color: '#e6a23c', tagType: 'warning' },
  success: { label: '成功', color: '#67c23a', tagType: 'success' },
  failed: { label: '失败', color: '#f56c6c', tagType: 'danger' }
}

export const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '等待中' },
  { value: 'processing', label: '解析中' },
  { value: 'auditing', label: '审核中' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' }
]
