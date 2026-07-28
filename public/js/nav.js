document.querySelectorAll('.module-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.module-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const target = item.getAttribute('data-view');
    ['view-label','view-nip','view-claims'].forEach(id => {
      document.getElementById(id).style.display = (id === target) ? 'block' : 'none';
    });
    if (target === 'view-claims') refreshClaimNipBanner();
  });
});

function refreshClaimNipBanner(){
  const has = !!window.lastNipResult;
  const banner = document.getElementById('claimNipBanner');
  const missing = document.getElementById('claimNipMissing');
  if (banner) banner.style.display = has ? 'block' : 'none';
  if (missing) missing.style.display = has ? 'none' : 'block';
}
