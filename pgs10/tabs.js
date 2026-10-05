/* Result / Documents tab switch (right column). */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const tabs = { result: [$('#tabResult'), $('#result')], docs: [$('#tabDocs'), $('#docs')] };
  function show(name) {
    Object.entries(tabs).forEach(([k, [b, p]]) => { const on = k === name; b.setAttribute('aria-selected', on ? 'true' : 'false'); p.hidden = !on; });
  }
  tabs.result[0].addEventListener('click', () => show('result'));
  tabs.docs[0].addEventListener('click', () => show('docs'));
  window.PGS10_TABS = { show };
  // doc-count badge
  const badge = $('#docCount');
  new MutationObserver(() => { const n = document.querySelectorAll('#docs .drow').length; badge.textContent = n; badge.hidden = !n; }).observe($('#docs'), { childList: true, subtree: true });
})();
