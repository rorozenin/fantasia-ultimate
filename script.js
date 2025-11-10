// script.js — main app glue: tabs, storage, gallery, chat integration
const STORAGE_PREFIX = "fantasia_v3_";
const KEY_USER = STORAGE_PREFIX + "user";
const KEY_CHARS = STORAGE_PREFIX + "chars";
const KEY_SELECTED = STORAGE_PREFIX + "selected";
const KEY_LOG_PREFIX = STORAGE_PREFIX + "log_";

let appState = {
  user: null,
  chars: [],
  selected: null,
  lang: "pt-BR",
  tts: true
};

function saveChars(){ localStorage.setItem(KEY_CHARS, JSON.stringify(appState.chars)); }
function loadChars(){ const s = localStorage.getItem(KEY_CHARS); return s? JSON.parse(s): []; }
function saveUser(){ if(appState.user) localStorage.setItem(KEY_USER, appState.user); else localStorage.removeItem(KEY_USER); }
function loadUser(){ return localStorage.getItem(KEY_USER) || null; }

function init(){
  // splash
  document.getElementById("startBtn").onclick = ()=>{
    document.getElementById("splash").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    boot();
  };
}

function boot(){
  // load state
  appState.user = loadUser();
  appState.chars = loadChars();
  appState.lang = localStorage.getItem(STORAGE_PREFIX+"lang") || "pt-BR";
  document.getElementById("langSelect").value = appState.lang;
  document.getElementById("userLabel").innerText = appState.user || "Convidado";
  bindUI();
  renderGallery();
  renderPreview();
  tryAutoRestore();
}

function bindUI(){
  // tabs
  document.querySelectorAll(".tabs .tab").forEach(btn=>{
    btn.onclick = ()=> {
      if(btn.classList.contains("locked")) { alert("🔒 Faça login e crie ou selecione um personagem para desbloquear o chat."); return; }
      document.querySelectorAll(".tabs .tab").forEach(t=>t.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
      document.getElementById(tab).classList.add("active");
      if(tab==="chat") openChat();
    };
  });
  // create actions
  document.getElementById("createBtn").onclick = createCharacterFromForm;
  document.getElementById("randomBtn").onclick = createRandomChar;
  document.getElementById("clearBtn").onclick = ()=> { document.getElementById("charName").value=""; document.getElementById("charDesc").value=""; };
  document.getElementById("genAutoAvatar").onclick = ()=> { generatePreviewAvatar(); };
  document.getElementById("avatarUpload").onchange = handleAvatarUpload;
  document.getElementById("langSelect").onchange = (e)=> { appState.lang = e.target.value; localStorage.setItem(STORAGE_PREFIX+"lang", appState.lang); }
  document.getElementById("logoutBtn").onclick = ()=> { appState.user=null; saveUser(); document.getElementById("userLabel").innerText="Convidado"; };
  document.getElementById("sendBtn").onclick = sendMessage;
  document.getElementById("userInput").onkeydown = (e)=> { if(e.key==="Enter") sendMessage(); };
  document.getElementById("ttsToggle").onclick = ()=> { appState.tts = !appState.tts; document.getElementById("ttsToggle").innerText = appState.tts? "🔊":"🔈"; };
  document.getElementById("exportLog").onclick = ()=> { exportLog(appState.selected); };
}

function renderGallery(){
  const gallery = document.getElementById("galleryList");
  gallery.innerHTML = "";
  const presets = getPresets();
  presets.forEach((p, i)=>{
    const tpl = document.getElementById("charCardTpl");
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector(".char-card");
    const avatarEl = card.querySelector(".char-avatar");
    avatarEl.innerHTML = `<img src="${p.avatar}" />`;
    card.querySelector(".char-name").innerText = p.name;
    card.querySelector(".char-meta").innerText = `${p.style} • ${p.emotion}`;
    const useBtn = node.querySelector(".useBtn");
    useBtn.onclick = ()=> { usePreset(p); };
    gallery.appendChild(node);
  });
  // also show user chars
  const userChars = appState.chars || [];
  userChars.forEach((c)=>{
    const tpl = document.getElementById("charCardTpl");
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector(".char-card");
    const avatarEl = card.querySelector(".char-avatar");
    avatarEl.innerHTML = `<img src="${c.avatar}" />`;
    card.querySelector(".char-name").innerText = c.name;
    card.querySelector(".char-meta").innerText = `${c.style} • ${c.emotion}`;
    const useBtn = node.querySelector(".useBtn");
    useBtn.onclick = ()=> { selectCharacter(c.id); };
    gallery.appendChild(node);
  });
}

function getPresets(){
  // a few default presets with generated avatars
  const presets = [
    { name:"Aelwyn", style:"romântico", emotion:"apaixonado", avatar: makeAvatarSVG("Aelwyn","romântico",240) },
    { name:"Kael", style:"misterioso", emotion:"tímido", avatar: makeAvatarSVG("Kael","misterioso",240) },
    { name:"Lyra", style:"fofo", emotion:"feliz", avatar: makeAvatarSVG("Lyra","fofo",240) },
    { name:"Ryo", style:"engraçado", emotion:"brincalhão", avatar: makeAvatarSVG("Ryo","engraçado",240) }
  ];
  return presets;
}

function usePreset(p){
  // save and select
  const id = Date.now().toString(36);
  const ch = { id, name:p.name, style:p.style, emotion:p.emotion, bio:"", avatar:p.avatar, gender:"random" };
  appState.chars.push(ch);
  saveChars();
  renderGallery();
  selectCharacter(id);
  // unlock chat tab
  document.querySelectorAll(".tabs .tab").forEach(t=> t.classList.remove("locked"));
  document.querySelector('.tabs .tab[data-tab="chat"]').classList.remove('locked');
  // open chat
  document.querySelector('.tabs .tab[data-tab="chat"]').click();
}

function selectCharacter(id){
  appState.selected = id;
  localStorage.setItem(KEY_SELECTED, id);
  document.getElementById("chat").classList.add("active");
  document.querySelectorAll(".tabs .tab").forEach(t=> t.classList.remove("locked"));
  document.querySelector('.tabs .tab[data-tab="chat"]').classList.remove('locked');
  openChat();
}

function tryAutoRestore(){
  const savedUser = loadUser();
  if(savedUser){ appState.user = savedUser; document.getElementById("userLabel").innerText = savedUser; }
  const savedChars = loadChars();
  if(savedChars && savedChars.length){ appState.chars = savedChars; renderGallery(); }
  const sel = localStorage.getItem(KEY_SELECTED);
  if(sel){ appState.selected = sel; }
}

function createCharacterFromForm(){
  const name = document.getElementById("charName").value.trim();
  const desc = document.getElementById("charDesc").value.trim();
  let style = document.getElementById("charStyle").value;
  const emotion = document.getElementById("charEmotion").value;
  const gender = document.getElementById("charGender").value;
  const user = document.getElementById("username").value.trim();
  if(user){ appState.user = user; saveUser(); document.getElementById("userLabel").innerText = user; }
  if(!name && !desc) return alert("Nome ou descrição é necessário");
  if(style==="auto"){
    // derive from description (simple)
    const d = (desc||"").toLowerCase();
    if(d.includes("romant")||d.includes("amor")) style="romântico";
    else if(d.includes("fof")||d.includes("doce")) style="fofo";
    else if(d.includes("sarcas")||d.includes("irônico")) style="engraçado";
    else style = "fofo";
  }
  const avatar = document.getElementById("previewArea").dataset.avatar || makeAvatarSVG(name||"OC", style, 240);
  const id = Date.now().toString(36);
  const ch = { id, name: name||("OC_"+id.slice(-4)), desc, style, emotion, avatar, gender };
  appState.chars.push(ch);
  saveChars();
  renderGallery();
  selectCharacter(id);
}

function createRandomChar(){
  const presets = getPresets();
  const p = presets[Math.floor(Math.random()*presets.length)];
  usePreset(p);
}

function generatePreviewAvatar(){
  const name = document.getElementById("charName").value.trim() || "OC";
  const style = document.getElementById("charStyle").value || "fofo";
  const data = makeAvatarSVG(name, style, 240);
  const preview = document.getElementById("previewArea");
  preview.innerHTML = `<div class="avatar"><img src="${data}" /></div><div><strong>${name}</strong><div class="muted">${style}</div></div>`;
  preview.dataset.avatar = data;
}

function handleAvatarUpload(e){
  const f = e.target.files[0];
  if(!f) return;
  const fr = new FileReader();
  fr.onload = ()=> {
    document.getElementById("previewArea").innerHTML = `<div class="avatar"><img src="${fr.result}" /></div><div><strong>${document.getElementById("charName").value||"OC"}</strong></div>`;
    document.getElementById("previewArea").dataset.avatar = fr.result;
  };
  fr.readAsDataURL(f);
}

// Chat functions
function openChat(){
  const sel = appState.selected;
  if(!sel) return alert("Selecione ou crie um personagem primeiro");
  const ch = appState.chars.find(x=>x.id===sel);
  if(!ch) return;
  document.getElementById("chatName").innerText = ch.name;
  document.getElementById("chatMeta").innerText = `${ch.style} • ${ch.emotion}`;
  document.getElementById("avatarMini").innerHTML = `<img src="${ch.avatar}" />`;
  document.getElementById("chatWallpaper").style.backgroundImage = `url(${ch.avatar})`;
  // load log
  const key = KEY_LOG_PREFIX + (appState.user||"anon");
  const logs = JSON.parse(localStorage.getItem(key) || "{}");
  const arr = logs[ch.id] || [];
  const box = document.getElementById("chatBox");
  box.innerHTML = "";
  arr.forEach(m=>{
    const div = document.createElement("div");
    div.className = "message " + (m.role==="user"?"user":"ai");
    div.innerHTML = `<div class="bubble">${m.text}</div>`;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;
}

function appendToLog(charId, role, text){
  const key = KEY_LOG_PREFIX + (appState.user||"anon");
  const logs = JSON.parse(localStorage.getItem(key) || "{}");
  logs[charId] = logs[charId] || [];
  logs[charId].push({ ts: Date.now(), role, text });
  localStorage.setItem(key, JSON.stringify(logs));
}

function sendMessage(){
  const input = document.getElementById("userInput");
  const txt = input.value.trim();
  if(!txt) return;
  const box = document.getElementById("chatBox");
  // render user
  const ud = document.createElement("div"); ud.className = "message user"; ud.innerHTML = `<div class="bubble">${txt}</div>`; box.appendChild(ud);
  appendToLog(appState.selected, "user", txt);
  box.scrollTop = box.scrollHeight;
  input.value = "";
  // get character and ask miniAI
  const ch = appState.chars.find(x=>x.id===appState.selected);
  if(!ch) return;
  const reply = generateReply(ch, txt, appState.lang || "pt-BR");
  // small delay + typing
  setTimeout(()=> {
    const ad = document.createElement("div"); ad.className = "message ai"; ad.innerHTML = `<div class="bubble">${reply.replace(/\n\n.*$/,"")}</div>`; box.appendChild(ad);
    appendToLog(appState.selected, "ai", reply);
    box.scrollTop = box.scrollHeight;
    if(appState.tts) speakText(reply.replace(/\n\n.*$/,""), appState.lang || "pt-BR");
  }, 600 + Math.random()*600);
}

function exportLog(charId){
  const key = KEY_LOG_PREFIX + (appState.user||"anon");
  const logs = JSON.parse(localStorage.getItem(key) || "{}");
  const out = logs[charId] || [];
  const blob = new Blob([JSON.stringify(out, null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `fantasia_log_${charId}.json`;
  a.click();
}

// helpers: makeAvatarSVG is provided by avatarGen.js (makeAvatarSVG)
// but include fallback if missing
if(typeof makeAvatarSVG === "undefined") {
  function makeAvatarSVG(n,s,z){ return ""; }
}

document.addEventListener("DOMContentLoaded", ()=> init());
