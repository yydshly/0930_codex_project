// Feedback follows field results, rather than the pointer event alone.
// In particular, accepting a saved stamp does not imply it changed any hair.
import {MAX_LOCAL_STAMPS} from './local-coat-field.js';
export const toolNames = Object.freeze({trim: '修剪', dye: '染色', curl: '卷曲', restore: '恢复'});

const count = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
const reasons = new Set(['changed', 'unchanged', 'full', 'invalid', 'miss']);

export function newEditStroke(tool) {
  return {tool, attempts: 0, affected: 0, changed: 0, misses: 0, unchanged: 0,
    invalid: 0, full: false, lastReason: null};
}

/** Mutate and return this stroke; changed/affected count actual field pixels. */
export function recordEditResult(stroke, result = {}) {
  if (!stroke) return stroke;
  let reason = reasons.has(result?.reason) ? result.reason : 'invalid';
  const changed = count(result?.changed);
  const affected = count(result?.affected);
  // A malformed "changed" result must not turn an empty stroke into success.
  if (reason === 'changed' && !changed) reason = 'unchanged';
  // An empty sampled region cannot establish that its hair is already short.
  if (reason === 'unchanged' && !affected) reason = 'miss';
  stroke.attempts++;
  stroke.lastReason = reason;
  if (reason === 'changed' || reason === 'unchanged') stroke.affected += affected;
  if (reason === 'changed') stroke.changed += changed;
  else if (reason === 'miss') stroke.misses++;
  else if (reason === 'unchanged') stroke.unchanged++;
  else if (reason === 'invalid') stroke.invalid++;
  else if (reason === 'full') stroke.full = true;
  return stroke;
}

/** Full capacity remains visible after pointerup, including partial strokes. */
export function editStrokeFeedback(stroke, {phase = 'finished', value = .35, limit = MAX_LOCAL_STAMPS, canUndo = true, grouped = false} = {}) {
  const name = toolNames[stroke?.tool] || '创作';
  const changed = count(stroke?.changed) > 0;
  const capacity = count(limit) || MAX_LOCAL_STAMPS;
  if (stroke?.full) {
    return changed
      ? `局部${name}已修改的部分保留；局部笔触已满（${capacity} 条），可撤销这一笔或清除后继续。`
      : `局部笔触已满（${capacity} 条），这一笔未进行局部${name}。${canUndo ? '请先撤销一笔或清除局部创作。' : '请清除局部创作后继续。'}`;
  }
  if (changed) {
    if (phase === 'drawing' && stroke.lastReason === 'miss') {
      return `已${name}的部分保留，移回角色身体上可继续，${grouped?'完成组合后整组撤销。':'松手后可撤销这一笔。'}`;
    }
    if(grouped)return phase==='drawing'?`正在局部${name}，本笔会加入组合步骤。`:`局部${name}已完成，已加入组合步骤；可继续换笔刷或完成组合。`;
    return phase === 'drawing'
      ? `正在局部${name}，松手后可撤销这一笔。`
      : `局部${name}已完成，可撤销这一笔、继续编辑或收藏。`;
  }
  if (stroke?.unchanged) {
    if (stroke.tool === 'restore') return '这一区域没有新的恢复变化。可换一个已编辑区域，或提高恢复力度。';
    if (stroke.tool === 'trim') {
      const percentage = Math.round(Math.max(.08, Math.min(1, Number.isFinite(value) ? value : .35)) * 100);
      if (percentage <= 8) {
        return `这一区域的毛长已不高于目标，未进一步修剪。已到最低修剪比例（原毛长的 8%），可换一个区域或撤销恢复。`;
      }
      return `这一区域的毛长已不高于目标，未进一步修剪。目标为原毛长的 ${percentage}%；调低保留比例可剪得更短。`;
    }
    return `这一区域没有发生新的${name}变化。可调整笔刷参数或换一个区域再试。`;
  }
  if (stroke?.invalid) {
    return `笔触参数无法使用，这一笔未进行局部${name}。请重新选择笔刷后操作。`;
  }
  return phase === 'drawing'
    ? `尚未命中角色身体，请移到身体表面按住拖动，进行局部${name}。`
    : `这一笔没有命中角色身体，未进行局部${name}。请在身体表面按住拖动。`;
}
