// Month view — port of VariationD (hero from C + grid/ticker/stats from A)
// Vanilla render: call MonthView.mount(container) once, then update via nav or bus 'select'.

(function () {
  'use strict';

  // Internal view state — only month cursor lives here; selection lives in AL bus/storage.
  let ym = null;

  function escape(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function init() {
    const t = AL.today();
    ym = { y: t.yy, m: t.mm };
  }

  function prev() { ym = ym.m === 1 ? { y: ym.y - 1, m: 12 } : { y: ym.y, m: ym.m - 1 }; render(); }
  function next() { ym = ym.m === 12 ? { y: ym.y + 1, m: 1 } : { y: ym.y, m: ym.m + 1 }; render(); }
  function goToday() {
    const t = AL.today();
    ym = { y: t.yy, m: t.mm };
    render();
  }

  function wdRemainInMonth(today) {
    if (today.yy !== ym.y || today.mm !== ym.m) return null;
    let n = 0;
    const last = new Date(ym.y, ym.m, 0).getDate();
    for (let d = today.dd + 1; d <= last; d++) {
      const lu = AmLich.convert(d, ym.m, ym.y);
      if (!Holidays.isOffDay(d, ym.m, ym.y, lu)) n++;
    }
    return n;
  }

  function buildHeroHTML(today) {
    const firstLu = AmLich.convert(1, ym.m, ym.y);
    const canChiM = AmLich.canChiThang(ym.m, ym.y);
    const canChiY = AmLich.canChiNam(ym.y);
    const tietNow = AmLich.getTietKhi(AmLich.jdFromDate(today.dd, today.mm, today.yy));
    return `
      <div class="vC-hero">
        <div class="vC-hero-left">
          <div class="vC-m-num">T${ym.m}<span class="slash">/</span><small>${ym.y}</small></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:4px;min-width:0">
            <div class="vC-m-sub">
              ÂM LỊCH · THÁNG <b>${firstLu.month}</b> · ${escape(canChiY.toUpperCase())} · ${escape(canChiM.toUpperCase())}
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <button data-act="prev"  class="mv-navbtn">« prev</button>
              <button data-act="today" class="mv-navbtn mv-today">● HÔM NAY</button>
              <button data-act="next"  class="mv-navbtn">next »</button>
            </div>
          </div>
        </div>
        <div class="vC-hero-right">
          <div class="vC-tk-lbl">▸ TIẾT KHÍ HIỆN TẠI</div>
          <div class="vC-tk-big">${escape(tietNow)}</div>
          <div class="vC-tk-desc">// khí tiết đương thời · chu kỳ mặt trời</div>
        </div>
      </div>`;
  }

  function buildTickerHTML(today, nextH, wdRemain) {
    const luToday = AmLich.convert(today.dd, today.mm, today.yy);
    const chunk = `
      <span><b>▰ HÔM NAY</b> ${today.dd}/${today.mm}/${today.yy} · Â.L ${luToday.day}/${luToday.month}</span>
      <span class="dot">◆</span>
      ${nextH ? `<span><b>KỲ NGHỈ KẾ TIẾP</b> ${escape(nextH.holiday.name)} — còn ${nextH.daysAway} ngày</span><span class="dot">◆</span>` : ''}
      <span><b>CÒN LẠI THÁNG</b> ${wdRemain !== null ? wdRemain + ' ngày làm' : '—'}</span>
      <span class="dot">◆</span>
      <span>▚▚ signal/noise · v0.4.2</span>
      <span class="dot">◆</span>
    `;
    return `<div class="vA-ticker"><div class="vA-ticker-inner">${chunk}${chunk}</div></div>`;
  }

  function buildCellHTML(c, today, sel) {
    const isToday = AL.isSameDay(c, today);
    const isSel = AL.isSameDay(c, sel);
    const tag = AL.pickTag(c.hols);
    const hd = AmLich.isHoangDaoDay(c.lu.month, c.lu.jd);
    const classes = [
      'vA-cell',
      !c.inMonth && 'off',
      isToday && 'today',
      isSel && 'selected',
      c.dow === 0 && 'sun-col',
      (c.dow === 0 || c.dow === 6) && 'weekend',
      c.off === 'holiday' && 'holiday-off',
      !hd && 'bad'
    ].filter(Boolean).join(' ');
    const lunCls = [
      'lun',
      c.lu.day === 1 && 'one',
      c.lu.day === 15 && 'fifteen',
      c.lu.day === 1 && 'new-month'
    ].filter(Boolean).join(' ');
    const chi = AmLich.canChiNgay(c.lu.jd).split(' ')[1];
    const tagEl = tag ? `<span class="tag ${tag.kind === 'off' ? 'off' : tag.kind === 'tradition' ? 'trad' : tag.kind === 'intl' ? 'intl' : tag.kind === 'ritual' ? 'ritual' : 'note'}">${escape(tag.tag || tag.name)}</span>` : '';
    return `
      <div class="${classes}" data-cell data-dd="${c.dd}" data-mm="${c.mm}" data-yy="${c.yy}">
        <div class="vA-cell-top">
          <span class="${lunCls}" data-m="${c.lu.month}">${c.lu.day}</span>
          <span class="sol">${AL.pad(c.dd)}/${AL.pad(c.mm)}</span>
        </div>
        ${c.inMonth ? `<div class="mv-chi">${escape(chi)}</div>` : ''}
        <div class="tags">${tagEl}</div>
        ${c.inMonth ? `<span class="hd">${hd ? 'HĐ' : 'HẮC'}</span>` : ''}
      </div>`;
  }

  function buildStatsHTML(stats, wdRemain, nextH) {
    return `
      <div class="vA-stats">
        <div class="vA-stat lime">
          <div class="vA-stat-lbl">NGÀY LÀM</div>
          <div class="vA-stat-val">${stats.work}</div>
          <div class="vA-stat-sub">/ ${stats.total} tổng</div>
        </div>
        <div class="vA-stat mag">
          <div class="vA-stat-lbl">NGÀY NGHỈ</div>
          <div class="vA-stat-val">${stats.off}</div>
          <div class="vA-stat-sub">cuối tuần + lễ</div>
        </div>
        <div class="vA-stat cyan">
          <div class="vA-stat-lbl">CÒN LẠI</div>
          <div class="vA-stat-val">${wdRemain !== null ? wdRemain : '—'}</div>
          <div class="vA-stat-sub">ngày làm trong tháng</div>
        </div>
        <div class="vA-stat amber">
          <div class="vA-stat-lbl">KỲ NGHỈ KẾ</div>
          <div class="vA-stat-val">${nextH ? nextH.daysAway + 'd' : '—'}</div>
          <div class="vA-stat-sub">${nextH ? escape(nextH.holiday.name) : 'không'}</div>
        </div>
      </div>`;
  }

  let rootEl = null;

  function render() {
    if (!rootEl) return;
    const today = AL.today();
    const sel = AL.getSelected();
    const { cells } = AL.buildMonth(ym.y, ym.m);
    const stats = Holidays.monthStats(ym.y, ym.m);
    const nextH = Holidays.nextHoliday(new Date(today.yy, today.mm - 1, today.dd));
    const wdRemain = wdRemainInMonth(today);

    const dowHeader = AL.DOW_VI.map((d, i) => {
      const cls = i === 0 ? 'sun' : i === 6 ? 'sat' : '';
      return `<div class="vA-dow ${cls}">${d === 'CN' ? 'CN / SUN' : d}</div>`;
    }).join('');

    rootEl.innerHTML = `
      <div class="vA">
        ${buildHeroHTML(today)}
        ${buildStatsHTML(stats, wdRemain, nextH)}
        ${buildTickerHTML(today, nextH, wdRemain)}
        <div class="vA-grid">
          ${dowHeader}
          ${cells.map(c => buildCellHTML(c, today, sel)).join('')}
        </div>
      </div>
    `;
  }

  function handleClick(e) {
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'prev') prev();
      else if (a === 'next') next();
      else if (a === 'today') goToday();
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
    if (!ym) init();
    rootEl.addEventListener('click', handleClick);
    AL.bus.on('select', () => { if (AL.currentRoute() === 'month') render(); });
    AL.bus.on('note', () => { /* month view doesn't reflect notes inline; skip */ });
    render();
  }

  function unmount() {
    if (rootEl) rootEl.removeEventListener('click', handleClick);
    rootEl = null;
  }

  // Ensure the selected date is visible — when nav routes to month from elsewhere,
  // jump cursor to the selected month.
  function focusSelected() {
    const s = AL.getSelected();
    ym = { y: s.yy, m: s.mm };
    render();
  }

  window.MonthView = { mount, unmount, render, focusSelected };
})();
