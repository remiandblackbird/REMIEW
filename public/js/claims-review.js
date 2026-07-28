const VERDICT_STYLES = {
  pass:            { bg:'var(--pass-bg)',     fg:'var(--pass)',     label:'Meets threshold' },
  fail:            { bg:'var(--critical-bg)', fg:'var(--critical)', label:"Doesn't meet threshold" },
  borderline:      { bg:'var(--warning-bg)',  fg:'var(--warning)',  label:'Borderline — verify' },
  needs_evidence:  { bg:'var(--warning-bg)',  fg:'var(--warning)',  label:'Needs substantiation' },
  not_fsanz:       { bg:'var(--line)',        fg:'var(--ink-soft)', label:'Not FSANZ — ACL applies' },
  insufficient_info:{ bg:'var(--line)',       fg:'var(--ink-soft)', label:'Need more info' },
};

document.getElementById('checkClaimBtn').addEventListener('click', async () => {
  const claimErrorBox = document.getElementById('claimErrorBox');
  claimErrorBox.classList.remove('show');
  const claimText = document.getElementById('claimInput').value.trim();
  if (!claimText){
    claimErrorBox.textContent = "Type the claim you want to check first.";
    claimErrorBox.classList.add('show');
    return;
  }

  const btn = document.getElementById('checkClaimBtn');
  const origLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Checking…';

  const nip = window.lastNipResult;

  try{
    const parsed = await RemiewMockAPI.checkClaim(claimText, nip);

    const style = VERDICT_STYLES[parsed.verdict] || VERDICT_STYLES.insufficient_info;
    const badge = document.getElementById('claimVerdictBadge');
    badge.textContent = style.label;
    badge.style.background = style.bg;
    badge.style.color = style.fg;
    document.getElementById('claimTypeLabel').textContent = parsed.type_label || '';

    const card = document.getElementById('claimSummaryCard');
    card.className = 'finding ' + (parsed.verdict === 'fail' ? 'critical' : (parsed.verdict === 'pass' ? 'suggestion' : 'warning'));
    document.getElementById('claimSummaryTitle').textContent = parsed.summary_title || '';
    document.getElementById('claimSummaryBody').textContent = parsed.summary_body || '';
    document.getElementById('claimSummaryRef').textContent = parsed.reference || 'Verify applicable standard';
    document.getElementById('claimNextSteps').textContent = parsed.next_step || '';

    document.getElementById('claimOutput').style.display = 'block';
  } catch(err){
    claimErrorBox.textContent = "Couldn't check that claim — try again.";
    claimErrorBox.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = origLabel;
  }
});
