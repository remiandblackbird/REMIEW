async function extractSpecFromFile(file){
  return RemiewAPI.extractSpec(file);
}

const nipDropZone = document.getElementById('nipDropZone');
const nipBatchInput = document.getElementById('nipBatchInput');
const nipDropStatus = document.getElementById('nipDropStatus');

nipDropZone.addEventListener('click', () => nipBatchInput.click());
nipDropZone.addEventListener('dragover', e => { e.preventDefault(); nipDropZone.classList.add('dragover'); });
nipDropZone.addEventListener('dragleave', () => nipDropZone.classList.remove('dragover'));
nipDropZone.addEventListener('drop', e => {
  e.preventDefault();
  nipDropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) processBatch(Array.from(e.dataTransfer.files));
});
nipBatchInput.addEventListener('change', e => {
  if (e.target.files.length) processBatch(Array.from(e.target.files));
  nipBatchInput.value = '';
});

async function processBatch(files){
  nipDropStatus.style.display = 'block';
  let done = 0, failed = 0;
  for (const file of files){
    nipDropStatus.textContent = `Reading ${file.name} (${done+failed+1} of ${files.length})…`;
    try{
      const parsed = await extractSpecFromFile(file);
      addIngredientRow({
        name: parsed.name || file.name.replace(/\.[^/.]+$/,''),
        energy: parsed.energy, protein: parsed.protein, fat: parsed.fat,
        sat: parsed.sat, carb: parsed.carb, sugars: parsed.sugars, sodium: parsed.sodium
      });
      done++;
    } catch(err){
      failed++;
    }
  }
  nipDropStatus.textContent = `Added ${done} ingredient${done===1?'':'s'}.` + (failed ? ` ${failed} file${failed===1?'':'s'} couldn't be read — add ${failed===1?'it':'them'} manually.` : ' Set the quantity used in your recipe for each new row.');
  setTimeout(() => { nipDropStatus.style.display = 'none'; }, 6000);
}

/* Reference table for common ingredients. Two tiers, kept separate deliberately:
   TIER 1 — chemically fixed, universally standard substances (sugar, salt, water, glucose).
   TIER 2 — real commodity foods sourced directly from the Australian Food Composition
            Database (AFCD Release 3, FSANZ) with a citable food key. These DO have natural
            batch-to-batch variation, so they're labelled "AFCD reference" (not "standard")
            in the UI — good enough for a working estimate, but a real supplier spec should
            still replace it before anything goes to print.
   Anything else (flour, flavour compounds, acids/additives with disputed energy-counting
   conventions like citric acid — see chat) is deliberately left out. No verified public
   figure = no auto-fill. */
const NIP_REFERENCE = [
  { match: ['sugar','white sugar','caster sugar','granulated sugar','sucrose'],
    name:'Sugar (sucrose)', energy:1700, protein:0, fat:0, sat:0, carb:100, sugars:100, sodium:0, tier:1 },
  { match: ['salt','table salt','sodium chloride'],
    name:'Salt (sodium chloride)', energy:0, protein:0, fat:0, sat:0, carb:0, sugars:0, sodium:39300, tier:1 },
  { match: ['water','filtered water','still water'],
    name:'Water', energy:0, protein:0, fat:0, sat:0, carb:0, sugars:0, sodium:0, tier:1 },
  { match: ['glucose','dextrose'],
    name:'Glucose (dextrose)', energy:1560, protein:0, fat:0, sat:0, carb:100, sugars:100, sodium:0, tier:1 },
  { match: ['sodium benzoate','sodium benzoate (e211)','e211'],
    name:'Sodium benzoate', energy:0, protein:0, fat:0, sat:0, carb:0, sugars:0, sodium:16000, tier:1 },
  { match: ['sodium bicarbonate','baking soda','bicarbonate of soda','e500'],
    name:'Sodium bicarbonate', energy:0, protein:0, fat:0, sat:0, carb:0, sugars:0, sodium:27400, tier:1 },
  { match: ['coconut cream','coconut cream, regular fat','coconut cream regular fat'],
    name:'Coconut cream, regular fat', energy:908, protein:1.6, fat:23.2, sat:18.8, carb:1.4, sugars:1.4, sodium:16, tier:2,
    source:'AFCD Release 3, FSANZ — food key F002982' },
  { match: ['coconut water','coconut water, fresh','fresh coconut water'],
    name:'Coconut water', energy:87, protein:0.5, fat:0.1, sat:0.09, carb:4.7, sugars:4.7, sodium:17, tier:2,
    source:'AFCD Release 3, FSANZ — food key F002984' },
];

function tryAutoFillFromReference(tr){
  const nameInput = tr.querySelector('[data-f="name"]');
  const typed = nameInput.value.trim().toLowerCase();
  const existingBadge = tr.querySelector('.ref-badge');
  if (existingBadge) existingBadge.remove();
  if (!typed) return;
  const hit = NIP_REFERENCE.find(r => r.match.includes(typed));
  if (!hit) return;
  // Only fill empty fields — never overwrite something the user already entered/extracted
  NIP_FIELDS.forEach(f => {
    const input = tr.querySelector('[data-f="'+f+'"]');
    if (!input.value) input.value = hit[f];
  });
  const span = document.createElement('span');
  span.className = 'ref-badge';
  const isTier2 = hit.tier === 2;
  const color = isTier2 ? 'var(--warning)' : 'var(--pass)';
  const label = isTier2 ? `✓ AFCD reference (${hit.source}) — verify before print` : '✓ standard reference value';
  span.style.cssText = `display:block;font-family:var(--font-mono);font-size:9px;color:${color};margin-top:3px;white-space:nowrap;`;
  span.textContent = label;
  nameInput.parentElement.style.position = 'relative';
  nameInput.insertAdjacentElement('afterend', span);
}

/* ---------- existing per-row extraction, now reusing extractSpecFromFile ---------- */
const ingBody = document.getElementById('ingBody');
const addIngBtn = document.getElementById('addIngBtn');
const specFileInput = document.getElementById('specFileInput');
const yieldWeight = document.getElementById('yieldWeight');
const nipErrorBox = document.getElementById('nipErrorBox');
let ingRowId = 0;
let activeExtractRow = null;

const NIP_FIELDS = ['energy','protein','fat','sat','carb','sugars','sodium'];

function addIngredientRow(prefill){
  const id = 'ing' + (ingRowId++);
  const tr = document.createElement('tr');
  tr.dataset.id = id;
  tr.innerHTML = `
    <td><input class="name-input" data-f="name" placeholder="e.g. Coconut cream" value="${prefill?.name||''}"></td>
    <td><input type="number" data-f="qty" placeholder="0" value="${prefill?.qty||''}"></td>
    <td><input type="number" data-f="energy" placeholder="0" value="${prefill?.energy||''}"></td>
    <td><input type="number" data-f="protein" placeholder="0" value="${prefill?.protein||''}"></td>
    <td><input type="number" data-f="fat" placeholder="0" value="${prefill?.fat||''}"></td>
    <td><input type="number" data-f="sat" placeholder="0" value="${prefill?.sat||''}"></td>
    <td><input type="number" data-f="carb" placeholder="0" value="${prefill?.carb||''}"></td>
    <td><input type="number" data-f="sugars" placeholder="0" value="${prefill?.sugars||''}"></td>
    <td><input type="number" data-f="sodium" placeholder="0" value="${prefill?.sodium||''}"></td>
    <td class="ing-row-actions">
      <button class="icon-btn extract" title="Extract values from a spec/PIF image">↑ spec</button>
      <button class="icon-btn remove" title="Remove row">✕</button>
    </td>`;
  tr.querySelector('.extract').addEventListener('click', () => {
    activeExtractRow = tr;
    specFileInput.click();
  });
  tr.querySelector('.remove').addEventListener('click', () => {
    tr.remove();
    updateYieldSuggestion();
  });
  tr.querySelectorAll('input[data-f="qty"]').forEach(i => i.addEventListener('input', updateYieldSuggestion));
  tr.querySelector('[data-f="name"]').addEventListener('blur', () => tryAutoFillFromReference(tr));
  ingBody.appendChild(tr);
  updateYieldSuggestion();
  if (prefill?.name) tryAutoFillFromReference(tr);
}

function updateYieldSuggestion(){
  let total = 0;
  ingBody.querySelectorAll('tr').forEach(tr => {
    const q = parseFloat(tr.querySelector('[data-f="qty"]').value) || 0;
    total += q;
  });
  if (!yieldWeight.dataset.userEdited){
    yieldWeight.value = total ? total : '';
  }
}
yieldWeight.addEventListener('input', () => { yieldWeight.dataset.userEdited = '1'; });

addIngBtn.addEventListener('click', () => addIngredientRow());
// seed with two empty rows to start
addIngredientRow(); addIngredientRow();

specFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || !activeExtractRow) return;
  const row = activeExtractRow;
  const btn = row.querySelector('.extract');
  const origLabel = btn.textContent;
  btn.textContent = '…';
  btn.disabled = true;

  try{
    const parsed = await extractSpecFromFile(file);
    if (parsed.name) row.querySelector('[data-f="name"]').value = parsed.name;
    NIP_FIELDS.forEach(f => {
      if (parsed[f] !== null && parsed[f] !== undefined) row.querySelector('[data-f="'+f+'"]').value = parsed[f];
    });
    updateYieldSuggestion();
  } catch(err){
    nipErrorBox.textContent = "Couldn't extract from that file — enter the values manually for this ingredient.";
    nipErrorBox.classList.add('show');
  } finally {
    btn.textContent = origLabel;
    btn.disabled = false;
    specFileInput.value = '';
    activeExtractRow = null;
  }
});

function roundSigFig(num, sig){
  if (num === 0 || !isFinite(num)) return 0;
  const d = Math.ceil(Math.log10(Math.abs(num)));
  const power = sig - d;
  const factor = Math.pow(10, power);
  return Math.round(num * factor) / factor;
}

document.getElementById('calcNipBtn').addEventListener('click', () => {
  nipErrorBox.classList.remove('show');
  const rows = Array.from(ingBody.querySelectorAll('tr'));
  const yieldG = parseFloat(yieldWeight.value);
  const servingG = parseFloat(document.getElementById('servingSize').value);

  if (!yieldG || yieldG <= 0){
    nipErrorBox.textContent = "Enter a valid final product yield weight before calculating.";
    nipErrorBox.classList.add('show');
    return;
  }
  if (!servingG || servingG <= 0){
    nipErrorBox.textContent = "Enter a valid serving size before calculating.";
    nipErrorBox.classList.add('show');
    return;
  }

  const totals = {energy:0,protein:0,fat:0,sat:0,carb:0,sugars:0,sodium:0};
  let hasData = false;
  rows.forEach(tr => {
    const qty = parseFloat(tr.querySelector('[data-f="qty"]').value) || 0;
    if (!qty) return;
    hasData = true;
    NIP_FIELDS.forEach(f => {
      const v = parseFloat(tr.querySelector('[data-f="'+f+'"]').value) || 0;
      totals[f] += (v * qty) / 100;
    });
  });

  if (!hasData){
    nipErrorBox.textContent = "Add at least one ingredient with a quantity before calculating.";
    nipErrorBox.classList.add('show');
    return;
  }

  const per100 = {};
  const perServe = {};
  NIP_FIELDS.forEach(f => {
    per100[f] = roundSigFig((totals[f] / yieldG) * 100, 3);
    perServe[f] = roundSigFig((totals[f] / yieldG) * servingG, 3);
  });

  const cal100 = roundSigFig(per100.energy / 4.184, 3);
  const calServe = roundSigFig(perServe.energy / 4.184, 3);

  const rowsOut = [
    {label:'Energy', s: perServe.energy + ' kJ / ' + calServe + ' Cal', h: per100.energy + ' kJ / ' + cal100 + ' Cal'},
    {label:'Protein', s: perServe.protein + ' g', h: per100.protein + ' g'},
    {label:'Fat, total', s: perServe.fat + ' g', h: per100.fat + ' g'},
    {label:'— saturated', s: perServe.sat + ' g', h: per100.sat + ' g', indent:true},
    {label:'Carbohydrate, total', s: perServe.carb + ' g', h: per100.carb + ' g'},
    {label:'— sugars', s: perServe.sugars + ' g', h: per100.sugars + ' g', indent:true},
    {label:'Sodium', s: (per100.sodium < 5 ? 'LESS THAN 5 mg' : perServe.sodium + ' mg'), h: (per100.sodium < 5 ? 'LESS THAN 5 mg' : per100.sodium + ' mg')},
  ];

  document.getElementById('colServing').textContent = 'Per Serving (' + servingG + 'g)';
  document.getElementById('col100').textContent = 'Per 100g';
  const nipBody = document.getElementById('nipBody');
  nipBody.innerHTML = '';
  rowsOut.forEach(r => {
    const tr = document.createElement('tr');
    if (r.indent) tr.className = 'indent';
    tr.innerHTML = `<td>${r.label}</td><td>${r.s}</td><td>${r.h}</td>`;
    nipBody.appendChild(tr);
  });
  document.getElementById('nipOutput').classList.add('show');
  window.lastNipResult = { per100, perServe, servingG, yieldG };
});

/* ---------- Ingredient Declaration ---------- */
const MANDATORY_ALLERGENS = ['milk','dairy','egg','fish','crustacean','prawn','shrimp','crab','tree nut','almond','cashew','walnut','hazelnut','pistachio','pecan','macadamia','peanut','sesame','soy','soybean','wheat','gluten','barley','rye','oat','lupin'];

let declItems = []; // {id, text, allergenName, isAllergen, needsCodeCheck}
let declItemId = 0;
let declMergeFlags = [];

function mergeFlavourRows(rows){
  const flavourRegex = /flavou?r/i;
  const naturalGroup = [], otherGroup = [], kept = [];
  rows.forEach(r => {
    if (flavourRegex.test(r.name)){
      if (/natural/i.test(r.name)) naturalGroup.push(r);
      else otherGroup.push(r);
    } else {
      kept.push(r);
    }
  });
  declMergeFlags = [];
  if (naturalGroup.length > 1){
    const qty = naturalGroup.reduce((s,r)=>s+r.qty,0);
    kept.push({name:'Natural Flavour', qty});
    declMergeFlags.push({severity:'warning', title:'Flavours merged', body:'Combined ' + naturalGroup.length + ' natural flavour ingredients (' + naturalGroup.map(r=>r.name).join(', ') + ') into one entry — confirm this is correct for the recipe.'});
  } else if (naturalGroup.length === 1){
    kept.push(naturalGroup[0]);
  }
  if (otherGroup.length > 1){
    const qty = otherGroup.reduce((s,r)=>s+r.qty,0);
    kept.push({name:'Flavour', qty});
    declMergeFlags.push({severity:'warning', title:'Flavours merged', body:'Combined ' + otherGroup.length + ' flavour ingredients (' + otherGroup.map(r=>r.name).join(', ') + ') into one entry — confirm this is correct for the recipe.'});
  } else if (otherGroup.length === 1){
    kept.push(otherGroup[0]);
  }
  return kept;
}

document.getElementById('genDeclBtn').addEventListener('click', async () => {
  const declErrorBox = document.getElementById('declErrorBox');
  declErrorBox.classList.remove('show');
  const btn = document.getElementById('genDeclBtn');
  const origLabel = btn.textContent;

  let rows = Array.from(ingBody.querySelectorAll('tr')).map(tr => ({
    name: tr.querySelector('[data-f="name"]').value.trim(),
    qty: parseFloat(tr.querySelector('[data-f="qty"]').value) || 0
  })).filter(r => r.name && r.qty > 0);

  if (rows.length === 0){
    declErrorBox.textContent = "Add at least one named ingredient with a quantity first.";
    declErrorBox.classList.add('show');
    return;
  }

  rows = mergeFlavourRows(rows);
  // Sort descending by quantity — this part is exact, no AI needed
  rows.sort((a,b) => b.qty - a.qty);

  btn.disabled = true;
  btn.textContent = 'Checking…';

  try{
    const parsed = await RemiewAPI.generateDeclaration(rows.map(r => r.name));

    declItems = (parsed.items||[]).map(item => {
      let display;
      const needsCodeCheck = !!(item.class_name && !item.ins_code);
      if (item.class_name && item.ins_code){
        display = `${item.class_name} (${item.ins_code})`;
      } else if (item.class_name){
        display = `${item.class_name} (${item.name})`;
      } else {
        display = item.name;
      }
      return {
        id: 'di' + (declItemId++),
        text: display,
        allergenName: item.name,
        isAllergen: !!item.allergen,
        needsCodeCheck
      };
    });

    const codeCheckFlags = declItems.filter(i => i.needsCodeCheck).map(i => ({
      severity:'warning',
      title:'Additive code not confirmed',
      body:`Couldn't confidently match a food additive code number for "${i.allergenName}" — look it up and edit the line before publishing.`
    }));

    renderDeclarationEditable();
    renderDeclFlags([...declMergeFlags, ...(parsed.flags||[]), ...codeCheckFlags]);
    document.getElementById('declOutput').style.display = 'block';
  } catch(err){
    declErrorBox.textContent = "Couldn't generate the declaration — try again.";
    declErrorBox.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = origLabel;
  }
});

document.getElementById('addDeclItemBtn').addEventListener('click', () => {
  declItems.push({ id:'di'+(declItemId++), text:'', allergenName:'', isAllergen:false, needsCodeCheck:false });
  renderDeclarationEditable();
  const inputs = document.querySelectorAll('#declItemsList .decl-item-text');
  if (inputs.length) inputs[inputs.length-1].focus();
});

function renderDeclFlags(flags){
  const declFlags = document.getElementById('declFlags');
  declFlags.innerHTML = '';
  flags.forEach(f => {
    const div = document.createElement('div');
    div.className = 'finding warning';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'finding-title';
    titleDiv.textContent = f.title || '';
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'finding-body';
    bodyDiv.textContent = f.body || '';
    div.appendChild(titleDiv);
    div.appendChild(bodyDiv);
    declFlags.appendChild(div);
  });
}

function renderDeclarationEditable(){
  const list = document.getElementById('declItemsList');
  list.innerHTML = '';
  declItems.forEach((it, idx) => {
    const row = document.createElement('div');
    row.className = 'decl-item-row';

    const controls = document.createElement('div');
    controls.className = 'decl-item-controls';
    const upBtn = document.createElement('button');
    upBtn.className = 'icon-btn';
    upBtn.textContent = '↑';
    upBtn.title = 'Move up';
    upBtn.disabled = idx === 0;
    upBtn.addEventListener('click', () => moveDeclItem(idx, -1));
    const downBtn = document.createElement('button');
    downBtn.className = 'icon-btn';
    downBtn.textContent = '↓';
    downBtn.title = 'Move down';
    downBtn.disabled = idx === declItems.length - 1;
    downBtn.addEventListener('click', () => moveDeclItem(idx, 1));
    controls.appendChild(upBtn);
    controls.appendChild(downBtn);

    const textInput = document.createElement('input');
    textInput.className = 'decl-item-text' + (it.isAllergen ? ' is-allergen' : '');
    textInput.value = it.text;
    textInput.addEventListener('input', () => {
      it.text = textInput.value;
      updateDeclPreview();
    });

    const allergenLabel = document.createElement('label');
    allergenLabel.className = 'decl-item-allergen';
    const allergenCheckbox = document.createElement('input');
    allergenCheckbox.type = 'checkbox';
    allergenCheckbox.checked = it.isAllergen;
    allergenCheckbox.addEventListener('change', () => {
      it.isAllergen = allergenCheckbox.checked;
      if (it.isAllergen && !it.allergenName) it.allergenName = it.text;
      textInput.className = 'decl-item-text' + (it.isAllergen ? ' is-allergen' : '');
      updateDeclPreview();
    });
    allergenLabel.appendChild(allergenCheckbox);
    allergenLabel.appendChild(document.createTextNode('allergen'));

    const removeBtn = document.createElement('button');
    removeBtn.className = 'icon-btn';
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', () => {
      declItems = declItems.filter(x => x.id !== it.id);
      renderDeclarationEditable();
    });

    row.appendChild(controls);
    row.appendChild(textInput);
    row.appendChild(allergenLabel);
    row.appendChild(removeBtn);
    list.appendChild(row);
  });
  updateDeclPreview();
}

function moveDeclItem(idx, dir){
  const target = idx + dir;
  if (target < 0 || target >= declItems.length) return;
  const tmp = declItems[idx];
  declItems[idx] = declItems[target];
  declItems[target] = tmp;
  renderDeclarationEditable();
}

function updateDeclPreview(){
  const declText = document.getElementById('declText');
  const declContains = document.getElementById('declContains');
  const parts = declItems.map(it => it.text ? (it.isAllergen ? `<strong>${escapeHtml(it.text)}</strong>` : escapeHtml(it.text)) : '');
  const visible = parts.filter(p => p);
  declText.innerHTML = visible.length ? (visible.join(', ') + '.') : '';
  const allergenNames = [...new Set(declItems.filter(it => it.isAllergen && it.text).map(it => (it.allergenName || it.text).toUpperCase()))];
  declContains.textContent = allergenNames.length ? ('CONTAINS: ' + allergenNames.join(', ') + '.') : 'No mandatory allergens marked.';
}
