let uploadedFile = null;
let base64Data = null;
let mediaType = null;
let lastReport = null;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewCard = document.getElementById('previewCard');
const previewThumb = document.getElementById('previewThumb');
const previewName = document.getElementById('previewName');
const runBtn = document.getElementById('runBtn');
const clearBtn = document.getElementById('clearBtn');
const processing = document.getElementById('processing');
const errorBox = document.getElementById('errorBox');
const uploadStage = document.getElementById('uploadStage');
const reportStage = document.getElementById('reportStage');

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

function handleFile(file){
  if (!file.type.startsWith('image/')) return;
  uploadedFile = file;
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    mediaType = file.type;
    base64Data = result.split(',')[1];
    previewThumb.src = result;
    previewName.textContent = file.name;
    previewCard.classList.add('show');
    errorBox.classList.remove('show');
  };
  reader.readAsDataURL(file);
}

clearBtn.addEventListener('click', () => {
  uploadedFile = null; base64Data = null;
  fileInput.value = '';
  previewCard.classList.remove('show');
});

document.getElementById('newReviewBtn').addEventListener('click', () => {
  reportStage.classList.remove('show');
  uploadStage.style.display = 'block';
  previewCard.classList.remove('show');
  processing.classList.remove('show');
  fileInput.value = '';
  uploadedFile = null; base64Data = null;
});

const stepEls = document.querySelectorAll('.proc-step');
function animateSteps(){
  stepEls.forEach(el => el.classList.remove('active','done'));
  let i = 0;
  const interval = setInterval(() => {
    if (i > 0) stepEls[i-1].classList.add('done');
    if (i < stepEls.length) { stepEls[i].classList.add('active'); i++; }
    else clearInterval(interval);
  }, 900);
  return interval;
}

runBtn.addEventListener('click', async () => {
  if (!base64Data) return;
  runBtn.disabled = true;
  errorBox.classList.remove('show');
  processing.classList.add('show');
  const stepTimer = animateSteps();

  const category = document.getElementById('categorySelect').value;
  const market = document.getElementById('marketSelect').value;

  try{
    const parsed = await RemiewAPI.reviewLabel({ category, market, fileName: uploadedFile ? uploadedFile.name : '', mediaType, base64Data });
    lastReport = parsed;
    clearInterval(stepTimer);
    setTimeout(() => renderReport(parsed), 400);
  } catch(err){
    clearInterval(stepTimer);
    processing.classList.remove('show');
    runBtn.disabled = false;
    errorBox.textContent = "Couldn't complete the review — " + (err.message || "unknown error") + ". Try again, or use a clearer image.";
    errorBox.classList.add('show');
  }
});

function renderList(containerId, countId, items, cls){
  const container = document.getElementById(containerId);
  const countEl = document.getElementById(countId);
  container.innerHTML = '';
  countEl.textContent = items.length;
  if (items.length === 0){
    container.innerHTML = '<div class="empty-note">Nothing flagged here.</div>';
    return;
  }
  items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'finding ' + cls;
    div.style.animationDelay = (i * 0.08) + 's';
    div.innerHTML = `<div class="finding-title">${escapeHtml(item.title||'')}</div>
      <div class="finding-body">${escapeHtml(item.body||'')}</div>
      <span class="finding-ref">${escapeHtml(item.reference||'Verify applicable standard')}</span>`;
    container.appendChild(div);
  });
}

function renderMissing(items){
  const container = document.getElementById('missingList');
  document.getElementById('missingCount').textContent = items.length;
  container.innerHTML = '';
  if (items.length === 0){
    container.innerHTML = '<div class="empty-note">All standard elements appear visible in this image.</div>';
    return;
  }
  const div = document.createElement('div');
  div.className = 'finding warning';
  div.innerHTML = items.map(escapeHtml).join(' · ');
  container.appendChild(div);
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function renderReport(r){
  uploadStage.style.display = 'none';
  reportStage.classList.add('show');
  document.getElementById('reportTitle').textContent = r.product_name ? ('Review — ' + r.product_name) : 'Review report';
  renderList('criticalList','criticalCount', r.critical||[], 'critical');
  renderList('warningList','warningCount', r.warnings||[], 'warning');
  renderList('suggestionList','suggestionCount', r.suggestions||[], 'suggestion');
  renderMissing(r.missing||[]);
  runBtn.disabled = false;
}

document.getElementById('downloadBtn').addEventListener('click', () => {
  if (!lastReport) return;
  const r = lastReport;
  const lines = [];
  lines.push('PRODUCT REVIEW REPORT');
  lines.push(r.product_name || 'Untitled product');
  lines.push('Generated by Remiew by Cactus (prototype) — preliminary screening only, not a compliance certification.');
  lines.push('');
  const section = (name, items) => {
    lines.push('== ' + name.toUpperCase() + ' ==');
    if (!items.length) lines.push('None flagged.');
    items.forEach(i => { lines.push('- ' + i.title + ': ' + i.body + ' [' + (i.reference||'Verify applicable standard') + ']'); });
    lines.push('');
  };
  section('Critical issues', r.critical||[]);
  section('Warnings', r.warnings||[]);
  section('Suggestions', r.suggestions||[]);
  lines.push('== MISSING / NOT VISIBLE ==');
  lines.push((r.missing||[]).join(', ') || 'None');
  const blob = new Blob([lines.join('\n')], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (r.product_name || 'label_review') + '_report.txt';
  a.click();
});
