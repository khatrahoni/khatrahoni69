/* Simple games portal (vanilla JS)
   - Library stored in localStorage under "mini_games_library"
   - Each game: { id, title, thumb, url, tags: [] }
*/

const STORAGE_KEY = "mini_games_library_v1";
const sampleGames = [
  {
    id: "g1",
    title: "Sample Runner",
    thumb: "https://picsum.photos/seed/runner/800/450",
    url: "games/sample-runner/index.html",
    tags: ["arcade","runner"]
  },
  {
    id: "g2",
    title: "Mini Shooter",
    thumb: "https://picsum.photos/seed/shooter/800/450",
    url: "games/sample-shooter/index.html",
    tags: ["arcade","shooter"]
  }
];

// --- helpers
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function id(){ return 'g' + Math.random().toString(36).slice(2,9) }

function loadLib(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){ 
    // initialize with sample if empty
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleGames));
    return sampleGames.slice();
  }
  try { return JSON.parse(raw) } catch(e){ return [] }
}
function saveLib(arr){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

let library = loadLib();
let activeFilter = null;
let searchQuery = "";

// --- rendering
const gamesGrid = $('#gamesGrid');
const emptyMsg = $('#empty');
const tagListEl = $('#tagList');

function render(){
  const filtered = library.filter(g=>{
    const matchesTag = activeFilter ? g.tags.includes(activeFilter) : true;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || g.title.toLowerCase().includes(q) || g.tags.join(" ").toLowerCase().includes(q);
    return matchesTag && matchesSearch;
  });

  gamesGrid.innerHTML = "";
  if(filtered.length === 0){
    emptyMsg.style.display = "block";
  } else {
    emptyMsg.style.display = "none";
  }

  filtered.forEach(g=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="thumb"><img loading="lazy" src="${g.thumb || 'https://picsum.photos/seed/' + encodeURIComponent(g.title) + '/800/450'}" alt="${g.title}" /></div>
      <div class="card-title">${g.title}</div>
      <div class="card-tags">${g.tags.join(', ')}</div>
    `;
    card.addEventListener('click', ()=> openPlayer(g));
    gamesGrid.appendChild(card);
  });

  renderTags();
}

function gatherTags(){
  const s = new Set();
  library.forEach(g => g.tags.forEach(t => s.add(t)));
  return Array.from(s).sort();
}

function renderTags(){
  const tags = gatherTags();
  tagListEl.innerHTML = "";
  if(tags.length === 0){ tagListEl.innerHTML = '<div class="hint">No tags yet</div>'; return; }
  tags.forEach(t=>{
    const el = document.createElement('div');
    el.className = 'tag';
    el.textContent = t;
    if(activeFilter === t) el.style.outline = '2px solid rgba(255,176,76,0.2)';
    el.onclick = ()=> {
      activeFilter = activeFilter === t ? null : t;
      render();
    };
    tagListEl.appendChild(el);
  });
}

// --- player
const playerModal = $('#playerModal');
const playerTitle = $('#playerTitle');
const gameFrame = $('#gameFrame');
const openInNew = $('#openInNew');

function openPlayer(game){
  playerTitle.textContent = game.title;
  openInNew.href = game.url;
  // set iframe src — use as-is; best to serve via http
  gameFrame.src = game.url;
  playerModal.classList.remove('hidden');
}
$('#closePlayer').addEventListener('click', ()=> {
  gameFrame.src = 'about:blank';
  playerModal.classList.add('hidden');
});

// --- admin
const adminModal = $('#adminModal');
$('#adminBtn').addEventListener('click', ()=> adminModal.classList.remove('hidden'));
$('#closeAdmin').addEventListener('click', ()=> adminModal.classList.add('hidden'));

// add game
$('#addGameForm').addEventListener('submit', ev=>{
  ev.preventDefault();
  const f = ev.target;
  const title = f.title.value.trim();
  const thumb = f.thumb.value.trim();
  const url = f.url.value.trim();
  const tags = f.tags.value.split(',').map(s=>s.trim()).filter(Boolean);
  if(!title || !url) return alert('Title and Game URL are required.');
  const g = { id: id(), title, thumb, url, tags };
  library.unshift(g);
  saveLib(library);
  f.reset();
  adminModal.classList.add('hidden');
  render();
});

// import/export
$('#exportBtn').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(library, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'games-export.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#importFile').addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const text = await file.text();
  try{
    const arr = JSON.parse(text);
    if(!Array.isArray(arr)) throw new Error('Invalid format');
    // basic validation
    const cleaned = arr.map(x => ({
      id: x.id || id(),
      title: x.title || 'Untitled',
      thumb: x.thumb || '',
      url: x.url || '',
      tags: Array.isArray(x.tags) ? x.tags : (typeof x.tags === 'string' ? x.tags.split(',').map(s=>s.trim()) : [])
    }));
    library = cleaned.concat(library); // prepend imported
    saveLib(library);
    render();
    alert('Imported ' + cleaned.length + ' games.');
  }catch(err){
    alert('Import failed: ' + err.message);
  } finally {
    e.target.value = '';
  }
});

// search
$('#search').addEventListener('input', e=>{
  searchQuery = e.target.value;
  render();
});

$('#resetFilter').addEventListener('click', ()=>{ activeFilter = null; render(); });

// initial render
render();

// helpful note: if user opens page via file:// certain games may not load in the iframe due to browser restrictions.
// Use a small local server: `python -m http.server` from the folder with this project.
