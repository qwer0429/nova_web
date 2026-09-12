// 前端 Mock 实现：当 VITE_MOCK=true 时，axios 请求全部走这里，无需后端
const STATUS_DISPLAY = {
  pending: '等待中',
  processing: '解析中',
  success: '解析成功',
  failed: '解析失败'
}

const TYPE_DISPLAY = {
  single_page: '单页审核',
  cross_page: '交叉审核',
  compare: '比对审核'
}

const FILE_NAMES = [
  '03标准页01.jpg',
  '采购合同-扫描件.pdf',
  '房屋租赁合同V2.pdf',
  '增值税发票_202606.png',
  '入职登记表-张三.pdf',
  '投标文件-第一册.pdf',
  '体检报告-李四.jpg',
  '对账单-2026年5月.pdf',
  '营业执照副本.jpg',
  '技术协议-终版.pdf',
  '报价单-Q2.pdf',
  '保险合同-车险.pdf'
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function fmt(d) {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

const STATUSES = ['success', 'processing', 'pending', 'failed']
const TYPES = ['single_page', 'cross_page', 'compare']

let idSeq = 0
function makeTask(overrides = {}) {
  idSeq += 1
  const status = overrides.status || STATUSES[idSeq % STATUSES.length]
  const taskType = overrides.task_type || TYPES[idSeq % TYPES.length]
  const createdAt = overrides.created_at || new Date()
  const updatedAt = new Date(createdAt.getTime() + 5 * 60 * 1000)
  return {
    id: idSeq,
    file_name: overrides.file_name || FILE_NAMES[idSeq % FILE_NAMES.length],
    file_path: `/media/uploads/${idSeq}/file`,
    task_id: `TASK-${String(10000 + idSeq)}`,
    task_dp_id: `DP-${String(90000 + idSeq)}`,
    dp_tables: null,
    status,
    status_display: STATUS_DISPLAY[status],
    task_type: taskType,
    task_type_display: TYPE_DISPLAY[taskType],
    created_at: fmt(createdAt),
    updated_at: fmt(updatedAt),
    creator: 'xiewei'
  }
}

// 种子数据：23 条，按创建时间倒序，覆盖四种状态 × 三种类型
const tasks = []
const now = Date.now()
for (let i = 0; i < 23; i++) {
  const created = new Date(now - i * 5.5 * 3600 * 1000 - Math.floor(Math.random() * 1800) * 1000)
  tasks.push(makeTask({
    created_at: created,
    // 保证前几条覆盖各种状态，方便演示
    status: ['success', 'processing', 'success', 'failed', 'pending'][i % 5] || 'success',
    task_type: TYPES[i % 3]
  }))
}
tasks.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

function sampleDpTables(task) {
  return [
    {
      name: '基本信息表',
      columns: ['字段', '识别结果', '置信度'],
      rows: [
        ['文档类型', task.task_type_display, '0.99'],
        ['页数', '3', '0.97'],
        ['签署日期', '2026-06-18', '0.93'],
        ['合同编号', `HT-${task.task_dp_id}`, '0.95']
      ]
    },
    {
      name: '要素抽取表',
      columns: ['要素名称', '所在页', '识别值', '校验结果'],
      rows: [
        ['甲方名称', '第 1 页', '西安某某科技有限公司', '通过'],
        ['乙方名称', '第 1 页', '王某某', '通过'],
        ['金额（大写）', '第 2 页', '人民币壹拾贰万元整', '待复核'],
        ['盖章位置', '第 3 页', '页脚右侧', '通过']
      ]
    }
  ]
}

// ---- 版面还原结构：{ title, col_count, cells: [{ r, c, rs, cs, text, align, strong }] } ----
// r/c 为起始行列（0 起），rs/cs 为 rowspan/colspan；align 默认居中，备注类用 'left'
const L = (r, c, text, opts = {}) => ({ r, c, rs: 1, cs: 1, text, ...opts })
const fullRow = (r, text, opts = {}) => L(r, 0, text, { cs: 5, ...opts })

// 试验报告版面（任务 1 的演示数据，还原参考样式：合并单元格 + 通栏备注）
function reportLayout() {
  return {
    title: '未识别到表格标题',
    col_count: 5,
    cells: [
      L(0, 0, '试验所用设备名称', { strong: true }),
      L(0, 1, '光直读光谱仪', { cs: 4 }),
      fullRow(1, '试验数据', { align: 'center', strong: true }),
      L(2, 0, '样品名称', { rs: 6, strong: true }),
      L(2, 1, '样品编号', { strong: true }),
      L(2, 2, '化学成分 %', { cs: 3, strong: true }),
      L(3, 1, '40'), L(3, 2, '中38'), L(3, 3, '0.40'), L(3, 4, '0.95'),
      L(4, 1, 'ф30'), L(4, 2, '0.43'), L(4, 3, '1.01'), L(4, 4, ''),
      L(5, 1, 'ψ16'), L(5, 2, '0.38'), L(5, 3, '1.0ψ'), L(5, 4, ''),
      L(6, 1, 'ψ18'), L(6, 2, '039'), L(6, 3, '0.97'), L(6, 4, ''),
      L(7, 1, 'ф22'), L(7, 2, '038'), L(7, 3, '1.02'), L(7, 4, ''),
      fullRow(8, '注：', { align: 'left' }),
      fullRow(9, '1、报告涂改、另行添加数据无效。', { align: 'left' }),
      fullRow(10, '2、复制报告未重新签认者无效。（理化专用章）', { align: 'left' }),
      fullRow(11, '3、未加盖理化检验专用章无效。签发日期 20 年 3 月', { align: 'left' }),
      fullRow(12, '试验者：李雪　校对：', { align: 'left' }),
      fullRow(13, '以上由理化试验人员填写，以下由委托试验单位的技术管理人员填写。', { align: 'left' }),
      fullRow(14, '试验结果合格判定', { align: 'center', strong: true }),
      fullRow(15, '执行标准：GB/T 3077-2015', { align: 'left' }),
      L(16, 0, '试验项目', { strong: true }), L(16, 1, 'C'), L(16, 2, 'Cv'), L(16, 3, ''), L(16, 4, ''),
      L(17, 0, '标准值', { strong: true }), L(17, 1, '037~0.44'), L(17, 2, '0802~1.10'), L(17, 3, ''), L(17, 4, ''),
      fullRow(18, '结果判定：符合标准，准以使用', { align: 'left' }),
      fullRow(19, '判定人：戴石娜　判定日期：2025.3.28', { align: 'left' })
    ]
  }
}

// 其他 success 任务的简单版面表
function simpleLayout(task) {
  return {
    title: '未识别到表格标题',
    col_count: 4,
    cells: [
      L(0, 0, '字段', { strong: true }), L(0, 1, '识别结果', { cs: 2, strong: true }), L(0, 3, '置信度', { strong: true }),
      L(1, 0, '文档类型'), L(1, 1, task.task_type_display, { cs: 2 }), L(1, 3, '0.99'),
      L(2, 0, '页数'), L(2, 1, '3', { cs: 2 }), L(2, 3, '0.97'),
      L(3, 0, '合同编号'), L(3, 1, `HT-${task.task_dp_id}`, { cs: 2 }), L(3, 3, '0.95'),
      fullRowNote(4, '注：以上为演示数据，实际结果以解析引擎输出为准。')
    ]
  }
}

function fullRowNote(r, text) {
  return { r, c: 0, rs: 1, cs: 4, text, align: 'left' }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function ok(data, status, config) {
  return { data, status, statusText: 'OK', headers: {}, config }
}

function fail(data, status, config) {
  const err = new Error(data?.detail || `Request failed with status ${status}`)
  err.config = config
  err.isAxiosError = true
  err.response = { data, status, statusText: 'ERROR', headers: {}, config }
  throw err
}

function checkAuth(config) {
  const h = config.headers || {}
  const auth = h.Authorization || h.authorization || ''
  if (!String(auth).startsWith('Bearer ')) {
    fail({ detail: '身份认证信息未提供。' }, 401, config)
  }
}

function fullPath(config) {
  const base = config.baseURL || ''
  return (base + config.url).replace(/^https?:\/\/[^/]+/i, '')
}

async function handle(config) {
  const path = fullPath(config)
  const method = (config.method || 'get').toLowerCase()
  const params = config.params || {}

  // 登录：任意账号密码
  if (method === 'post' && path === '/api/login/') {
    let body = config.data
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }
    const username = body?.username || 'mock'
    if (!body?.username || !body?.password) {
      fail({ detail: '用户名或密码错误' }, 401, config)
    }
    return ok({
      access: `mock-access-${Date.now()}`,
      refresh: `mock-refresh-${Date.now()}`,
      user: { id: 1, username, email: `${username}@nova.local` }
    }, 200, config)
  }

  // 刷新 token
  if (method === 'post' && path === '/api/token/refresh/') {
    return ok({ access: `mock-access-${Date.now()}` }, 200, config)
  }

  // 以下接口需要鉴权
  checkAuth(config)

  // 上传
  if (method === 'post' && path === '/api/dp/upload/') {
    let taskType = 'single_page'
    let fileName = '未命名文件'
    if (config.data instanceof FormData) {
      taskType = config.data.get('task_type') || taskType
      const f = config.data.get('file')
      if (f && f.name) fileName = f.name
    }
    const task = makeTask({
      status: 'pending',
      task_type: taskType,
      file_name: fileName,
      created_at: new Date()
    })
    tasks.unshift(task)
    return ok({ task }, 202, config)
  }

  // 任务列表
  if (method === 'get' && path === '/api/dp/tasks/') {
    let list = [...tasks]
    if (params.keyword) {
      list = list.filter((t) => t.file_name.includes(params.keyword))
    }
    if (params.status) {
      list = list.filter((t) => t.status === params.status)
    }
    if (params.task_type) {
      list = list.filter((t) => t.task_type === params.task_type)
    }
    if (params.date_from) {
      list = list.filter((t) => t.created_at.slice(0, 10) >= params.date_from)
    }
    if (params.date_to) {
      list = list.filter((t) => t.created_at.slice(0, 10) <= params.date_to)
    }
    const page = parseInt(params.page || '1', 10)
    const pageSize = parseInt(params.page_size || '10', 10)
    const count = list.length
    const results = list.slice((page - 1) * pageSize, page * pageSize)
    return ok({ count, results }, 200, config)
  }

  // DP token（内嵌 DP 结果页用）
  if (method === 'get' && path === '/api/dp/token/') {
    return ok({
      access_token: `mock-dp-token-${Date.now()}`,
      refresh_token: `mock-dp-refresh-${Date.now()}`
    }, 200, config)
  }

  // 任务详情
  const detailMatch = path.match(/^\/api\/dp\/tasks\/(\d+)\/$/)
  if (method === 'get' && detailMatch) {
    const id = parseInt(detailMatch[1], 10)
    const task = tasks.find((t) => t.id === id)
    if (!task) fail({ detail: '未找到该任务' }, 404, config)
    const detail = { ...task }
    if (detail.status === 'success') {
      detail.dp_tables = sampleDpTables(detail)
      // 版面还原数据：任务 1 返回完整试验报告版面，其余 success 任务给简单版面
      detail.dp_layout = detail.id === 1 ? reportLayout() : simpleLayout(detail)
    }
    if (detail.status === 'failed') {
      detail.dp_tables = null
    }
    return ok({ task: detail }, 200, config)
  }

  fail({ detail: `Mock 未实现的接口: ${method.toUpperCase()} ${path}` }, 404, config)
}

export function mockAdapter(config) {
  return delay(200).then(() => handle(config))
}
