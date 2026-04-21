// Shell — shared helpers cho Âm Lịch app (vanilla port)
// Exposes window.AL namespace: buildMonth, notes, selected state, event bus, router.
// Storage: localStorage (simple key-value).

(function () {
  'use strict';

  const MONTHS_VI = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const DOW_VI = ['CN','T2','T3','T4','T5','T6','T7']; // Sun-first
  const DOW_FULL = ['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'];

  function pad(n){ return n < 10 ? '0' + n : '' + n; }

  // Build a 6x7 Sunday-first grid for month m of year y.
  function buildMonth(y, m) {
    const first = new Date(y, m - 1, 1);
    const firstDow = first.getDay();
    const lastDay = new Date(y, m, 0).getDate();
    const prevLast = new Date(y, m - 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < 42; i++) {
      let dd, mm, yy, inMonth;
      if (i < firstDow) {
        dd = prevLast - firstDow + i + 1;
        mm = m === 1 ? 12 : m - 1;
        yy = m === 1 ? y - 1 : y;
        inMonth = false;
      } else if (i < firstDow + lastDay) {
        dd = i - firstDow + 1;
        mm = m; yy = y; inMonth = true;
      } else {
        dd = i - firstDow - lastDay + 1;
        mm = m === 12 ? 1 : m + 1;
        yy = m === 12 ? y + 1 : y;
        inMonth = false;
      }
      const lu = AmLich.convert(dd, mm, yy);
      const hols = Holidays.getHolidays(dd, mm, yy, lu);
      const off = Holidays.isOffDay(dd, mm, yy, lu);
      cells.push({ dd, mm, yy, lu, hols, off, inMonth, dow: i % 7 });
    }
    return { cells, firstDow, lastDay };
  }

  function isSameDay(a, b) {
    return a.dd === b.dd && a.mm === b.mm && a.yy === b.yy;
  }

  // Pick dominant holiday tag for cell display.
  function pickTag(hols) {
    if (!hols.length) return null;
    const order = ['off', 'tradition', 'intl', 'ritual', 'note'];
    for (const k of order) {
      const h = hols.find(x => x.kind === k);
      if (h) return h;
    }
    return hols[0];
  }

  function getKey(d) { return `${d.yy}-${pad(d.mm)}-${pad(d.dd)}`; }

  // Notes — localStorage-backed kv. Key is YYYY-MM-DD.
  // Value shape: { note: string, todos: [{id, content, done}] }.
  // Legacy values stored as plain strings are migrated on read.
  const NOTES_KEY = 'amlich.notes.v1';
  function loadNotes() {
    try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveNotes(n) { localStorage.setItem(NOTES_KEY, JSON.stringify(n)); }

  // Always returns a live-editable shape; callers can mutate then call setNote.
  function getNote(d) {
    const raw = loadNotes()[getKey(d)];
    if (!raw) return { note: '', todos: [] };
    if (typeof raw === 'string') return { note: raw, todos: [] };
    return { note: raw.note || '', todos: Array.isArray(raw.todos) ? raw.todos : [] };
  }

  // Accepts an object or legacy string for convenience. Deletes key when empty.
  function setNote(d, data) {
    const n = loadNotes();
    const key = getKey(d);
    let obj;
    if (typeof data === 'string') obj = { note: data, todos: [] };
    else obj = { note: (data && data.note) || '', todos: (data && data.todos) || [] };
    if (!obj.note && obj.todos.length === 0) delete n[key];
    else n[key] = obj;
    saveNotes(n);
  }

  function allNotes() { return loadNotes(); }

  // Simple unique id generator for checklist items.
  function uid() {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  }

  // Selected date persistence (so day-view "remembers" across reloads).
  const SEL_KEY = 'amlich.selected.v1';
  function getSelected() {
    try {
      const s = JSON.parse(localStorage.getItem(SEL_KEY) || 'null');
      if (s && s.dd) return s;
    } catch (e) {}
    return today();
  }
  function setSelected(d) {
    localStorage.setItem(SEL_KEY, JSON.stringify({ dd: d.dd, mm: d.mm, yy: d.yy }));
  }

  function today() {
    const t = new Date();
    return { dd: t.getDate(), mm: t.getMonth() + 1, yy: t.getFullYear() };
  }

  function formatLunar(lu) {
    return `${lu.day}/${lu.month}${lu.leap ? ' (nhuận)' : ''}`;
  }

  // Simple pub/sub — views subscribe to 'select' to re-render on cross-view selection change.
  const bus = {
    handlers: {},
    on(evt, fn) { (this.handlers[evt] = this.handlers[evt] || []).push(fn); },
    emit(evt, payload) { (this.handlers[evt] || []).forEach(fn => fn(payload)); }
  };

  // Hash-based router — routes: #/month, #/day, #/year. Fallback: month.
  const routes = ['month', 'day', 'year'];
  function currentRoute() {
    const h = (location.hash || '').replace(/^#\/?/, '').split('/')[0];
    return routes.includes(h) ? h : 'month';
  }
  function goTo(route) {
    if (!routes.includes(route)) return;
    location.hash = '#/' + route;
  }

  window.AL = {
    MONTHS_VI, DOW_VI, DOW_FULL, pad,
    buildMonth, isSameDay, pickTag, getKey,
    getNote, setNote, allNotes, uid,
    getSelected, setSelected, today,
    formatLunar, bus,
    currentRoute, goTo, routes
  };
})();
