// Year view — 12 mini-month mosaic
// Click any mini-day → selects it, navigates to day view.

(function () {
  'use strict';

  let year = null;
  let rootEl = null;

  function escape(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function buildMini(m, today) {
    const { cells } = AL.buildMonth(year, m);
    const isCurrent = year === today.yy && m === today.mm;
    const dowHeader = AL.DOW_VI.map(d => `<div class="YV-mini-dow">${d[0]}</div>`).join('');
    const dayCells = cells.map(c => {
      const isToday = AL.isSameDay(c, today);
      const off = c.off === 'holiday';
      const cls = [
        'YV-mini-d',
        !c.inMonth && 'off',
        isToday && 'today',
        c.dow === 0 && 'sun',
        off && 'holiday',
        c.lu.day === 1 && 'mung-mot',
        c.lu.day === 15 && 'ram'
      ].filter(Boolean).join(' ');
      const lun = c.inMonth ? c.lu.day : '';
      const label = c.inMonth ? c.dd : '';
      const titleBits = c.inMonth ? `${c.dd}/${c.mm} · Â.L ${c.lu.day}/${c.lu.month}${c.hols.length ? ' · ' + c.hols[0].name : ''}` : '';
      const attrs = c.inMonth
        ? `data-cell data-dd="${c.dd}" data-mm="${c.mm}" data-yy="${c.yy}" style="cursor:pointer" title="${escape(titleBits)}"`
        : `style="cursor:default"`;
      return `<div class="${cls}" data-lun="${lun}" ${attrs}>${label}</div>`;
    }).join('');

    const stats = Holidays.monthStats(year, m);
    return `
      <div class="YV-month ${isCurrent ? 'current' : ''}" data-month="${m}">
        <div class="YV-month-head">
          <div style="display:flex;align-items:baseline;gap:8px">
            <span class="YV-month-num">${AL.pad(m)}</span>
            <span class="YV-month-name">${escape(AL.MONTHS_VI[m - 1])}</span>
          </div>
          <span style="font-size:9px;color:var(--ink-mute);letter-spacing:0.04em">${stats.off}ng</span>
        </div>
        <div class="YV-mini">${dowHeader}${dayCells}</div>
      </div>`;
  }

  function render() {
    if (!rootEl) return;
    const today = AL.today();
    const canChiY = AmLich.canChiNam(year);
    let totalOff = 0, totalWork = 0;
    for (let m = 1; m <= 12; m++) {
      const s = Holidays.monthStats(year, m);
      totalOff += s.off; totalWork += s.work;
    }

    const months = Array.from({ length: 12 }, (_, i) => buildMini(i + 1, today)).join('');
    rootEl.innerHTML = `
      <div class="YV">
        <div class="YV-head">
          <div class="YV-year">YEAR <span class="n">${year}</span></div>
          <div class="YV-canchi">· ${escape(canChiY.toUpperCase())}</div>
          <div class="YV-meta">
            <div><b style="color:var(--lime)">${totalWork}</b> ngày làm · <b style="color:var(--magenta)">${totalOff}</b> ngày nghỉ</div>
            <div style="margin-top:4px">
              <button data-act="prev"  class="yv-navbtn">«</button>
              <button data-act="today" class="yv-navbtn yv-today">HÔM NAY</button>
              <button data-act="next"  class="yv-navbtn">»</button>
            </div>
          </div>
        </div>
        <div class="YV-grid">${months}</div>
      </div>
    `;
  }

  function handleClick(e) {
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      const today = AL.today();
      if (a === 'prev') year -= 1;
      else if (a === 'next') year += 1;
      else if (a === 'today') year = today.yy;
      render();
      return;
    }
    const cell = e.target.closest('[data-cell]');
    if (cell) {
      const d = { dd: +cell.dataset.dd, mm: +cell.dataset.mm, yy: +cell.dataset.yy };
      AL.setSelected(d);
      AL.bus.emit('select', d);
      AL.goTo('day');
    }
  }

  function mount(container) {
    rootEl = container;
    if (year === null) year = AL.today().yy;
    rootEl.addEventListener('click', handleClick);
    AL.bus.on('select', () => { if (AL.currentRoute() === 'year') render(); });
    render();
  }

  function unmount() {
    if (rootEl) rootEl.removeEventListener('click', handleClick);
    rootEl = null;
  }

  function focusSelected() {
    year = AL.getSelected().yy;
    render();
  }

  window.YearView = { mount, unmount, render, focusSelected };
})();
