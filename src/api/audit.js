import request from './request'

// 报告单审核触发器：同一任务在审核进行中时复用同一个请求，避免重复调用
const inflight = new Map()

export function ensureSinglePageAudit(taskId) {
  const key = `single:${taskId}`
  if (inflight.has(key)) return inflight.get(key)
  const p = request
    .post('/dp/single-page/audit/', { id: taskId }, { timeout: 300000 })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

// 标准页审核触发器：同上，审核进行中时复用同一个请求
export function ensureCompareAudit(taskId) {
  const key = `compare:${taskId}`
  if (inflight.has(key)) return inflight.get(key)
  const p = request
    .post('/dp/compare/audit/', { id: taskId }, { timeout: 300000 })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}
