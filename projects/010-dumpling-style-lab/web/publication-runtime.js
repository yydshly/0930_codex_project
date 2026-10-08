// Static hosting has no room or relay backend. Keep loopback requests on the
// local development host instead of contacting a public visitor's computer.
export function hasLocalServices(hostname = globalThis.location?.hostname) {
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
}

export const ROOM_PUBLIC_SCOPE = '房间画面与规则可预览。此房间只在本机服务验证；公开网页未部署房间后端，创建、加入、任务与投票暂不可用。';
export const RELAY_PUBLIC_SCOPE = '公开页可练习真实制图与撤销。异步发布、接棒和共享进度只在本机服务验证；公开网页未部署接力后端。';
