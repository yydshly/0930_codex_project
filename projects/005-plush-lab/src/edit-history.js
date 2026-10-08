// Each transaction stores the baked coat, recent edits and guide directions. Appearance
// controls remain independent of brush undo, and a drag creates one entry.
const copy = snapshot => ({
  snapshot: typeof snapshot?.snapshot === 'string' ? snapshot.snapshot : '',
  edits: (snapshot?.edits || []).map(stamp => ({...stamp, uv: [...stamp.uv], point: [...stamp.point]})),
  field: (snapshot?.field || []).map(vector => [...vector]),
});
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function createEditHistory(limit = 24) {
  const capacity = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 24;
  let past = [], future = [], before = null;
  return {
    begin(snapshot) {
      if (before) return false;
      before = copy(snapshot);return true;
    },
    commit(snapshot, label = '编辑') {
      if (!before) return false;
      const previous = before;before = null;
      if (equal(previous, copy(snapshot))) return false;
      past.push({snapshot: previous, label});
      if (past.length > capacity) past.shift();
      future = [];return true;
    },
    cancel() {before = null;},
    undo(current) {
      if (!past.length || before) return null;
      const entry = past.pop();future.push({snapshot: copy(current), label: entry.label});
      return {snapshot: copy(entry.snapshot), label: entry.label};
    },
    redo(current) {
      if (!future.length || before) return null;
      const entry = future.pop();past.push({snapshot: copy(current), label: entry.label});
      return {snapshot: copy(entry.snapshot), label: entry.label};
    },
    clear() {past = [];future = [];before = null;},
    get canUndo() {return past.length > 0;},
    get canRedo() {return future.length > 0;},
  };
}
