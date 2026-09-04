document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const open = item.classList.contains('open');
    item.parentElement.querySelectorAll('.faq-item.open').forEach(x => x.classList.remove('open'));
    if (!open) item.classList.add('open');
  });
});
