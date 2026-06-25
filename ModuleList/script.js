let data={categories:[],modules:[]};
let editCatIndex=-1, editModIndex=-1;
const STORAGE_KEY='modulevault-data';

const $=id=>document.getElementById(id);

function toast(msg,type=''){
  const t=$('toast');
  t.textContent=msg;
  t.className='toast show'+(type?' '+type:'');
  setTimeout(()=>t.className='toast',2600);
}

async function loadData(){
  try{
    const stored=localStorage.getItem(STORAGE_KEY);
    if(stored){
      data=JSON.parse(stored);
    }else{
      const r=await fetch('data.json');
      data=await r.json();
      saveData();
    }
  }catch(e){
    console.error('Load error:',e);
    data={categories:[],modules:[]};
  }
  renderAll();
}

function saveData(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
  return true;
}

function openModal(id){$(id).classList.add('open');}
function closeModal(id){$(id).classList.remove('open');}

function switchTab(tab){
  ['categories','modules','browse'].forEach(t=>{
    $('view-'+t).style.display=t===tab?'block':'none';
    $('tab-'+t).className='nav-btn'+(t===tab?' active':'');
  });
  if(tab==='browse') renderBrowse();
}

function renderAll(){renderCategories();renderModules();renderModuleSelect();renderBrowse();}

function chipClass(name){
  const n=(name||'').toLowerCase();
  if(n.includes('core')) return 'chip-core';
  if(n.includes('premium')) return 'chip-premium';
  if(n.includes('standard')) return 'chip-standard';
  return 'chip-default';
}

function renderCategories(){
  const el=$('cat-list');
  if(!data.categories.length){el.innerHTML='<div class="empty">📁 No categories yet.</div>';return;}
  el.innerHTML=data.categories.map((c,i)=>`
    <div class="module-card">
      <div class="module-info">
        <div class="module-title"><span class="chip ${chipClass(c.name)}">${c.name}</span></div>
        <div class="module-desc" style="margin-top:5px">${c.description||'<span style="opacity:.4">No description</span>'}</div>
        <div class="module-meta"><span style="font-size:11px;color:var(--muted)">${data.modules.filter(m=>m.category===c.name).length} module(s) · ${c.createdAt||''}</span></div>
      </div>
      <div class="module-actions">
        <button class="btn btn-warn btn-sm" onclick="openEditCategory(${i})">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCategory(${i})">🗑</button>
      </div>
    </div>`).join('');
}

function renderModules(){
  const el=$('mod-list');
  if(!data.modules.length){el.innerHTML='<div class="empty">🧩 No modules yet.</div>';return;}
  el.innerHTML=data.modules.map((m,i)=>`
    <div class="module-card">
      <div class="module-info">
        <div class="module-title">${m.title}</div>
        <div class="module-desc">${m.description||'<span style="opacity:.4">No description</span>'}</div>
        <div class="module-meta">
          ${m.category?`<span class="chip ${chipClass(m.category)}">${m.category}</span>`:''}
          <span style="font-size:11px;color:var(--muted)">${m.createdAt||''}</span>
        </div>
      </div>
      <div class="module-actions">
        <button class="btn btn-warn btn-sm" onclick="openEditModule(${i})">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteModule(${i})">🗑</button>
      </div>
    </div>`).join('');
}

function renderModuleSelect(){
  [$('mod-cat'),$('edit-mod-cat')].forEach(sel=>{
    if(!sel) return;
    const cur=sel.value;
    sel.innerHTML='<option value="">Select category</option>'+
      data.categories.map(c=>`<option value="${c.name}" ${c.name===cur?'selected':''}>${c.name}</option>`).join('');
  });
}

function renderBrowse(){
  $('browse-filters').innerHTML=`<button class="filter-chip active" data-cat="all" onclick="setBrowseFilter('all')">All</button>`+
    data.categories.map(c=>`<button class="filter-chip" data-cat="${c.name}" onclick="setBrowseFilter('${c.name}')">${c.name}</button>`).join('');
  renderBrowseList('all');
}

function renderBrowseList(filter){
  const el=$('browse-list');
  const list=filter==='all'?data.modules:data.modules.filter(m=>m.category===filter);
  if(!list.length){el.innerHTML='<div class="empty">🔍 No modules found.</div>';return;}
  const grouped={};
  list.forEach(m=>{const k=m.category||'Uncategorized';if(!grouped[k])grouped[k]=[];grouped[k].push(m);});
  el.innerHTML=Object.entries(grouped).map(([cat,mods])=>`
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px">
        <span class="chip ${chipClass(cat)}">${cat}</span>
        <span style="font-size:11px;color:var(--muted)">${mods.length} module(s)</span>
      </div>
      ${mods.map(m=>`
        <div class="module-card" style="margin-left:14px;border-left:2px solid var(--border)">
          <div class="module-info">
            <div class="module-title">${m.title}</div>
            <div class="module-desc">${m.description||''}</div>
          </div>
        </div>`).join('')}
    </div>`).join('');
}

function setBrowseFilter(cat){
  document.querySelectorAll('.filter-chip').forEach(c=>c.classList.toggle('active',c.dataset.cat===cat));
  renderBrowseList(cat);
}

async function addCategory(){
  const name=$('cat-name').value.trim();
  if(!name){toast('Category name required','error');return;}
  if(data.categories.find(c=>c.name.toLowerCase()===name.toLowerCase())){toast('Already exists','error');return;}
  data.categories.push({name,description:$('cat-desc').value.trim(),createdAt:new Date().toISOString().split('T')[0]});
  $('cat-name').value='';$('cat-desc').value='';
  saveData();
  toast('Category added ✓','success');
  renderAll();
}

function openEditCategory(i){
  editCatIndex=i;
  const c=data.categories[i];
  $('edit-cat-name').value=c.name;
  $('edit-cat-desc').value=c.description||'';
  openModal('edit-cat-modal');
}

async function saveEditCategory(){
  const oldName=data.categories[editCatIndex].name;
  const newName=$('edit-cat-name').value.trim();
  if(!newName){toast('Name required','error');return;}
  data.modules.forEach(m=>{if(m.category===oldName) m.category=newName;});
  data.categories[editCatIndex]={...data.categories[editCatIndex],name:newName,description:$('edit-cat-desc').value.trim()};
  closeModal('edit-cat-modal');
  saveData();
  toast('Category updated ✓','success');
  renderAll();
}

async function deleteCategory(i){
  const cat=data.categories[i];
  if(data.modules.find(m=>m.category===cat.name)){toast('Remove modules in this category first','error');return;}
  data.categories.splice(i,1);
  saveData();
  toast('Deleted','success');
  renderAll();
}

async function addModule(){
  const title=$('mod-title').value.trim();
  if(!title){toast('Module title required','error');return;}
  data.modules.push({title,category:$('mod-cat').value,description:$('mod-desc').value.trim(),createdAt:new Date().toISOString().split('T')[0]});
  $('mod-title').value='';$('mod-desc').value='';$('mod-cat').value='';
  saveData();
  toast('Module added ✓','success');
  renderAll();
}

function openEditModule(i){
  editModIndex=i;
  const m=data.modules[i];
  $('edit-mod-title').value=m.title;
  $('edit-mod-desc').value=m.description||'';
  renderModuleSelect();
  $('edit-mod-cat').value=m.category||'';
  openModal('edit-mod-modal');
}

async function saveEditModule(){
  const title=$('edit-mod-title').value.trim();
  if(!title){toast('Title required','error');return;}
  data.modules[editModIndex]={...data.modules[editModIndex],title,category:$('edit-mod-cat').value,description:$('edit-mod-desc').value.trim()};
  closeModal('edit-mod-modal');
  saveData();
  toast('Module updated ✓','success');
  renderAll();
}

async function deleteModule(i){
  const m=data.modules[i];
  data.modules.splice(i,1);
  saveData();
  toast('Deleted','success');
  renderAll();
}

function downloadExcel(){
  if(!data.categories.length&&!data.modules.length){toast('No data to export yet','warn');return;}
  
  const wb=XLSX.utils.book_new();
  
  // Sheet 1: Main - Category & Module (each row = 1 module)
  const mainRows=[['#','Category','Module Title','Description','Created Date']];
  let rowNum=1;
  data.modules.forEach(m=>mainRows.push([
    rowNum++,
    m.category||'Uncategorized',
    m.title,
    m.description||'',
    m.createdAt||''
  ]));
  const ws_main=XLSX.utils.aoa_to_sheet(mainRows);
  ws_main['!cols']=[{wch:5},{wch:18},{wch:30},{wch:50},{wch:14}];
  XLSX.utils.book_append_sheet(wb,ws_main,'Modules');
  
  // Sheet 2: Categories Detail
  const catRows=[['#','Category','Description','Module Count','Created Date']];
  data.categories.forEach((c,idx)=>catRows.push([
    idx+1,
    c.name,
    c.description||'',
    data.modules.filter(m=>m.category===c.name).length,
    c.createdAt||''
  ]));
  const ws_cat=XLSX.utils.aoa_to_sheet(catRows);
  ws_cat['!cols']=[{wch:5},{wch:18},{wch:35},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb,ws_cat,'Categories');
  
  // Sheet 3: Summary Stats
  const stats=[
    ['MODULEVAULT SUMMARY REPORT','',new Date().toLocaleDateString()],
    [],
    ['Total Categories',data.categories.length],
    ['Total Modules',data.modules.length],
    ['Average Modules per Category',(data.categories.length>0?(data.modules.length/data.categories.length).toFixed(2):0)],
    [],
    ['Category Breakdown','Module Count'],
    ...data.categories.map(c=>[c.name,data.modules.filter(m=>m.category===c.name).length])
  ];
  const ws_stats=XLSX.utils.aoa_to_sheet(stats);
  ws_stats['!cols']=[{wch:30},{wch:15}];
  XLSX.utils.book_append_sheet(wb,ws_stats,'Summary');
  
  XLSX.writeFile(wb,`ModuleVault_${new Date().toISOString().split('T')[0]}.xlsx`);
  toast('Excel downloaded ✓','success');
}

document.querySelectorAll('.modal-overlay').forEach(el=>{
  el.addEventListener('click',e=>{if(e.target===el)el.classList.remove('open');});
});

loadData();
