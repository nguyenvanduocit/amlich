// App shell — hash router + tab bar. Mounts exactly one view at a time into #view.

(function () {
  'use strict';

  const views = {
    month: { label: 'MONTH',  impl: () => window.MonthView  },
    day:   { label: 'DAY',    impl: () => window.DayDetail  },
    year:  { label: 'YEAR',   impl: () => window.YearView   }
  };

  let current = null;
  let viewEl = null;

  function renderTabs() {
    const bar = document.getElementById('tabs');
    const route = AL.currentRoute();
    // Preserve the donate chip across re-renders. The chip is appended by a
    // separate IIFE (at DOMContentLoaded); without this save-restore the
    // next hash change would wipe it via innerHTML and it would never come
    // back (the chip IIFE only runs once).
    const chip = document.getElementById('ns-donate-chip');
    bar.innerHTML = Object.entries(views).map(([k, v]) =>
      `<button class="tab ${k === route ? 'on' : ''}" data-route="${k}">
        <span class="tab-k">${k === 'month' ? '01' : k === 'day' ? '02' : '03'}</span>
        <span class="tab-l">${v.label}</span>
      </button>`
    ).join('') + `<div class="tab-meta">// ÂM LỊCH · NULLSECT</div>`;
    if (chip) bar.appendChild(chip);
  }

  function mount(route) {
    if (current === route) return;
    // tear down previous
    if (current && views[current]) {
      const prev = views[current].impl();
      if (prev && prev.unmount) prev.unmount();
    }
    viewEl.innerHTML = '';
    current = route;
    const v = views[route].impl();
    if (!v) {
      viewEl.innerHTML = `<div style="padding:40px;color:var(--ink-dim)">view <b>${route}</b> chưa load xong</div>`;
      return;
    }
    // align the view's internal cursor with selected date where applicable
    if (route === 'month' && v.focusSelected) v.focusSelected();
    else if (route === 'year' && v.focusSelected) v.focusSelected();
    v.mount(viewEl);
    renderTabs();
  }

  function onHashChange() { mount(AL.currentRoute()); }

  function onTabClick(e) {
    const btn = e.target.closest('[data-route]');
    if (!btn) return;
    AL.goTo(btn.dataset.route);
  }

  document.addEventListener('DOMContentLoaded', () => {
    viewEl = document.getElementById('view');
    document.getElementById('tabs').addEventListener('click', onTabClick);
    window.addEventListener('hashchange', onHashChange);
    // keyboard: 1/2/3 switch routes (when not typing)
    window.addEventListener('keydown', (e) => {
      if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '1') AL.goTo('month');
      else if (e.key === '2') AL.goTo('day');
      else if (e.key === '3') AL.goTo('year');
    });
    // initial: if no hash, default to month
    if (!location.hash) location.hash = '#/month';
    else mount(AL.currentRoute());
  });
})();
