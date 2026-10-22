document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const open = item.classList.contains('open');
    item.parentElement.querySelectorAll('.faq-item.open').forEach(x => x.classList.remove('open'));
    if (!open) item.classList.add('open');
  });
});

// Mobile navigation. Below 980px the links collapse behind the toggle.
document.querySelectorAll('.nav').forEach(nav => {
  const btn = nav.querySelector('.nav-toggle');
  const panel = nav.querySelector('.nav-links');
  if (!btn || !panel) return;
  const openLabel = btn.getAttribute('aria-label') || 'Open menu';
  const closeLabel = btn.dataset.close || 'Close menu';
  const setOpen = on => {
    nav.classList.toggle('open', on);
    btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? closeLabel : openLabel);
  };
  btn.addEventListener('click', e => { e.stopPropagation(); setOpen(!nav.classList.contains('open')); });
  panel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('click', e => { if (!nav.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); btn.focus(); }
  });
  // Leaving the mobile breakpoint must not strand the panel in an open state.
  matchMedia('(min-width:1201px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
});

// One submit per visitor on plain forms, with visible feedback while the request is in flight.
document.querySelectorAll('form.js-once').forEach(form => {
  form.addEventListener('submit', e => {
    if (form.dataset.sent) { e.preventDefault(); return; }
    form.dataset.sent = '1';
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = btn.dataset.sending || 'Sending…'; }
  });
});
