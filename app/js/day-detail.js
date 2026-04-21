// Day detail view — port of DayDetail + structured checklist.
// Notes shape: { note: string, todos: [{id, content, done}] }
// Live-save strategy:
//   - text inputs (note textarea, todo content): 'input' event, 200ms debounce
//   - checkbox toggle: 'change' event, instant save
//   - add/delete: structural change → patch DOM locally, no full re-render
//     (so the user's cursor/focus is never lost while typing)

(function () {
  'use strict';

  let rootEl = null;
  let saveTimer = null;
  // In-memory mirror of the current day's note data, shared across handlers.
  let noteState = null;

  function escape(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function buildVerdictTop(sel, lu, hd, hols, off, tiet) {
    const canChiNa = AmLich.canChiNam(sel.yy);
    const dowFull = AL.DOW_FULL[new Date(sel.yy, sel.mm - 1, sel.dd).getDay()];
    const lunCls = ['DD-lunar-day', lu.day === 1 && 'one', lu.day === 15 && 'fifteen'].filter(Boolean).join(' ');
    const tags = [];
    tags.push(`<span class="t ${hd ? 'good' : 'bad'}">${hd ? '● HOÀNG ĐẠO' : '▲ HẮC ĐẠO'}</span>`);
    if (off === 'holiday') tags.push(`<span class="t off">NGHỈ LỄ</span>`);
    if (off === 'weekend') tags.push(`<span class="t off" style="background:var(--cyan)">CUỐI TUẦN</span>`);
    hols.forEach(h => tags.push(`<span class="t" style="background:var(--amber);color:#0a0a0b">${escape(h.name)}</span>`));
    tags.push(`<span class="t tiet">TIẾT · ${escape(tiet)}</span>`);

    return `
      <div class="DD-top ${hd ? 'good' : 'bad'}">
        <div class="DD-lunar-wrap" data-month="TH.${AL.pad(lu.month)}${lu.leap ? '*' : ''} ÂL">
          <div class="${lunCls}">${lu.day}</div>
        </div>
        <div class="DD-mid">
          <div class="DD-mid-sol"><span class="dow">${escape(dowFull)}</span>, ngày ${sel.dd} tháng ${sel.mm} năm ${sel.yy}</div>
          <div class="DD-mid-luna">
            Âm lịch: <b>ngày ${lu.day} tháng ${lu.month}${lu.leap ? ' (nhuận)' : ''} năm ${escape(canChiNa)}</b>
          </div>
          <div class="DD-mid-tag">${tags.join('')}</div>
        </div>
        <div class="DD-verdict">
          <div class="DD-v-lbl">▸ VERDICT</div>
          <div class="DD-v-val ${hd ? 'good' : 'bad'}">${hd ? 'TỐT' : 'XẤU'}</div>
          <div style="font-size:9px;color:var(--ink-mute);letter-spacing:0.12em;text-transform:uppercase;font-weight:700">theo ngũ hành</div>
        </div>
      </div>`;
  }

  function buildHourGrid(gio) {
    const cells = gio.map(g =>
      `<div class="DD-hour ${g.good ? 'good' : ''}">
        <div class="chi">${escape(g.name)} ${g.good ? '●' : ''}</div>
        <div class="rg">${g.range}h</div>
      </div>`
    ).join('');
    return `
      <div class="DD-card">
        <h4>▰ GIỜ HOÀNG ĐẠO</h4>
        <div class="DD-hour-grid">${cells}</div>
        <div style="font-size:10px;color:var(--ink-mute);margin-top:auto;padding-top:10px;letter-spacing:0.04em">
          ● giờ hoàng đạo — giao dịch, ký kết, khởi hành
        </div>
      </div>`;
  }

  function buildSpecSheet(canChiNg, canChiTh, canChiNa, tiet) {
    const cell = (label, value, tone) => `
      <div class="DD-spec ${tone}">
        <div class="DD-spec-k">${label}</div>
        <div class="DD-spec-v">${escape(value)}</div>
      </div>`;
    return `
      <div class="DD-specs">
        ${cell('CAN CHI · NGÀY',  canChiNg, 'ng')}
        ${cell('CAN CHI · THÁNG', canChiTh, 'th')}
        ${cell('CAN CHI · NĂM',   canChiNa, 'na')}
        ${cell('TIẾT KHÍ',        tiet,     'ti')}
      </div>`;
  }

  // Single todo row — kept self-contained so add/delete can patch DOM directly.
  function todoRowHTML(todo) {
    return `
      <div class="DD-todo ${todo.done ? 'done' : ''}" data-id="${escape(todo.id)}">
        <input class="DD-todo-check" type="checkbox" data-role="toggle" ${todo.done ? 'checked' : ''} aria-label="đánh dấu hoàn thành">
        <input class="DD-todo-text"  type="text" data-role="text" value="${escape(todo.content)}" placeholder="// việc cần làm...">
        <button class="DD-todo-del" data-role="delete" aria-label="xóa">×</button>
      </div>`;
  }

  function checklistHTML(todos) {
    const done = todos.filter(t => t.done).length;
    const rows = todos.map(todoRowHTML).join('');
    const pct = todos.length ? Math.round((done / todos.length) * 100) : 0;
    return `
      <div class="DD-checklist" data-role="checklist">
        <div class="DD-todo-head">
          <span class="DD-todo-title">▸ CHECKLIST</span>
          <span class="DD-todo-count" data-role="count">${done}/${todos.length}</span>
        </div>
        <div class="DD-todo-progress"><div class="DD-todo-bar" data-role="progress" style="width:${pct}%"></div></div>
        <div class="DD-todos" data-role="todos">${rows}</div>
        <button class="DD-todo-add" data-role="add">+ thêm việc cần làm</button>
      </div>`;
  }

  function buildNotes(sel, data) {
    const key = AL.getKey(sel);
    return `
      <div class="DD-card">
        <h4>▰ GHI CHÚ CÁ NHÂN</h4>
        <div class="DD-notes">
          <textarea class="DD-note-text" data-role="note" placeholder="// viết ghi chú tự do cho ngày này...">${escape(data.note)}</textarea>
          ${checklistHTML(data.todos)}
          <div class="hint">lưu tự động · localStorage · key ${escape(key)}</div>
        </div>
      </div>`;
  }

  // ─ Save helpers ─────────────────────────────────────────────────────
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 200);
  }
  function flushSave() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!noteState) return;
    AL.setNote(AL.getSelected(), noteState);
    AL.bus.emit('note', AL.getSelected());
  }

  // ─ Local DOM patches (avoid full re-render while user is typing) ─────
  function updateCountAndBar() {
    if (!rootEl || !noteState) return;
    const cl = rootEl.querySelector('[data-role="checklist"]');
    if (!cl) return;
    const done = noteState.todos.filter(t => t.done).length;
    const total = noteState.todos.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const countEl = cl.querySelector('[data-role="count"]');
    const barEl   = cl.querySelector('[data-role="progress"]');
    if (countEl) countEl.textContent = `${done}/${total}`;
    if (barEl)   barEl.style.width = pct + '%';
  }

  function render() {
    if (!rootEl) return;
    const sel = AL.getSelected();
    const lu = AmLich.convert(sel.dd, sel.mm, sel.yy);
    const jd = lu.jd;
    const canChiNg = AmLich.canChiNgay(jd);
    const canChiTh = AmLich.canChiThang(sel.mm, sel.yy);
    const canChiNa = AmLich.canChiNam(sel.yy);
    const tiet = AmLich.getTietKhi(jd);
    const gio = AmLich.gioHoangDao(jd);
    const hd = AmLich.isHoangDaoDay(lu.month, jd);
    const hols = Holidays.getHolidays(sel.dd, sel.mm, sel.yy, lu);
    const off = Holidays.isOffDay(sel.dd, sel.mm, sel.yy, lu);
    noteState = AL.getNote(sel);

    rootEl.innerHTML = `
      <div class="DD">
        <div class="DD-head">
          <button class="DD-back" data-act="prev">« ngày trước</button>
          <div class="DD-crumb">/DAY / <b>${AL.pad(sel.dd)}.${AL.pad(sel.mm)}.${sel.yy}</b> / LUNAR <b>${lu.day}.${lu.month}</b></div>
          <button class="DD-back" data-act="next">ngày sau »</button>
        </div>
        ${buildVerdictTop(sel, lu, hd, hols, off, tiet)}
        ${buildSpecSheet(canChiNg, canChiTh, canChiNa, tiet)}
        <div class="DD-body-2col">
          ${buildNotes(sel, noteState)}
          ${buildHourGrid(gio)}
        </div>
      </div>
    `;
  }

  function step(delta) {
    // Flush any pending save for the outgoing day before switching.
    flushSave();
    const s = AL.getSelected();
    const d = new Date(s.yy, s.mm - 1, s.dd + delta);
    const nd = { dd: d.getDate(), mm: d.getMonth() + 1, yy: d.getFullYear() };
    AL.setSelected(nd);
    AL.bus.emit('select', nd);
    render();
  }

  // ─ Event handlers ────────────────────────────────────────────────────
  function handleClick(e) {
    const act = e.target.closest('[data-act]');
    if (act) {
      if (act.dataset.act === 'prev') step(-1);
      else if (act.dataset.act === 'next') step(1);
      return;
    }

    // + add todo
    if (e.target.matches('[data-role="add"]')) {
      if (!noteState) return;
      const t = { id: AL.uid(), content: '', done: false };
      noteState.todos.push(t);
      const todosEl = rootEl.querySelector('[data-role="todos"]');
      if (todosEl) {
        todosEl.insertAdjacentHTML('beforeend', todoRowHTML(t));
        const added = todosEl.lastElementChild;
        const input = added && added.querySelector('[data-role="text"]');
        if (input) input.focus();
      }
      updateCountAndBar();
      scheduleSave();
      return;
    }

    // × delete todo
    const del = e.target.closest('[data-role="delete"]');
    if (del) {
      if (!noteState) return;
      const row = del.closest('.DD-todo');
      if (!row) return;
      const id = row.dataset.id;
      noteState.todos = noteState.todos.filter(x => x.id !== id);
      row.remove();
      updateCountAndBar();
      scheduleSave();
      return;
    }
  }

  function handleInput(e) {
    if (!noteState) return;

    // free-text note
    if (e.target.matches('[data-role="note"]')) {
      noteState.note = e.target.value;
      scheduleSave();
      return;
    }

    // todo content
    if (e.target.matches('[data-role="text"]')) {
      const row = e.target.closest('.DD-todo');
      if (!row) return;
      const id = row.dataset.id;
      const t = noteState.todos.find(x => x.id === id);
      if (t) {
        t.content = e.target.value;
        scheduleSave();
      }
    }
  }

  function handleChange(e) {
    if (!noteState) return;

    // todo completion toggle
    if (e.target.matches('[data-role="toggle"]')) {
      const row = e.target.closest('.DD-todo');
      if (!row) return;
      const id = row.dataset.id;
      const t = noteState.todos.find(x => x.id === id);
      if (t) {
        t.done = e.target.checked;
        row.classList.toggle('done', t.done);
        updateCountAndBar();
        flushSave(); // instant — structural-ish change
      }
    }
  }

  function handleKeydown(e) {
    // Enter on a todo text input → create a new todo below and focus it.
    if (e.target.matches('[data-role="text"]') && e.key === 'Enter') {
      e.preventDefault();
      if (!noteState) return;
      const row = e.target.closest('.DD-todo');
      const id = row && row.dataset.id;
      const idx = noteState.todos.findIndex(x => x.id === id);
      const t = { id: AL.uid(), content: '', done: false };
      const pos = idx >= 0 ? idx + 1 : noteState.todos.length;
      noteState.todos.splice(pos, 0, t);
      const todosEl = rootEl.querySelector('[data-role="todos"]');
      if (todosEl) {
        const html = todoRowHTML(t);
        if (row && row.nextSibling) row.insertAdjacentHTML('afterend', html);
        else todosEl.insertAdjacentHTML('beforeend', html);
        const newRow = todosEl.children[pos];
        const input = newRow && newRow.querySelector('[data-role="text"]');
        if (input) input.focus();
      }
      updateCountAndBar();
      scheduleSave();
      return;
    }
    // Backspace on empty todo → delete it, focus prev row's input.
    if (e.target.matches('[data-role="text"]') && e.key === 'Backspace' && e.target.value === '') {
      e.preventDefault();
      if (!noteState) return;
      const row = e.target.closest('.DD-todo');
      if (!row) return;
      const id = row.dataset.id;
      const prev = row.previousElementSibling;
      noteState.todos = noteState.todos.filter(x => x.id !== id);
      row.remove();
      if (prev) {
        const input = prev.querySelector('[data-role="text"]');
        if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
      }
      updateCountAndBar();
      scheduleSave();
      return;
    }
    // Global arrow nav only when not inside a form field.
    if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  }

  function mount(container) {
    rootEl = container;
    rootEl.addEventListener('click', handleClick);
    rootEl.addEventListener('input', handleInput);
    rootEl.addEventListener('change', handleChange);
    window.addEventListener('keydown', handleKeydown);
    AL.bus.on('select', () => { if (AL.currentRoute() === 'day') render(); });
    render();
  }

  function unmount() {
    if (rootEl) {
      rootEl.removeEventListener('click', handleClick);
      rootEl.removeEventListener('input', handleInput);
      rootEl.removeEventListener('change', handleChange);
    }
    window.removeEventListener('keydown', handleKeydown);
    flushSave();
    rootEl = null;
    noteState = null;
  }

  window.DayDetail = { mount, unmount, render };
})();
