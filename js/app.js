(async function(){
const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
const { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
const { getFirestore, collection, addDoc, deleteDoc, serverTimestamp, query, orderBy, limit, onSnapshot, doc, getDoc, setDoc, updateDoc, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
const firebaseConfig = {
  apiKey: "AIzaSyCvn2_z1FN2XMN_pgR9IiExRkRNMgZfhIY",
  authDomain: "clube-do-auto.firebaseapp.com",
  projectId: "clube-do-auto",
  storageBucket: "clube-do-auto.firebasestorage.app",
  messagingSenderId: "647571720442",
  appId: "1:647571720442:web:4257dd525b59bd89b62143"
};

const HARD_ADMINS = new Set(["admin@clubedoauto.com","frank.since96@gmail.com","devfrank@clubedoauto.com"].map(s=>s.toLowerCase()));
const ROLE_ORDER = ["repasse","consultor","closer","gerente","admin"];

const el=(id)=>document.getElementById(id);
const v=(id)=>(el(id)?.value??"").toString().trim();
const lower=(s)=>(s??"").toString().trim().toLowerCase();

function dealBadgeHtml(val){
  const v = (val||"SEM").toString().toUpperCase();
  if(v==="FECHADO") return "<span class='dealBadge dealWin'>FECHADO</span>";
  if(v==="QUASE") return "<span class='dealBadge dealNear'>QUASE</span>";
  if(v==="NAO") return "<span class='dealBadge dealLose'>NÃO</span>";
  return "<span class='dealBadge dealNone'>SEM</span>";
}
function canSetDeal(){ return (currentRole==="admin" || currentRole==="gerente"); }

function getFirstLineValue(reportText, label){
  const t = (reportText||"").toString();
  const re1 = new RegExp("\\*"+label+"\\*:\\s*(.+)$","mi");
  const m1 = t.match(re1);
  if(m1 && m1[1]) return m1[1].trim();
  const re2 = new RegExp(label+":\\s*(.+)$","mi");
  const m2 = t.match(re2);
  if(m2 && m2[1]) return m2[1].trim();
  return "";
}

function getAvaliadores(){ return v("avaliadores").split(/[\/;,]+/).map(x=>x.trim()).filter(Boolean); }
function getAvaliadoresText(){ return v("avaliadores"); }
function toggleDebitos(){ const sim=(v("debitosSel")||"Não")==="Sim"; el("debitosValorWrap").classList.toggle("hidden", !sim); if(!sim) el("debitosValor").value=""; }
function toggleFin(){ const sim=(v("finSel")||"Não")==="Sim"; el("finValorWrap").classList.toggle("hidden", !sim); if(!sim) el("finValor").value=""; }

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
await setPersistence(auth, browserLocalPersistence);

const firebaseApi = { db, auth, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, query, orderBy, limit, onSnapshot, getDocs };
let usersModule = null;

let isGuest=false, currentRole="consultor", canHistory=false, isAdmin=false, canPainel=false, canSeller=false;

function isCatalogOnlyRole(){ return false; }
function formatRoleLabel(role){
  const r=(role||"").toString().toLowerCase();
  if(r==="admin") return "ADM";
  if(r==="gerente") return "GERENTE";
  if(r==="closer") return "CLOSER";
  if(r==="consultor") return "CONSULTOR";
  if(r==="repasse") return "REPASSE";
  if(r==="convidado") return "CONVIDADO";
  if(r==="cliente") return "CLIENTE";
  return (role||"—").toString().toUpperCase();
}
function canSeeCatalogFipe(){
  return !["cliente","convidado"].includes((currentRole||"").toString().toLowerCase());
}
function isBlindadoItem(item){
  if(!item) return false;
  if(item.blindado===true) return true;
  const versao=((item.versao||"")+"").toLowerCase();
  const desc=((item.descricao||"")+"").toLowerCase();
  return versao.includes("blindagem") || versao.includes("blindado") || desc.includes("blindado");
}
function computePermissions(){
  canHistory=(currentRole==="admin"||currentRole==="gerente"||currentRole==="closer");
  isAdmin=(currentRole==="admin");
  canPainel=canHistory;
  canSeller=(currentRole==="admin"||currentRole==="gerente"||currentRole==="closer"||currentRole==="consultor");
}
function setRoleUI(){
  if(el("roleTxt")) el("roleTxt").textContent=formatRoleLabel(currentRole);
  if(el("sidebarRolePill")) el("sidebarRolePill").textContent=formatRoleLabel(currentRole);
  const onlyCatalog = isCatalogOnlyRole();

  if(el("tabNova")) el("tabNova").classList.toggle("hidden", false);
  if(el("tabHist")) el("tabHist").classList.toggle("hidden", false);
  if(el("tabPainel")) el("tabPainel").classList.toggle("hidden", !canPainel);
  if(el("tabUsers")) el("tabUsers").classList.toggle("hidden", !isAdmin);

  if(el("tabNovaMobile")) el("tabNovaMobile").classList.toggle("hidden", false);
  if(el("tabHistMobile")) el("tabHistMobile").classList.toggle("hidden", false);

  const manageBtn = el("tabGestaoMobile");
  if(manageBtn){
    const manageTab = isAdmin ? "users" : (canPainel ? "painel" : "");
    manageBtn.dataset.target = manageTab;
    manageBtn.classList.toggle("hidden", !manageTab || onlyCatalog);
    manageBtn.querySelector("span:last-child").textContent = isAdmin ? "Usuários" : "Painel";
    manageBtn.querySelector(".navIcon").textContent = isAdmin ? "👥" : "📊";
  }
}
usersModule = window.createUsersModule({
  firebase: firebaseApi,
  el,
  lower,
  escapeHtml: (s)=>escapeHtml(s),
  ROLE_ORDER,
  HARD_ADMINS,
  getState: ()=>({ isGuest, isAdmin, currentRole }),
  setCurrentRole: (role)=>{ currentRole=role; },
  computePermissions,
  setRoleUI
});
const refreshUsersIndex = (...args)=>usersModule.refreshUsersIndex(...args);
const getUserLabelByUid = (...args)=>usersModule.getUserLabelByUid(...args);
const ensureUserDoc = (...args)=>usersModule.ensureUserDoc(...args);
const openUsers = (...args)=>usersModule.openUsers(...args);

const SPLASH_MIN_TIME = 1250;
const splashStartedAt = Date.now();
let splashDone = false;
function finishSplash(){
  if(splashDone) return;
  const splash=el("appSplash");
  if(!splash){ splashDone=true; return; }
  const wait=Math.max(0, SPLASH_MIN_TIME - (Date.now()-splashStartedAt));
  window.setTimeout(()=>{
    splash.classList.add("is-hidden");
    splashDone=true;
    window.setTimeout(()=>{ try{ splash.remove(); }catch(e){} }, 650);
  }, wait);
}
function showLogin(){ el("screenLogin").style.display="block"; el("screenApp").classList.add("hidden"); finishSplash(); }
function showApp(){ el("screenLogin").style.display="none"; el("screenApp").classList.remove("hidden"); finishSplash(); }


function onlyDigits(s){ return (s??"").toString().replace(/[^\d]/g,""); }
function fmtKM(raw){ const d=onlyDigits(raw); if(!d) return ""; return new Intl.NumberFormat("pt-BR").format(Number(d)); }
function parseBRLNumber(raw){
  let txt=(raw??"").toString().trim();
  if(!txt) return null;
  txt=txt.replace(/\s/g,"").replace(/R\$/gi,"").replace(/[^\d,.-]/g,"");
  if(!txt) return null;
  const hasComma=txt.includes(",");
  const hasDot=txt.includes(".");
  if(hasComma){
    txt=txt.replace(/\./g,"").replace(",",".");
  }else if(hasDot){
    const parts=txt.split(".");
    const last=parts[parts.length-1] || "";
    txt = (last.length===2 && parts.length===2) ? txt : txt.replace(/\./g,"");
  }
  const num=Number(txt);
  return Number.isFinite(num) ? num : null;
}
function fmtBRL(raw){
  const num=parseBRLNumber(raw);
  if(num==null) return "";
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(num).replace(/ /g," ");
}
function plateBR(raw){ return (raw||"").toString().toUpperCase().replace(/\s+/g,"").trim(); }
function isArVersion(){
  return ["Completo","Completo + 7 Lugares","Apenas AR"].includes(v("versao"));
}
function getVersaoCompleta(){
  let txt=v("versao");
  if(el("blindadoChk")?.checked) txt += " + Blindagem";
  return txt;
}
function toggleBlindagem(){
  const on=!!el("blindadoChk")?.checked;
  el("blindadoEstadoWrap").classList.toggle("hidden", !on);
  const av=on && v("blindadoEstado")==="Avariado";
  el("blindadoObsWrap").classList.toggle("hidden", !av);
  if(!on){
    el("blindadoEstado").value="Bom";
    el("blindadoObs").value="";
  }
  if(on && !av){
    el("blindadoObs").value="";
  }
}
function toggleArCond(){
  const show=isArVersion();
  el("arCondWrap").classList.toggle("hidden", !show);
  if(!show) el("arCond").value="Bom";
}
function preencherPadrao(){
  el("tablier").value="Bom";
  el("bancosOnde").value="";
  el("bancosServico").value="Bom";
  el("volante").value="Bom";
  el("manopla").value="Bom";

  ["forro_motorista","forro_passageiro","forro_traseiro_d","forro_traseiro_e","forro_dianteiros","forro_traseiros","forro_todos"].forEach(id=>{
    if(el(id)) el(id).checked=false;
  });
  el("forroEstado").value="Bom";

  el("funilariaPecas").value="0";
  el("pneusQtd").value="0";
  el("pinturaCompleta").checked=false;
  el("chuvaGranizo").checked=false;

  el("paraChoqueD").value="Bom";
  el("paraChoqueT").value="Bom";

  el("retrovisorD").value="Bom";
  el("retrovisorE").value="Bom";

  el("farolD").value="Bom";
  el("farolE").value="Bom";
  el("lanternaD").value="Bom";
  el("lanternaE").value="Bom";

  el("vidroParabrisa").value="OK";
  ["vidro_dd_chk","vidro_de_chk","vidro_td_chk","vidro_te_chk","vidro_vg_chk"].forEach(id=>{
    if(el(id)) el(id).checked=false;
  });
  ["vidro_dd_act","vidro_de_act","vidro_td_act","vidro_te_act","vidro_vg_act"].forEach(id=>{
    if(el(id)) el(id).value="Reparo";
  });

  if(isArVersion()) el("arCond").value="Bom";
  if(el("blindadoChk")?.checked){
    el("blindadoEstado").value="Bom";
    el("blindadoObs").value="";
    toggleBlindagem();
  }

  atualizarPreview();
  refreshNovaAppUX();
}
let placaDupTimer=null, lastDuplicateEvaluation=null;
async function verificarPlacaDuplicada(){
  const hint=el("placaDuplicadaHint");
  if(!hint) return;
  const placa=plateBR(v("placa"));
  if(!placa || placa.length<7){
    hint.innerHTML="";
    lastDuplicateEvaluation=null;
    return;
  }
  if(isGuest){
    hint.innerHTML="";
    lastDuplicateEvaluation=null;
    return;
  }
  try{
    const qy=query(collection(db,"vistorias"), where("placa","==",placa), limit(5));
    const snap=await getDocs(qy);
    const items=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(!items.length){
      hint.innerHTML="<div class='repeatOk'>✅ Placa ainda não encontrada no histórico.</div>";
      return;
    }
    const first=items[0]||{};
    lastDuplicateEvaluation=first;
    const la=((first.laudo||"").toString().toUpperCase() || "—");
    const dt=formatDate(first.createdAt) || "data indisponível";
    const modelo=first.modelo || "modelo não informado";
    hint.innerHTML=`<div class='repeatWarn'>⚠️ Essa placa já foi avaliada anteriormente. Último registro: <b>${escapeHtml(modelo)}</b> • <b>${escapeHtml(la)}</b> • <b>${escapeHtml(dt)}</b></div>`;
    hint.innerHTML=`<div class='repeatWarn duplicatePlateBox'><div><b>Veiculo ja avaliado, conferir avaliacao?</b><br>${escapeHtml(modelo)} - ${escapeHtml(la)} - ${escapeHtml(dt)}</div><button type="button" class="duplicatePlateBtn" id="btnLoadDuplicateEvaluation">Abrir avaliacao</button></div>`;
    el("btnLoadDuplicateEvaluation")?.addEventListener("click", ()=>{
      hydrateEvaluationFromHistory(lastDuplicateEvaluation);
      hint.innerHTML="<div class='repeatOk'>Avaliacao carregada. Revise os dados e salve as alteracoes.</div>";
    });
  }catch(e){
    hint.innerHTML="";
    lastDuplicateEvaluation=null;
  }
}

["km"].forEach(id=>el(id).addEventListener("blur",()=>{ if(v(id)) el(id).value=fmtKM(v(id)); atualizarPreview(); refreshNovaAppUX(); }));
el("placa").addEventListener("blur", ()=>{
  if(v("placa")) el("placa").value=plateBR(v("placa"));
  atualizarPreview();
  refreshNovaAppUX();
  verificarPlacaDuplicada();
});
el("placa").addEventListener("input", ()=>{
  clearTimeout(placaDupTimer);
  placaDupTimer=setTimeout(verificarPlacaDuplicada, 450);
});
el("kmComprou").addEventListener("blur",()=>{ const val=v("kmComprou"), digs=onlyDigits(val); if(val && digs && digs.length===val.replace(/\s|\./g,"").length) el("kmComprou").value=fmtKM(val); atualizarPreview(); refreshNovaAppUX(); });
["fipe","valorPretendido","debitosValor","finValor"].forEach(id=>{
  const e=el(id);
  if(!e) return;
  e.addEventListener("blur",()=>{
    if(v(id)) el(id).value=fmtBRL(v(id));
    atualizarPreview();
    refreshNovaAppUX();
  });
});

function setStatusBadge(){ const s=(v("laudo")||"APROVADO").toUpperCase(); el("statusTxt").innerText=s; el("dot").style.background=(s==="REPROVADO")?"#d32f2f":(s==="APONTAMENTO")?"#f9a825":"#2e7d32"; }
function toggleLaudoDescricao(){ const s=(v("laudo")||"APROVADO").toUpperCase(); if(s==="APROVADO"){ el("laudoObsWrap").style.display="none"; el("laudoObs").value=""; } else el("laudoObsWrap").style.display="block"; }

function focusWarn(id,msg){ alert(msg); el(id).focus(); el(id).scrollIntoView({behavior:"smooth",block:"center"}); return false; }
function validar(){
  if(!v("modelo")) return focusWarn("modelo","Obrigatório: Modelo");
  if(!v("ano")) return focusWarn("ano","Obrigatório: Ano");
  if(!v("versao")) return focusWarn("versao","Obrigatório: Versão");
  if(!v("placa")) return focusWarn("placa","Obrigatório: Placa");
  if(!v("km")) return focusWarn("km","Obrigatório: Km");
  if(!v("kmComprou")) return focusWarn("kmComprou","Obrigatório: Comprou");
  if(!v("fipe")) return focusWarn("fipe","Obrigatório: Fipe");
  const s=(v("laudo")||"APROVADO").toUpperCase();
  if(s!=="APROVADO" && !v("laudoObs")) return focusWarn("laudoObs","Descreva o laudo.");
  if(!v("consultor")) return focusWarn("consultor","Obrigatório: Consultor");
  if(!getAvaliadoresText()) return focusWarn("avaliadores","Obrigatório: informe ao menos 1 avaliador.");
  if((v("debitosSel")==="Sim") && !v("debitosValor")) return focusWarn("debitosValor","Informe o valor dos débitos.");
  if((v("finSel")==="Sim") && !v("finValor")) return focusWarn("finValor","Informe o valor da quitação.");
  if(!v("cliente")) return focusWarn("cliente","Obrigatório: Cliente");
  const clienteDigits=onlyDigits(v("cliente"));
  const clienteLetters=(v("cliente").match(/[A-Za-zÀ-ÿ]/g)||[]).length;
  if(clienteDigits.length>=8 && clienteLetters<3) return focusWarn("cliente","O campo Cliente parece conter telefone. Informe o nome do cliente e coloque o telefone no campo WhatsApp.");
  if(el("blindadoChk")?.checked && v("blindadoEstado")==="Avariado" && !v("blindadoObs")) return focusWarn("blindadoObs","Descreva a avaria da blindagem.");
  return true;
}

function montar(){
  const lines = [];
  lines.push("🚗 *Veículo*");
  lines.push(`*Modelo:* ${v("modelo")}`);
  lines.push(`*Ano:* ${v("ano")}`);
  lines.push(`*Versão:* ${getVersaoCompleta()}`);
  lines.push(`*Placa:* ${plateBR(v("placa"))}`);
  lines.push(`*Km:* ${v("km")}`);
  lines.push(`*Comprou:* ${v("kmComprou")}`);

  lines.push("");
  lines.push("💰 *Negócio*");
  lines.push(`*Fipe:* ${v("fipe")}`);
  if(v("valorPretendido")) lines.push(`*Valor pretendido:* ${v("valorPretendido")}`);
  if(v("debitosSel")==="Sim") lines.push(`*Débitos do veículo:* ${v("debitosValor") || "—"}`);
  if(v("finSel")==="Sim") lines.push(`*Financiamento (quitação):* ${v("finValor") || "—"}`);

  lines.push("");
  lines.push("📋 *Laudo*");
  const laudo=(v("laudo")||"APROVADO").toUpperCase();
  const ic=(laudo==="REPROVADO")?"🔴":(laudo==="APONTAMENTO")?"🟡":"🟢";
  lines.push(`${ic} ${laudo}`);
  if(laudo!=="APROVADO" && v("laudoObs")) lines.push(v("laudoObs"));

  if(v("leilao") && v("leilao").toLowerCase()!=="não"){ lines.push(""); lines.push(`🚨 *Leilão:* ${v("leilao")}`); }

  const gastos=[];
  if(v("motor")) gastos.push(v("motor"));
  if(v("luzes")) gastos.push(v("luzes"));
  if(el("blindadoChk")?.checked && v("blindadoEstado")==="Avariado" && v("blindadoObs")) gastos.push(`Blindagem: ${v("blindadoObs")}`);
  if(isArVersion() && v("arCond") && v("arCond")!=="Bom") gastos.push(`Ar-condicionado: ${v("arCond")}`);
  if(v("tablier")==="Avariado") gastos.push("Tablier: Avariado");
  if(v("bancosOnde") && v("bancosServico") && v("bancosServico")!=="Bom") gastos.push(`Bancos (${v("bancosOnde")}): ${v("bancosServico")}`);
  if(v("volante") && v("volante")!=="Bom") gastos.push(`Volante: ${v("volante")}`);
  if(v("manopla") && v("manopla")!=="Bom") gastos.push("Manopla do câmbio: Trocar");
  if(v("forroEstado")==="Avariado"){
    const portas=[];
    [["forro_motorista","Motorista"],["forro_passageiro","Passageiro"],["forro_traseiro_d","Traseiro D"],["forro_traseiro_e","Traseiro E"],["forro_dianteiros","Dianteiros"],["forro_traseiros","Traseiros"],["forro_todos","Todos"]].forEach(([id,label])=>{ if(el(id)?.checked) portas.push(label); });
    if(portas.length) gastos.push(`Forro de porta (${portas.join(", ")}): Avariado`);
  }
  const pecas=Number(v("funilariaPecas")||"0"), pintura=!!el("pinturaCompleta")?.checked, granizo=!!el("chuvaGranizo")?.checked;
  if(pecas>0 || pintura || granizo){
    const parts=[]; if(pecas>0) parts.push(`${pecas} ${pecas===1?"peça":"peças"}`); if(pintura) parts.push("Pintura completa"); if(granizo) parts.push("Chuva de granizo");
    gastos.push(`Funilaria: ${parts.join(" + ")}`);
  }
  const pneus=Number(v("pneusQtd")||"0");
  if(pneus>0) gastos.push(`Pneus: ${pneus} ${pneus===1?"avariado":"avariados"}`);
  if(v("paraChoqueD")==="Troca") gastos.push("Para-choque dianteiro: Troca");
  if(v("paraChoqueT")==="Troca") gastos.push("Para-choque traseiro: Troca");
  [["retrovisorD","Retrovisor (D)"],["retrovisorE","Retrovisor (E)"],["farolD","Farol (D)"],["farolE","Farol (E)"],["lanternaD","Lanterna (D)"],["lanternaE","Lanterna (E)"]]
  .forEach(([id,label])=>{
    const val=v(id);
    if(val && val!=="Bom") gastos.push(`${label}: ${val}`);
  });
  if(v("vidroParabrisa") && v("vidroParabrisa")!=="OK") gastos.push(`Para-brisa: ${v("vidroParabrisa")}`);
  [["vidro_dd_chk","vidro_dd_act","Vidro dianteiro (D)"],["vidro_de_chk","vidro_de_act","Vidro dianteiro (E)"],["vidro_td_chk","vidro_td_act","Vidro traseiro (D)"],["vidro_te_chk","vidro_te_act","Vidro traseiro (E)"],["vidro_vg_chk","vidro_vg_act","Vigia"]].forEach(([chk,act,label])=>{ if(el(chk)?.checked) gastos.push(`${label}: ${v(act)||"Reparo"}`); });
  if(gastos.length){ lines.push(""); lines.push("⚙️ *Gastos*"); lines.push(...gastos); }

  if(v("testeRodagem")){ lines.push(""); lines.push("🛣️ *Teste de Rodagem*"); lines.push(v("testeRodagem")); }
  lines.push(""); lines.push("👨‍🔧 *Responsáveis*"); lines.push(`*Consultor:* ${v("consultor")}`); lines.push(`*Avaliadores:* ${getAvaliadoresText()}`);
  lines.push(""); lines.push("👤 *Cliente*"); lines.push(`*Cliente:* ${v("cliente")}`); if(v("local")) lines.push(`*Local:* ${v("local")}`); if(v("captacao")) lines.push(`*Captação:* ${v("captacao")}`); lines.push(""); lines.push("Osasco - SP 📍");
  return lines.join("\n").trim();
}
function atualizarPreview(){ el("preview").innerHTML = formatReportPreview(montar()); updateHeroStats(); }

async function copiar(texto){
  try{ await navigator.clipboard.writeText(texto); return true; }catch(e){}
  const ta=el("copyFallback"); ta.value=texto; ta.focus(); ta.select();
  try{ if(document.execCommand("copy")) return true; }catch(e){}
  window.prompt("Copie:", texto); return false;
}
function abrirWhats(texto){
  const url="https://wa.me/?text="+encodeURIComponent(texto);
  const a=document.createElement("a"); a.href=url; a.target="_blank"; a.rel="noopener";
  document.body.appendChild(a); a.click(); a.remove();
}
function clearCustomerFields(){
  ["cliente","telefone","local","captacao"].forEach(id=>{
    const node=el(id); if(!node) return;
    node.value="";
    node.dispatchEvent(new Event("input", {bubbles:true}));
    node.dispatchEvent(new Event("change", {bubbles:true}));
  });
  atualizarPreview();
  refreshNovaAppUX();
  saveNovaDraftNow();
}
function normalizePhoneBR(raw){ const d=onlyDigits(raw); if(!d) return ""; if(d.startsWith("55") && d.length>=12) return d; if(d.length===10 || d.length===11) return "55"+d; return d; }
function abrirWhatsPara(numero, mensagem){
  const phone=normalizePhoneBR(numero);
  if(!phone){ alert("Telefone do cliente não encontrado neste registro."); return; }
  const url="https://wa.me/"+phone+"?text="+encodeURIComponent(mensagem||"");
  const a=document.createElement("a"); a.href=url; a.target="_blank"; a.rel="noopener";
  document.body.appendChild(a); a.click(); a.remove();
}
function montarMsgCliente(nomeCliente){
  const nome=(nomeCliente||"").toString().trim();
  return (`Olá${nome?(" "+nome):""}, tudo bem?
Aqui é da *Clube do Auto*.

Você veio até nossa loja fazer a *avaliação do seu veículo* e estamos revisando algumas negociações essa semana.

Talvez consigamos *melhorar sua proposta* ou encontrar um veículo interessante para troca.

Se ainda tiver interesse, me avisa por aqui ou pode passar na loja que conversamos. 🚗`).trim();
}

const LAST_CONSULTOR_KEY = "clubeauto_last_consultor_v1";
function loadLastConsultor(){ try{ const last=localStorage.getItem(LAST_CONSULTOR_KEY)||""; if(last && !v("consultor")) el("consultor").value=last; }catch(e){} }
function saveLastConsultor(){ try{ const val=v("consultor"); if(val) localStorage.setItem(LAST_CONSULTOR_KEY,val); }catch(e){} }
el("consultor").addEventListener("blur", ()=>{ saveLastConsultor(); atualizarPreview(); refreshNovaAppUX(); });
el("consultor").addEventListener("change", ()=>{ saveLastConsultor(); atualizarPreview(); refreshNovaAppUX(); });

let lastSaveSig="", savingNow=false, lastSaveAt=0;
function makeSaveSig(texto){ const u=auth.currentUser; return (u?.uid||"")+"||"+texto; }
async function salvarUmaVez(texto){
  if(isGuest) return {saved:false, reason:"guest"};
  const u=auth.currentUser; if(!u) return {saved:false, reason:"no-user"};
  const sig=makeSaveSig(texto), now=Date.now();
  if(sig===lastSaveSig && (now-lastSaveAt)<15000) return {saved:false, reason:"dedup"};
  if(savingNow) return {saved:false, reason:"in-flight"};
  savingNow=true;
  try{
    const placaAtual=plateBR(v("placa"));
    const payload={
      roleAtCreation:currentRole,
      modelo:v("modelo"),
      placa:placaAtual,
      laudo:(v("laudo")||"APROVADO").toUpperCase(),
      cliente:v("cliente"),
      telefone:v("telefone"),
      local:v("local"),
      captacao:v("captacao"),
      consultor:v("consultor"),
      blindado:!!el("blindadoChk")?.checked,
      blindadoEstado:v("blindadoEstado"),
      blindadoObs:v("blindadoObs"),
      arCond:isArVersion()?v("arCond"):"",
      reportText:texto,
      formData:collectEvaluationFormData(),
      updatedAt:serverTimestamp(),
      updatedByEmail:lower(u.email||""),
      updatedByUid:u.uid
    };
    const existingSnap=placaAtual ? await getDocs(query(collection(db,"vistorias"), where("placa","==",placaAtual), limit(1))) : null;
    if(existingSnap && !existingSnap.empty){
      const existing=existingSnap.docs[0];
      await updateDoc(doc(db,"vistorias", existing.id), payload);
      lastSaveSig=sig; lastSaveAt=now; el("saveHint").innerHTML="<span class='ok'>AvaliaÃ§Ã£o atualizada. Placa jÃ¡ existia no histÃ³rico.</span>"; return {saved:true, updated:true, id:existing.id};
    }
    await addDoc(collection(db,"vistorias"),{
      ...payload,
      createdAt:serverTimestamp(),
      createdByEmail:lower(u.email||""),
      createdByUid:u.uid,
      dealStatus:"SEM"
    });
    lastSaveSig=sig; lastSaveAt=now; el("saveHint").innerHTML="<span class='ok'>Salvo na nuvem.</span>"; return {saved:true};
  }catch(e){
    el("saveHint").innerHTML="<span class='warn'>Falha ao salvar:</span> "+(e?.message||e);
    return {saved:false, reason:"error", error:e};
  }finally{ savingNow=false; }
}
function escapeHtml(s){ return (s??"").toString().replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function formatDate(ts){ try{ const d=ts?.toDate?ts.toDate():null; if(!d) return ""; return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d);}catch(e){ return ""; } }

function formatReportPreview(text){
  const raw=(text||"").toString().trim();
  if(!raw) return "<div class='reportEmpty'>Relatorio ainda nao gerado.</div>";
  let openCard=false;
  const html=raw.split("\n").map(line=>{
    const t=line.trim();
    if(!t) return "";
    const section=t.match(/^(.{0,3})\s*\*(.+)\*$/);
    if(section && !t.includes(":")){
      const close=openCard ? "</div>" : "";
      openCard=true;
      return `${close}<div class="reportCard"><div class="reportSection"><span>${escapeHtml(section[1].trim())}</span><strong>${escapeHtml(section[2].trim())}</strong></div>`;
    }
    const field=t.match(/^\*(.+?):\*\s*(.*)$/);
    if(field) return `<div class="reportLine"><span class="reportLabel">${escapeHtml(field[1])}</span><span class="reportValue">${escapeHtml(field[2]||"-")}</span></div>`;
    return `<div class="reportNote">${escapeHtml(t).replace(/\*(.*?)\*/g,"<b>$1</b>")}</div>`;
  }).join("");
  return html + (openCard ? "</div>" : "");
}

function collectEvaluationFormData(){
  const data={};
  document.querySelectorAll("#viewNova input, #viewNova select, #viewNova textarea").forEach(node=>{
    if(!node.id) return;
    const type=(node.type||"").toLowerCase();
    if(["button","submit","reset","file"].includes(type)) return;
    data[node.id]=(type==="checkbox" || type==="radio") ? !!node.checked : node.value;
  });
  return data;
}
function setFieldValue(id, value){
  const node=el(id);
  if(!node || value===undefined || value===null) return;
  const type=(node.type||"").toLowerCase();
  if(type==="checkbox" || type==="radio") node.checked=!!value;
  else node.value=value;
  node.dispatchEvent(new Event("input", {bubbles:true}));
  node.dispatchEvent(new Event("change", {bubbles:true}));
}
function parseReportField(text, label){
  const safe=label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const m=(text||"").match(new RegExp(`\\*${safe}:\\*\\s*([^\\n]+)`, "i"));
  return m ? m[1].trim() : "";
}
function hydrateEvaluationFromHistory(it){
  if(!it) return;
  const report=it.reportText || "";
  const formData=it.formData && typeof it.formData==="object" ? it.formData : {};
  Object.entries(formData).forEach(([id,val])=>setFieldValue(id,val));
  const fallbacks={
    modelo: it.modelo || parseReportField(report,"Modelo"),
    ano: parseReportField(report,"Ano"),
    versao: parseReportField(report,"Versão"),
    placa: it.placa || parseReportField(report,"Placa"),
    km: parseReportField(report,"Km"),
    kmComprou: parseReportField(report,"Comprou"),
    fipe: parseReportField(report,"Fipe"),
    valorPretendido: parseReportField(report,"Valor pretendido"),
    laudo: it.laudo || "",
    consultor: it.consultor || parseReportField(report,"Consultor"),
    avaliadores: parseReportField(report,"Avaliadores"),
    cliente: it.cliente || parseReportField(report,"Cliente"),
    telefone: it.telefone || "",
    local: it.local || parseReportField(report,"Local"),
    captacao: it.captacao || parseReportField(report,"Captação")
  };
  Object.entries(fallbacks).forEach(([id,val])=>{ if(val && !v(id)) setFieldValue(id,val); });
  toggleLaudoDescricao();
  toggleDebitos();
  toggleFin();
  toggleBlindagem();
  toggleArCond();
  atualizarPreview();
  refreshNovaAppUX();
}

function setTab(tab){
  if((!canPainel) && tab==="painel") tab = "nova";
  if((!isAdmin) && tab==="users") tab = (canPainel ? "painel" : "nova");

  const nova=tab==="nova", hist=tab==="hist", painel=tab==="painel", users=tab==="users";
  if(el("tabNova")) el("tabNova").classList.toggle("active", nova);
  if(el("tabHist")) el("tabHist").classList.toggle("active", hist);
  if(el("tabPainel")) el("tabPainel").classList.toggle("active", painel);
  if(el("tabUsers")) el("tabUsers").classList.toggle("active", users);
  if(el("tabNovaMobile")) el("tabNovaMobile").classList.toggle("active", nova);
  if(el("tabHistMobile")) el("tabHistMobile").classList.toggle("active", hist);
  if(el("tabGestaoMobile")) el("tabGestaoMobile").classList.toggle("active", painel || users);
  if(el("viewNova")) el("viewNova").classList.toggle("hidden", !nova);
  if(el("viewHistorico")) el("viewHistorico").classList.toggle("hidden", !hist);
  if(el("viewPainel")) el("viewPainel").classList.toggle("hidden", !painel);
  if(el("viewUsers")) el("viewUsers").classList.toggle("hidden", !users);
  if(hist) openHistorico();
  if(painel) openPainel();
  if(users) openUsers();
}
el("tabNova").addEventListener("click",()=>setTab("nova"));
el("tabHist").addEventListener("click",()=>setTab("hist"));
el("tabPainel").addEventListener("click",()=>setTab("painel"));
el("tabUsers").addEventListener("click",()=>setTab("users"));
el("tabNovaMobile")?.addEventListener("click",()=>setTab("nova"));
el("tabHistMobile")?.addEventListener("click",()=>setTab("hist"));
el("tabGestaoMobile")?.addEventListener("click",()=>setTab(el("tabGestaoMobile")?.dataset.target || "painel"));
el("btnSidebarToggle")?.addEventListener("click",()=>document.body.classList.toggle("sidebar-expanded"));
if(window.innerWidth>768) document.body.classList.add("sidebar-expanded");




let histItemsCache=[];
function getHistLaudoFilter(){ const sel=el("histLaudo2") || el("histLaudo"); return ((sel?.value)||"").toString().toUpperCase().trim() || ""; }
function getHistDealFilter(){ return (el("histDeal")?.value || "").toString().toUpperCase().trim(); }
function getHistPeriodo(){ return (el("histPeriodo")?.value || "30d").toString(); }
function periodToRange(periodo){
  const now = new Date();
  const startOfDay=(d)=>new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0);
  const addDays=(d,n)=>new Date(d.getFullYear(), d.getMonth(), d.getDate()+n, 0,0,0);
  if(periodo==="7d") return { start:new Date(now.getTime()-7*24*60*60*1000), end:null, lim:800 };
  if(periodo==="30d") return { start:new Date(now.getTime()-30*24*60*60*1000), end:null, lim:800 };
  if(periodo==="hoje"){ const s=startOfDay(now); return { start:s, end:addDays(s,1), lim:800 }; }
  if(periodo==="ontem"){ const e=startOfDay(now); const s=addDays(e,-1); return { start:s, end:e, lim:800 }; }
  if(periodo==="mes"){ const s=new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0); const e=new Date(now.getFullYear(), now.getMonth()+1, 1, 0,0,0); return { start:s, end:e, lim:2500 }; }
  return { start:null, end:null, lim:2000 };
}

function renderHistorico(items){
  const q=(el("histSearch")?.value || "").toString().trim().toLowerCase();
  const la=getHistLaudoFilter(), deal=getHistDealFilter();
  const filtered=items.filter(it=>{
    if(la){ const itla=(it.laudo||"APROVADO").toString().toUpperCase(); if(itla!==la) return false; }
    if(deal){ const ds=(it.dealStatus||"SEM").toString().toUpperCase(); if(deal==="SEM"){ if(ds!=="SEM") return false; } else if(ds!==deal) return false; }
    if(!q) return true;
    const hay=[it.placa||"", it.modelo||"", it.cliente||"", it.consultor||"", it.createdByEmail||"", it.laudo||"", it.telefone||"", it.local||"", (it.captacao || getFirstLineValue(it.reportText, "Captação") || "")].join(" ").toLowerCase();
    return hay.includes(q);
  });

  if(el("histCount")) el("histCount").innerHTML = `<span class="ok">${filtered.length}</span> exibindo • <span class="hint">${items.length} carregados</span>`;

  el("historicoList").innerHTML = filtered.map(it=>{
    const la2=(it.laudo||"APROVADO").toString().toUpperCase();
    const icon=(la2==="REPROVADO")?"🔴":(la2==="APONTAMENTO")?"🟡":"🟢";
    const title=`${icon} ${escapeHtml(it.modelo||"-")} — ${escapeHtml(it.placa||"-")}`;
    const extra=[it.cliente?("Cliente: "+it.cliente):"", it.consultor?("Consultor: "+it.consultor):"", ("Logado: "+getUserLabelByUid(it.createdByUid, it.createdByEmail))].filter(Boolean).join(" • ");
    const meta=`${escapeHtml(formatDate(it.createdAt))} • ${escapeHtml(it.createdByEmail||"")}` + (extra?(`\n${escapeHtml(extra)}`):"");
    const delBtn=isAdmin?`<button class="mini" style="background:#b91c1c" data-del="${it.id}">🗑 Excluir</button>`:"";
    const dealVal=(it.dealStatus||"SEM").toString().toUpperCase();
    const dealBadge=dealBadgeHtml(dealVal);
    const dealBtns=canSetDeal()?`<button class="mini mDeal" data-deal="${it.id}" data-val="FECHADO">✅ Fechado</button><button class="mini mDeal" data-deal="${it.id}" data-val="QUASE">🟡 Quase</button><button class="mini mDeal" data-deal="${it.id}" data-val="NAO">❌ Não</button><button class="mini btnSecondary" data-deal="${it.id}" data-val="SEM">↩️ Limpar</button>`:``;
    return `<div class="histItem">
      <div class="histTop"><div><div class="histTitle">${title}</div><div class="histMeta">${meta}</div></div><div class="histMeta"><b>${escapeHtml(la2)}</b><div style="margin-top:6px">${dealBadge}</div></div></div>
      <div class="histBtns">
        <button class="mini mOpen" data-open="${it.id}">📄 Abrir</button>
        <button class="mini mCopy" data-copy="${it.id}">📋 Copiar</button>
        <button class="mini mSend" data-send="${it.id}">📲 Whats</button>
        <button class="mini" style="background:#0ea5e9" data-client="${it.id}">💬 Cliente</button>
        
        ${delBtn}
      </div>
      ${dealBtns ? `<div class="histBtns" style="grid-template-columns:repeat(4,1fr);margin-top:8px">${dealBtns}</div>` : ``}
    </div>`;
  }).join("") || "<div class='histItem'><b>Nenhum registro.</b></div>";

  const getById=(id)=>filtered.find(x=>x.id===id) || histItemsCache.find(x=>x.id===id);

  el("historicoList").querySelectorAll("[data-open]").forEach(btn=>btn.addEventListener("click",()=>{ const it=getById(btn.dataset.open); if(!it) return; el("preview").innerText=(it.reportText||""); setTab("nova"); window.scrollTo({top:0,behavior:"smooth"}); }));
  el("historicoList").querySelectorAll("[data-copy]").forEach(btn=>btn.addEventListener("click", async()=>{ const it=getById(btn.dataset.copy); if(!it) return; const ok=await copiar(it.reportText||""); if(ok) alert("Copiado!"); }));
  el("historicoList").querySelectorAll("[data-send]").forEach(btn=>btn.addEventListener("click",()=>{ const it=getById(btn.dataset.send); if(!it) return; abrirWhats(it.reportText||""); }));
  el("historicoList").querySelectorAll("[data-client]").forEach(btn=>btn.addEventListener("click",()=>{ const it=getById(btn.dataset.client); if(!it) return; abrirWhatsPara(it.telefone||"", montarMsgCliente(it.cliente||"")); }));

  if(canSetDeal()){
    el("historicoList").querySelectorAll("[data-deal]").forEach(btn=>btn.addEventListener("click", async ()=>{
      const id=btn.dataset.deal, val=(btn.dataset.val||"SEM").toString().toUpperCase();
      try{
        const u=auth.currentUser; if(!u) return alert("Faça login novamente.");
        await updateDoc(doc(db,"vistorias", id), { dealStatus:val, dealUpdatedAt:serverTimestamp(), dealUpdatedByEmail:lower(u.email||""), dealUpdatedByUid:u.uid });
        const it=histItemsCache.find(x=>x.id===id); if(it) it.dealStatus=val;
        renderHistorico(histItemsCache);
      }catch(e){ alert("Erro ao atualizar status: "+(e?.message||e)); }
    }));
  }
  if(isAdmin){
    el("historicoList").querySelectorAll("[data-del]").forEach(btn=>btn.addEventListener("click", async ()=>{
      const id=btn.dataset.del;
      if(!confirm("Excluir este relatório do histórico? Essa ação não pode ser desfeita.")) return;
      try{ await deleteDoc(doc(db,"vistorias", id)); alert("Excluído!"); openHistorico(); }catch(e){ alert("Erro ao excluir: "+(e?.message||e)); }
    }));
  }
  el("histHint").innerHTML = `<span class='ok'>Carregado.</span> Mostrando ${filtered.length} de ${items.length}.`;
}

let currentHistoryReportText="";
function openHistoryReport(it){
  currentHistoryReportText=it?.reportText || "";
  if(el("historyReportTitle")) el("historyReportTitle").textContent=`${it?.modelo || "Avaliacao"} - ${it?.placa || ""}`.trim();
  if(el("historyReportMeta")) el("historyReportMeta").textContent=[formatDate(it?.createdAt), it?.cliente ? `Cliente: ${it.cliente}` : "", it?.laudo || ""].filter(Boolean).join(" | ");
  if(el("historyReportText")) el("historyReportText").innerHTML=formatReportPreview(currentHistoryReportText);
  const modal=el("historyReportModal");
  if(modal) modal.style.display="flex";
}
function closeHistoryReport(){
  const modal=el("historyReportModal");
  if(modal) modal.style.display="none";
}

function renderHistorico(items){
  const q=(el("histSearch")?.value || "").toString().trim().toLowerCase();
  const filtered=items.filter(it=>{
    if(!q) return true;
    const hay=[it.placa||"", it.modelo||"", it.cliente||"", it.laudo||"", it.consultor||"", it.createdByEmail||"", it.telefone||""].join(" ").toLowerCase();
    return hay.includes(q);
  });

  if(el("histCount")) el("histCount").innerHTML = `<span class="ok">${filtered.length}</span> exibindo de ${items.length} carregados`;

  el("historicoList").innerHTML = filtered.map(it=>{
    const laudo=(it.laudo||"APROVADO").toString().toUpperCase();
    const icon=(laudo==="REPROVADO")?"🔴":(laudo==="APONTAMENTO")?"🟡":"🟢";
    const title=`${icon} ${escapeHtml(it.modelo||"-")} - ${escapeHtml(it.placa||"-")}`;
    const meta=[formatDate(it.createdAt), it.cliente ? `Cliente: ${it.cliente}` : "", it.consultor ? `Consultor: ${it.consultor}` : ""].filter(Boolean).join(" | ");
    const delBtn=isAdmin ? `<button class="mini historyDeleteBtn" data-del="${it.id}">Excluir</button>` : `<button class="mini historyDisabledBtn" type="button" disabled>Restrito</button>`;
    return `<div class="histItem historyLineItem">
      <div class="histTop historyLineTop">
        <div>
          <div class="histTitle">${title}</div>
          <div class="histMeta">${escapeHtml(meta)}</div>
        </div>
        <div class="histLaudoTag histLaudo_${escapeHtml(laudo.toLowerCase())}">${escapeHtml(laudo)}</div>
      </div>
      <div class="histBtns historyLineBtns">
        <button class="mini mOpen" data-open="${it.id}">Abrir</button>
        <button class="mini mSend" data-send="${it.id}">WhatsApp</button>
        <button class="mini historyClientBtn" data-client="${it.id}">Cliente</button>
        ${delBtn}
      </div>
    </div>`;
  }).join("") || "<div class='histEmpty'>Nenhum registro encontrado.</div>";

  const getById=(id)=>filtered.find(x=>x.id===id) || histItemsCache.find(x=>x.id===id);
  el("historicoList").querySelectorAll("[data-open]").forEach(btn=>btn.addEventListener("click",()=>{ const it=getById(btn.dataset.open); if(it) openHistoryReport(it); }));
  el("historicoList").querySelectorAll("[data-send]").forEach(btn=>btn.addEventListener("click",()=>{ const it=getById(btn.dataset.send); if(it) abrirWhats(it.reportText||""); }));
  el("historicoList").querySelectorAll("[data-client]").forEach(btn=>btn.addEventListener("click",()=>{ const it=getById(btn.dataset.client); if(it) abrirWhatsPara(it.telefone||"", montarMsgCliente(it.cliente||"")); }));
  if(isAdmin){
    el("historicoList").querySelectorAll("[data-del]").forEach(btn=>btn.addEventListener("click", async ()=>{
      const id=btn.dataset.del;
      if(!confirm("Excluir este relatorio do historico? Essa acao nao pode ser desfeita.")) return;
      try{ await deleteDoc(doc(db,"vistorias", id)); alert("Excluido!"); openHistorico(); }catch(e){ alert("Erro ao excluir: "+(e?.message||e)); }
    }));
  }
  el("histHint").innerHTML = `<span class='ok'>Carregado.</span> Mostrando ${filtered.length} de ${items.length}.`;
}

function openHistorico(){
  el("historicoList").innerHTML=""; el("histHint").innerHTML=""; if(el("histCount")) el("histCount").innerHTML="";
  if(isGuest){ el("histHint").innerHTML="<span class='warn'>Convidado não tem histórico.</span>"; return; }
  if(!canHistory){ el("histHint").innerHTML="<span class='warn'>Seu cargo não tem acesso ao histórico.</span>"; return; }

  const reload = async ()=>{
    el("histHint").innerHTML="Carregando..."; el("historicoList").innerHTML="";
    try{
      await refreshUsersIndex();
      const {start,end,lim}=periodToRange(getHistPeriodo());
      let qy=null;
      if(start && end) qy=query(collection(db,"vistorias"), where("createdAt", ">=", start), where("createdAt", "<", end), orderBy("createdAt","desc"), limit(lim));
      else if(start) qy=query(collection(db,"vistorias"), where("createdAt", ">=", start), orderBy("createdAt","desc"), limit(lim));
      else qy=query(collection(db,"vistorias"), orderBy("createdAt","desc"), limit(lim));
      const snap=await getDocs(qy);
      histItemsCache=snap.docs.map(d=>({id:d.id,...d.data()}));
      el("histHint").innerHTML="";
      renderHistorico(histItemsCache);
    }catch(err){ el("histHint").innerHTML="<span class='warn'>Erro ao carregar histórico:</span> "+escapeHtml(err?.message||err); }
  };

  const btn=el("btnHistRecarregar"); if(btn && !btn.dataset.bound){ btn.dataset.bound="1"; btn.addEventListener("click", reload); }
  const per=el("histPeriodo"); if(per && !per.dataset.bound){ per.dataset.bound="1"; per.addEventListener("change", reload); }
  ["histSearch","histDeal","histLaudo2","histLaudo"].forEach(id=>{
    const e=el(id); if(e && !e.dataset.bound){ e.dataset.bound="1"; e.addEventListener("input", ()=>renderHistorico(histItemsCache)); e.addEventListener("change", ()=>renderHistorico(histItemsCache)); }
  });
  reload();
}

function downloadTextFile(filename, content, mime="text/plain;charset=utf-8"){
  const blob=new Blob([content], {type:mime}), url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 2000);
}
function exportHistoricoCsv(){
  const q=(el("histSearch")?.value || "").toString().trim().toLowerCase();
  const la=getHistLaudoFilter(), deal=getHistDealFilter();
  const rows=histItemsCache.filter(it=>{
    if(la){ const itla=(it.laudo||"APROVADO").toString().toUpperCase(); if(itla!==la) return false; }
    if(deal){ const ds=(it.dealStatus||"SEM").toString().toUpperCase(); if(deal==="SEM"){ if(ds!=="SEM") return false; } else if(ds!==deal) return false; }
    if(!q) return true;
    const hay=[it.placa||"", it.modelo||"", it.cliente||"", it.consultor||"", it.createdByEmail||"", it.laudo||""].join(" ").toLowerCase();
    return hay.includes(q);
  });
  const header=["data","modelo","placa","laudo","negocio","cliente","telefone","local","captacao","consultor","criado_por"];
  const esc=(s)=>("\""+String(s??"").replaceAll('"','""')+"\"");
  const lines=[header.join(",")];
  rows.forEach(it=>lines.push([formatDate(it.createdAt), it.modelo||"", it.placa||"", (it.laudo||"").toString().toUpperCase(), (it.dealStatus||"SEM").toString().toUpperCase(), it.cliente||"", it.telefone||"", it.local||"", (it.captacao || getFirstLineValue(it.reportText, "Captação") || ""), it.consultor||"", it.createdByEmail||""].map(esc).join(",")));
  downloadTextFile(`historico_${new Date().toISOString().slice(0,10)}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
}

function monthRangeFromInput(value){
  const parts=(value||"").split("-"), yy=Number(parts[0]||"0"), mm=Number(parts[1]||"0");
  if(!yy || !mm) return null;
  return { start:new Date(yy, mm-1, 1, 0,0,0), end:new Date(yy, mm, 1, 0,0,0) };
}
function badgeForLaudo(la){
  const s=(la||"APROVADO").toString().toUpperCase();
  if(s==="APROVADO") return "<span class='badge badgeOk'>APROVADO</span>";
  if(s==="APONTAMENTO") return "<span class='badge badgeWarn'>APONTAMENTO</span>";
  return "<span class='badge badgeBad'>REPROVADO</span>";
}
function setPainelHint(html){ el("painelHint").innerHTML = html || ""; }

let painelLastItems=[];
async function openPainel(){
  el("painelKpis").innerHTML=""; el("painelTabela").innerHTML=""; el("painelCaptacao").innerHTML=""; setPainelHint("");
  if(isGuest){ setPainelHint("<span class='warn'>Convidado não tem acesso.</span>"); return; }
  if(!canPainel){ setPainelHint("<span class='warn'>Seu cargo não tem acesso ao Painel.</span>"); return; }
  try{ const now=new Date(), ym=now.toISOString().slice(0,7); if(!el("painelMes").value) el("painelMes").value=ym; }catch(e){}
  await carregarPainel();
}
async function carregarPainel(){
  const ym=el("painelMes").value || "", range=monthRangeFromInput(ym);
  if(!range){ setPainelHint("<span class='warn'>Selecione um mês válido.</span>"); return; }
  setPainelHint("Carregando dados do mês...");
  el("painelKpis").innerHTML=""; el("painelTabela").innerHTML=""; el("painelCaptacao").innerHTML=""; painelLastItems=[];
  try{
    const qy=query(collection(db,"vistorias"), where("createdAt", ">=", range.start), where("createdAt", "<", range.end), orderBy("createdAt","desc"), limit(2500));
    const snap=await getDocs(qy);
    const items=snap.docs.map(d=>({id:d.id, ...d.data()}));
    window.__painelItems=items; painelLastItems=items;

    const total=items.length;
    const aprov=items.filter(x=>(x.laudo||"").toString().toUpperCase()==="APROVADO").length;
    const apont=items.filter(x=>(x.laudo||"").toString().toUpperCase()==="APONTAMENTO").length;
    const repr=items.filter(x=>(x.laudo||"").toString().toUpperCase()==="REPROVADO").length;
    const fechado=items.filter(x=>(x.dealStatus||"SEM").toString().toUpperCase()==="FECHADO").length;
    const quase=items.filter(x=>(x.dealStatus||"SEM").toString().toUpperCase()==="QUASE").length;
    const nao=items.filter(x=>(x.dealStatus||"SEM").toString().toUpperCase()==="NAO").length;
    const sem=items.filter(x=>(x.dealStatus||"SEM").toString().toUpperCase()==="SEM").length;
    const taxaAprov=total ? Math.round((aprov/total)*100) : 0;

    const byCap={};
    items.forEach(it=>{
      const capRaw = (it.captacao || getFirstLineValue(it.reportText, "Captação") || "").toString().trim();
      const cap = capRaw || "(não informado)";
      byCap[cap] = (byCap[cap] || 0) + 1;
    });

    const kpis=[
      {t:"Avaliações", v:total, s:"Total do período"},
      {t:"Aprovados", v:aprov, s:badgeForLaudo("APROVADO")},
      {t:"Fechados", v:fechado, s:dealBadgeHtml("FECHADO")},
      {t:"Quase", v:quase, s:dealBadgeHtml("QUASE")},
      {t:"Não fechou", v:nao, s:dealBadgeHtml("NAO")}
    ];
    el("painelKpis").innerHTML = kpis.map(k=>`<div class="kpi"><div class="t">${escapeHtml(k.t)}</div><div class="v">${escapeHtml(String(k.v))}</div><div class="s">${k.s}</div></div>`).join("");

    const resumoRows=[["Apontamento", apont],["Reprovados", repr],["Sem status", sem],["Taxa de aprovação", taxaAprov+"%"]]
      .map(([label,val])=>`<tr><td>${escapeHtml(String(label))}</td><td><b>${escapeHtml(String(val))}</b></td></tr>`).join("");
    el("painelTabela").innerHTML = `
      <table class="table">
        <thead><tr><th>Resumo</th><th>Total</th></tr></thead>
        <tbody>${resumoRows}</tbody>
      </table>
    `;

    const capRows=Object.entries(byCap).sort((a,b)=>(b[1]-a[1])).map(([name,count])=>`<tr><td>${escapeHtml(name)}</td><td><b>${count}</b></td></tr>`).join("");
    el("painelCaptacao").innerHTML = `
      <table class="table">
        <thead><tr><th>Captação</th><th>Total</th></tr></thead>
        <tbody>${capRows || `<tr><td colspan="2"><b>Nenhum dado.</b></td></tr>`}</tbody>
      </table>
    `;

    setPainelHint(`<span class='ok'>Painel carregado.</span> (${total} registros)`);
  }catch(e){
    const msg=(e?.message||e||"").toString();
    const extra=msg.toLowerCase().includes("index") ? "<br><span class='warn'>Dica:</span> pode precisar criar índice no Firestore (o próprio erro costuma trazer o link)." : "";
    setPainelHint("<span class='warn'>Erro ao carregar painel:</span> "+escapeHtml(msg)+extra);
  }
}
function exportPainelCsv(){
  const items=painelLastItems||[], esc=(s)=>("\""+String(s??"").replaceAll('"','""')+"\"");
  const lines=[["data","modelo","placa","laudo","negocio","cliente","telefone","local","captacao","consultor","criado_por"].join(",")];
  items.forEach(it=>lines.push([formatDate(it.createdAt), it.modelo||"", it.placa||"", (it.laudo||"").toString().toUpperCase(), (it.dealStatus||"SEM").toString().toUpperCase(), it.cliente||"", it.telefone||"", it.local||"", (it.captacao || getFirstLineValue(it.reportText, "Captação") || ""), it.consultor||"", it.createdByEmail||""].map(esc).join(",")));
  const ym=(el("painelMes")?.value || "mes").replaceAll("-","");
  downloadTextFile(`painel_${ym}_${new Date().toISOString().slice(0,10)}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
}
function painelMonthLabel(date){
  return new Intl.DateTimeFormat("pt-BR",{month:"short"}).format(date).replace(".","");
}
async function carregarPainel(){
  const ym=el("painelMes").value || "", range=monthRangeFromInput(ym);
  if(!range){ setPainelHint("<span class='warn'>Selecione um mês válido.</span>"); return; }
  setPainelHint("Carregando painel...");
  el("painelKpis").innerHTML=""; el("painelTabela").innerHTML=""; el("painelCaptacao").innerHTML=""; if(el("painelEvolucao")) el("painelEvolucao").innerHTML="";
  painelLastItems=[];
  try{
    const qy=query(collection(db,"vistorias"), where("createdAt", ">=", range.start), where("createdAt", "<", range.end), orderBy("createdAt","desc"), limit(2500));
    const snap=await getDocs(qy);
    const items=snap.docs.map(d=>({id:d.id, ...d.data()}));
    painelLastItems=items;
    const total=items.length;
    const aprov=items.filter(x=>(x.laudo||"").toString().toUpperCase()==="APROVADO").length;
    const apont=items.filter(x=>(x.laudo||"").toString().toUpperCase()==="APONTAMENTO").length;
    const repr=items.filter(x=>(x.laudo||"").toString().toUpperCase()==="REPROVADO").length;
    const taxaAprov=total ? Math.round((aprov/total)*100) : 0;
    const byCap={};
    items.forEach(it=>{
      const capRaw=(it.captacao || getFirstLineValue(it.reportText, "Captação") || "").toString().trim();
      const cap=capRaw || "(não informado)";
      byCap[cap]=(byCap[cap]||0)+1;
    });
    const kpis=[
      {t:"Avaliações", v:total, s:"Total do período"},
      {t:"Aprovados", v:aprov, s:badgeForLaudo("APROVADO")},
      {t:"Apontamentos", v:apont, s:badgeForLaudo("APONTAMENTO")},
      {t:"Reprovados", v:repr, s:badgeForLaudo("REPROVADO")}
    ];
    el("painelKpis").innerHTML=kpis.map(k=>`<div class="kpi"><div class="t">${escapeHtml(k.t)}</div><div class="v">${escapeHtml(String(k.v))}</div><div class="s">${k.s}</div></div>`).join("");
    el("painelTabela").innerHTML=`<table class="table"><thead><tr><th>Resumo</th><th>Total</th></tr></thead><tbody>
      <tr><td>Total de avaliações</td><td><b>${total}</b></td></tr>
      <tr><td>Aprovados</td><td><b>${aprov}</b></td></tr>
      <tr><td>Apontamentos</td><td><b>${apont}</b></td></tr>
      <tr><td>Reprovados</td><td><b>${repr}</b></td></tr>
      <tr><td>Taxa de aprovação</td><td><b>${taxaAprov}%</b></td></tr>
    </tbody></table>`;
    const capRows=Object.entries(byCap).sort((a,b)=>b[1]-a[1]).map(([name,count])=>`<tr><td>${escapeHtml(name)}</td><td><b>${count}</b></td></tr>`).join("");
    el("painelCaptacao").innerHTML=`<table class="table"><thead><tr><th>Captação</th><th>Total</th></tr></thead><tbody>${capRows || `<tr><td colspan="2"><b>Nenhum dado.</b></td></tr>`}</tbody></table>`;

    const start6=new Date(range.start.getFullYear(), range.start.getMonth()-5, 1, 0,0,0);
    const evoSnap=await getDocs(query(collection(db,"vistorias"), where("createdAt", ">=", start6), where("createdAt", "<", range.end), orderBy("createdAt","desc"), limit(6000)));
    const buckets=[];
    for(let i=5;i>=0;i--){ const d=new Date(range.start.getFullYear(), range.start.getMonth()-i, 1); buckets.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`, label:painelMonthLabel(d), count:0}); }
    evoSnap.docs.forEach(d=>{
      const dt=d.data().createdAt?.toDate?.(); if(!dt) return;
      const key=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
      const b=buckets.find(x=>x.key===key); if(b) b.count++;
    });
    const max=Math.max(1,...buckets.map(b=>b.count));
    el("painelEvolucao").innerHTML=`<div class="painelChart">${buckets.map(b=>`<div class="painelBarItem"><div class="painelBarTrack"><span style="height:${Math.max(6,Math.round((b.count/max)*100))}%"></span></div><div class="painelBarValue">${b.count}</div><div class="painelBarLabel">${escapeHtml(b.label)}</div></div>`).join("")}</div>`;
    setPainelHint(`<span class='ok'>Painel carregado.</span> (${total} registros)`);
  }catch(e){
    setPainelHint("<span class='warn'>Erro ao carregar painel:</span> "+escapeHtml(e?.message||e));
  }
}
el("btnPainelAtualizar").addEventListener("click", carregarPainel);
el("painelMes").addEventListener("change", carregarPainel);
el("btnPainelExport")?.addEventListener("click", exportPainelCsv);

el("btnDoLogin").addEventListener("click", async ()=>{
  const email=v("loginEmail"), pass=v("loginPass");
  if(!email||!pass) return el("loginHint").innerHTML="<span class='warn'>Preencha e-mail e senha.</span>";
  try{ await signInWithEmailAndPassword(auth,email,pass); isGuest=false; el("loginHint").innerHTML=""; }
  catch(e){ el("loginHint").innerHTML="<span class='warn'>Erro no login:</span> "+(e?.message||e); }
});
function showRegisterModal(show){
  const modal=el("registerModal");
  if(!modal) return;
  modal.style.display=show?"flex":"none";
  if(show){
    el("registerName").value="";
    el("registerEmail").value=v("loginEmail");
    el("registerPass").value="";
    el("registerHint").innerHTML="";
    setTimeout(()=>el("registerName")?.focus(), 80);
  }
}
el("btnCreateUser").addEventListener("click", ()=>showRegisterModal(true));
el("btnRegisterClose")?.addEventListener("click", ()=>showRegisterModal(false));
el("btnRegisterCancel")?.addEventListener("click", ()=>showRegisterModal(false));
el("registerModal")?.addEventListener("click", ev=>{ if(ev.target?.id==="registerModal") showRegisterModal(false); });
el("btnRegisterSubmit")?.addEventListener("click", async ()=>{
  const displayName=v("registerName").slice(0,40);
  const email=v("registerEmail");
  const pass=v("registerPass");
  if(!displayName) return el("registerHint").innerHTML="<span class='warn'>Informe o nome de usuario.</span>";
  if(!email||!pass) return el("registerHint").innerHTML="<span class='warn'>Preencha e-mail e senha.</span>";
  if(pass.length<6) return el("registerHint").innerHTML="<span class='warn'>Senha minima: 6 caracteres.</span>";
  try{
    const cred=await createUserWithEmailAndPassword(auth,email,pass);
    isGuest=false;
    await setDoc(doc(db,"users", cred.user.uid), {
      uid:cred.user.uid,
      email:lower(email),
      role:HARD_ADMINS.has(lower(email))?"admin":"repasse",
      displayName,
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    }, {merge:true});
    el("loginEmail").value=email;
    el("loginPass").value=pass;
    showRegisterModal(false);
    el("loginHint").innerHTML="<span class='ok'>Usuario cadastrado!</span>";
  }catch(e){ el("registerHint").innerHTML="<span class='warn'>Erro ao cadastrar:</span> "+(e?.message||e); }
});

async function getCurrentUserLabel(u){
  const fallback=(u?.displayName || lower(u?.email||"") || "Usuario").trim();
  try{
    const snap=await getDoc(doc(db,"users",u.uid));
    const data=snap.exists()?snap.data():{};
    return (data.displayName || data.name || fallback).trim();
  }catch(e){
    return fallback;
  }
}
async function endSession(){
  isGuest=false;
  try{ await signOut(auth); }catch(e){}
  showLogin();
}
el("btnGuest").addEventListener("click", ()=>{ isGuest=true; try{ signOut(auth);}catch(e){} showApp(); el("whoami").textContent="Convidado"; currentRole="convidado"; computePermissions(); setRoleUI(); setTab("nova"); loadLastConsultor(); });
el("btnLogout")?.addEventListener("click", endSession);
el("btnSwitchUser")?.addEventListener("click", endSession);
el("btnSidebarLogout")?.addEventListener("click", endSession);

function setButtonsDisabled(disabled){
  el("btnWhats").disabled=disabled; el("btnCopy").disabled=disabled;
  el("btnWhats").style.opacity=disabled?"0.6":"1"; el("btnCopy").style.opacity=disabled?"0.6":"1";
}
el("btnFillPadrao").addEventListener("click", ()=>{
  preencherPadrao();
  alert("Itens padrão aplicados.");
});
el("btnWhats").addEventListener("click", async ()=>{ if(!validar()) return; const texto=montar(); setButtonsDisabled(true); await salvarUmaVez(texto); abrirWhats(texto); clearCustomerFields(); setButtonsDisabled(false); });
el("btnCopy").addEventListener("click", async ()=>{ if(!validar()) return; const texto=montar(); setButtonsDisabled(true); await salvarUmaVez(texto); const ok=await copiar(texto); if(ok){ alert("Copiado!"); clearCustomerFields(); } setButtonsDisabled(false); });

["modelo","ano","versao","placa","km","kmComprou","debitosSel","debitosValor","finSel","finValor","fipe","valorPretendido","laudo","laudoObs","leilao","motor","luzes","arCond","blindadoChk","blindadoEstado","blindadoObs","testeRodagem","consultor","avaliadores","cliente","local","captacao","tablier","bancosOnde","bancosServico","volante","manopla","forro_motorista","forro_passageiro","forro_traseiro_d","forro_traseiro_e","forro_dianteiros","forro_traseiros","forro_todos","forroEstado","funilariaPecas","pneusQtd","pinturaCompleta","chuvaGranizo","paraChoqueD","paraChoqueT","retrovisorD","retrovisorE","farolD","farolE","lanternaD","lanternaE","vidroParabrisa","vidro_dd_chk","vidro_dd_act","vidro_de_chk","vidro_de_act","vidro_td_chk","vidro_td_act","vidro_te_chk","vidro_te_act","vidro_vg_chk","vidro_vg_act"].forEach(id=>{
  const e=el(id); if(!e) return;
  e.addEventListener("input", ()=>{
    if(id==="laudo"){ setStatusBadge(); toggleLaudoDescricao(); }
    if(id==="versao"){ toggleArCond(); }
    if(id==="blindadoChk" || id==="blindadoEstado"){ toggleBlindagem(); }
    atualizarPreview();
    refreshNovaAppUX();
  });
  e.addEventListener("change", ()=>{
    if(id==="laudo"){ setStatusBadge(); toggleLaudoDescricao(); }
    if(id==="versao"){ toggleArCond(); }
    if(id==="blindadoChk" || id==="blindadoEstado"){ toggleBlindagem(); }
    atualizarPreview();
  });
});

["histSearch","histLaudo"].forEach(id=>{ const e=el(id); if(!e) return; e.addEventListener("input", ()=>renderHistorico(histItemsCache)); e.addEventListener("change", ()=>renderHistorico(histItemsCache)); });
el("histLimit")?.addEventListener("change", openHistorico);
el("btnHistRefresh")?.addEventListener("click", openHistorico);
el("btnHistExport")?.addEventListener("click", exportHistoricoCsv);
el("btnHistoryReportClose")?.addEventListener("click", closeHistoryReport);
el("historyReportModal")?.addEventListener("click", ev=>{ if(ev.target?.id==="historyReportModal") closeHistoryReport(); });
el("btnHistoryReportCopy")?.addEventListener("click", async ()=>{ const ok=await copiar(currentHistoryReportText||""); if(ok) alert("Copiado!"); });

el("debitosSel").addEventListener("change",()=>{ toggleDebitos(); atualizarPreview(); refreshNovaAppUX(); });
el("finSel").addEventListener("change",()=>{ toggleFin(); atualizarPreview(); refreshNovaAppUX(); });
toggleDebitos(); toggleFin();

(function(){
  const chk=el("kmComprouNaoSabe"), wrap=el("kmComprouWrap"), inp=el("kmComprou");
  if(!chk || !wrap || !inp) return;
  const apply=()=>{ if(chk.checked){ inp.value="Não sabe"; inp.disabled=true; wrap.classList.add("hidden"); } else { inp.disabled=false; wrap.classList.remove("hidden"); if((inp.value||"").trim()==="Não sabe") inp.value=""; } atualizarPreview(); refreshNovaAppUX(); };
  chk.addEventListener("change", apply); apply();
})();

onAuthStateChanged(auth, async (u)=>{
  if(isGuest) return;
  if(u){
    showApp();
    el("whoami").textContent=(u?.displayName || lower(u.email||"") || "Usuario").trim();
    try{
      currentRole=await ensureUserDoc(u);
      el("whoami").textContent=await getCurrentUserLabel(u);
    }catch(e){
      if(e?.code==="user-blocked"){
        isGuest=false;
        try{ await signOut(auth); }catch(_){}
        showLogin();
        if(el("loginHint")) el("loginHint").innerHTML="<span class='warn'>Acesso bloqueado pelo administrador.</span>";
        currentRole="consultor";
        computePermissions();
        setRoleUI();
        return;
      }
      currentRole=HARD_ADMINS.has(lower(u.email||""))?"admin":"consultor";
    }
    computePermissions(); setRoleUI(); setTab("nova"); loadLastConsultor();
  }else{
    showLogin(); currentRole="consultor"; computePermissions(); setRoleUI();
  }
});

const FIPE_BASE="https://parallelum.com.br/fipe/api/v1/carros";
let fipeCache={ brands:null, modelsByBrand:{}, yearsByModel:{} };
function loadCache(){ try{ const raw=localStorage.getItem("fipeCache_v1"); if(raw){ const obj=JSON.parse(raw); if(obj && typeof obj==="object") fipeCache={...fipeCache, ...obj}; } }catch(e){} }
function saveCache(){ try{ localStorage.setItem("fipeCache_v1", JSON.stringify(fipeCache)); }catch(e){} }
loadCache();
function showFipeModal(show){ const m=el("fipeModal"); if(m) m.style.display=show?"flex":"none"; }
async function fipeFetchJson(url){ const r=await fetch(url, {headers:{accept:"application/json"}}); if(!r.ok) throw new Error(`FIPE HTTP ${r.status}`); return await r.json(); }
function setFipeStatus(html){ el("fipeStatus").innerHTML=html || ""; }
function fillSelect(selectId, items, placeholder){ const sel=el(selectId); if(!sel) return; sel.innerHTML=[`<option value="">${placeholder}</option>`].concat(items.map(it=>`<option value="${escapeHtml((it.codigo ?? it.code ?? it.id ?? "").toString())}">${escapeHtml((it.nome ?? it.name ?? "").toString())}</option>`)).join(""); }
async function ensureBrands(){ if(fipeCache.brands?.length) return fipeCache.brands; const brands=await fipeFetchJson(`${FIPE_BASE}/marcas`); fipeCache.brands=brands; saveCache(); return brands; }
async function ensureModels(brandCode){ if(!brandCode) return []; if(fipeCache.modelsByBrand[brandCode]) return fipeCache.modelsByBrand[brandCode]; const data=await fipeFetchJson(`${FIPE_BASE}/marcas/${brandCode}/modelos`); const models=(data && data.modelos)?data.modelos:[]; fipeCache.modelsByBrand[brandCode]=models; saveCache(); return models; }
async function ensureYears(brandCode, modelCode){ if(!brandCode || !modelCode) return []; const key=`${brandCode}-${modelCode}`; if(fipeCache.yearsByModel[key]) return fipeCache.yearsByModel[key]; const years=await fipeFetchJson(`${FIPE_BASE}/marcas/${brandCode}/modelos/${modelCode}/anos`); fipeCache.yearsByModel[key]=years; saveCache(); return years; }
let lastFipeResult=null;
function renderFipeResult(obj){
  if(!obj){ el("fipeResult").innerText="—"; return; }
  const lines=[]; if(obj.Marca) lines.push(`Marca: ${obj.Marca}`); if(obj.Modelo) lines.push(`Modelo: ${obj.Modelo}`); if(obj.AnoModelo!=null) lines.push(`Ano: ${obj.AnoModelo}`); if(obj.Combustivel) lines.push(`Combustível: ${obj.Combustivel}`); if(obj.CodigoFipe) lines.push(`Código FIPE: ${obj.CodigoFipe}`); if(obj.MesReferencia) lines.push(`Ref.: ${obj.MesReferencia}`); if(obj.Valor) lines.push(`Valor: ${obj.Valor}`); el("fipeResult").innerText=lines.join("\n");
}
async function refreshFipePrice(){
  const brand=el("fipeMarca").value, model=el("fipeModelo").value, year=el("fipeAno").value;
  lastFipeResult=null; renderFipeResult(null);
  if(!brand || !model || !year) return;
  setFipeStatus("Buscando valor FIPE...");
  try{ const obj=await fipeFetchJson(`${FIPE_BASE}/marcas/${brand}/modelos/${model}/anos/${encodeURIComponent(year)}`); lastFipeResult=obj; renderFipeResult(obj); setFipeStatus("<span class='ok'>Consulta pronta.</span>"); }
  catch(e){ setFipeStatus("<span class='warn'>Falha na consulta FIPE:</span> "+escapeHtml(e?.message||e)); }
}
function filterModelOptions(){ const txt=lower(el("fipeBuscaModelo").value || ""), sel=el("fipeModelo"); if(!sel) return; sel.querySelectorAll("option").forEach((opt,idx)=>{ if(idx===0) return; opt.style.display=!txt || (opt.textContent||"").toLowerCase().includes(txt) ? "" : "none"; }); }
async function openFipe(){
  showFipeModal(true); setFipeStatus("Carregando marcas...");
  try{ fillSelect("fipeMarca", await ensureBrands(), "Selecione"); setFipeStatus(""); }catch(e){ setFipeStatus("<span class='warn'>Não foi possível carregar marcas:</span> "+escapeHtml(e?.message||e)); }
  el("fipeBuscaModelo").value=""; el("fipeModelo").innerHTML="<option value=''>Selecione a marca</option>"; el("fipeAno").innerHTML="<option value=''>Selecione o modelo</option>"; lastFipeResult=null; renderFipeResult(null);
}
el("btnFipe").addEventListener("click", openFipe);
el("btnFipeClose").addEventListener("click", ()=>showFipeModal(false));
el("fipeModal").addEventListener("click", ev=>{ if(ev.target?.id==="fipeModal") showFipeModal(false); });
el("btnFipeClear").addEventListener("click", ()=>{ el("fipe").value=""; atualizarPreview(); refreshNovaAppUX(); });
el("fipeMarca").addEventListener("change", async ()=>{
  const brand=el("fipeMarca").value; el("fipeBuscaModelo").value=""; el("fipeAno").innerHTML="<option value=''>Selecione o modelo</option>"; lastFipeResult=null; renderFipeResult(null);
  if(!brand){ el("fipeModelo").innerHTML="<option value=''>Selecione a marca</option>"; return; }
  setFipeStatus("Carregando modelos...");
  try{ fillSelect("fipeModelo", await ensureModels(brand), "Selecione"); filterModelOptions(); setFipeStatus(""); }catch(e){ setFipeStatus("<span class='warn'>Falha ao carregar modelos:</span> "+escapeHtml(e?.message||e)); }
});
el("fipeBuscaModelo").addEventListener("input", filterModelOptions);
el("fipeModelo").addEventListener("change", async ()=>{
  const brand=el("fipeMarca").value, model=el("fipeModelo").value; lastFipeResult=null; renderFipeResult(null);
  if(!brand || !model){ el("fipeAno").innerHTML="<option value=''>Selecione o modelo</option>"; return; }
  setFipeStatus("Carregando anos...");
  try{ fillSelect("fipeAno", await ensureYears(brand, model), "Selecione"); setFipeStatus(""); }catch(e){ setFipeStatus("<span class='warn'>Falha ao carregar anos:</span> "+escapeHtml(e?.message||e)); }
});
el("fipeAno").addEventListener("change", refreshFipePrice);
el("btnFipeApply").addEventListener("click", ()=>{
  if(!lastFipeResult){ alert("Selecione Marca, Modelo e Ano para consultar o valor."); return; }
  if(lastFipeResult.Modelo) el("modelo").value=lastFipeResult.Modelo;
  if(lastFipeResult.AnoModelo!=null) el("ano").value=String(lastFipeResult.AnoModelo);
  if(lastFipeResult.Valor) el("fipe").value=lastFipeResult.Valor;
  atualizarPreview(); refreshNovaAppUX(); showFipeModal(false);
});
el("btnFavOpen")?.addEventListener("click", ()=>alert("Favoritos: função em atualização. (Layout mantido)"));
function clearNovaFormSafely(){
  if(!confirm("Limpar o formulário e apagar o rascunho salvo neste aparelho?")) return;
  try{ localStorage.removeItem("clubeauto_rascunho_v1"); }catch(e){}

  document.querySelectorAll("#viewNova input, #viewNova select, #viewNova textarea").forEach(node=>{
    const type=(node.type||"").toLowerCase();
    if(["button","submit","reset","file"].includes(type)) return;
    if(type==="checkbox" || type==="radio") node.checked=false;
    else if(node.tagName==="SELECT") node.selectedIndex=0;
    else node.value="";
    node.dispatchEvent(new Event("change", {bubbles:true}));
    node.dispatchEvent(new Event("input", {bubbles:true}));
  });

  if(el("laudo")) el("laudo").value="APROVADO";
  if(el("debitosSel")) el("debitosSel").value="Não";
  if(el("finSel")) el("finSel").value="Não";
  if(el("leilao")) el("leilao").value="Não";

  setStatusBadge();
  toggleLaudoDescricao();
  toggleBlindagem();
  toggleArCond();
  toggleDebitos();
  toggleFin();
  atualizarPreview();
  refreshNovaAppUX();
  if(typeof updateDraftBox === "function") updateDraftBox();
}
el("btnClearForm")?.addEventListener("click", clearNovaFormSafely);


function getSectionMetaByTitle(title){
  const t=(title||"").toLowerCase();
  if(t.includes("consulta fipe")) return {icon:"🔎", sub:"Busca rápida de mercado"};
  if(t.includes("veículo")) return {icon:"🚗", sub:"Identificação e dados base"};
  if(t.includes("negócio")) return {icon:"💰", sub:"FIPE, débitos e negociação"};
  if(t.includes("laudo")) return {icon:"📋", sub:"Status estrutural e observações"};
  if(t.includes("gastos")) return {icon:"🧰", sub:"Apontamentos internos e externos"};
  if(t.includes("teste de rodagem")) return {icon:"🛣️", sub:"Comportamento dinâmico"};
  if(t.includes("responsáveis")) return {icon:"👨‍🔧", sub:"Equipe da avaliação"};
  if(t.includes("cliente")) return {icon:"👤", sub:"Dados do atendimento"};
  if(t.includes("ações finais")) return {icon:"✅", sub:"Fechamento e envio"};
  return {icon:"📌", sub:"Preenchimento da vistoria"};
}
function getNovaSectionStateKey(){ return "clubeauto_nova_sections_v1"; }
function saveNovaSectionState(){
  try{
    const state={};
    document.querySelectorAll("#viewNova .sectionCard").forEach(card=>{
      state[card.dataset.sectionId || card.id] = !card.classList.contains("collapsed");
    });
    localStorage.setItem(getNovaSectionStateKey(), JSON.stringify(state));
  }catch(e){}
}
function loadNovaSectionState(){
  try{
    const raw=localStorage.getItem(getNovaSectionStateKey());
    const state=raw?JSON.parse(raw):{};
    document.querySelectorAll("#viewNova .sectionCard").forEach((card,idx)=>{
      const id=card.dataset.sectionId || card.id;
      const title=((card.querySelector(".sectionTitleMain")?.textContent)||"").toLowerCase();
      const defaultOpen = idx < 4 || title.includes("ações finais") || title.includes("cliente");
      const open = typeof state[id]==="boolean" ? state[id] : defaultOpen;
      card.classList.toggle("collapsed", !open);
    });
  }catch(e){}
}
function updateHeroStats(){
  const set=(id,val)=>{ const node=el(id); if(node) node.textContent=val; };
  const versao=getVersaoCompleta() || "Versão não informada";
  set("heroModelo", v("modelo") || "Modelo não informado");
  set("heroLaudo", (v("laudo") || "APROVADO").toUpperCase());
  set("heroCliente", v("cliente") || "Cliente não informado");
  set("cockpitModelo", v("modelo") || "Modelo não informado");
  set("cockpitAnoVersao", `${v("ano") || "Ano não informado"} • ${versao}`);
  set("cockpitPlaca", plateBR(v("placa")) || "Placa não informada");
  set("cockpitKm", (v("km") ? `${v("km")} km` : "KM não informado"));
  set("cockpitFipe", v("fipe") || "FIPE não informada");
  set("cockpitPretendido", v("valorPretendido") ? `Pretendido: ${v("valorPretendido")}` : "Valor pretendido não informado");
  set("cockpitCliente", v("cliente") || "Cliente não informado");
  set("cockpitConsultor", v("consultor") ? `Consultor: ${v("consultor")}` : "Consultor não informado");
}
function getOperationalScore(){
  const checks=[
    !!v("modelo"),
    !!v("ano"),
    !!v("versao"),
    plateBR(v("placa")).length>=7,
    !!v("km"),
    !!v("kmComprou"),
    !!v("fipe"),
    !!v("consultor"),
    !!getAvaliadoresText(),
    !!v("cliente")
  ];
  return Math.round((checks.filter(Boolean).length/checks.length)*100);
}
function getOperationalAlerts(){
  const alerts=[];
  const score=getOperationalScore();
  const placa=plateBR(v("placa"));
  const laudo=(v("laudo")||"APROVADO").toUpperCase();
  const fipeValue=parseBRLNumber(v("fipe"));
  const cliente=v("cliente");
  const clienteDigits=onlyDigits(cliente);
  const clienteLetters=(cliente.match(/[A-Za-zÀ-ÿ]/g)||[]).length;

  alerts.push({
    cls: score>=80 ? "ok" : score>=50 ? "warn" : "bad",
    t: score>=80 ? "Avaliação quase pronta" : "Preenchimento em andamento",
    s: `${score}% dos dados essenciais preenchidos.`
  });

  if(!placa) alerts.push({cls:"warn", t:"Placa não informada", s:"Informe a placa para evitar duplicidade e facilitar histórico."});
  else if(placa.length<7) alerts.push({cls:"bad", t:"Placa incompleta", s:"Revise a placa antes de salvar ou enviar."});
  else alerts.push({cls:"ok", t:"Placa pronta", s:placa});

  if(!fipeValue) alerts.push({cls:"warn", t:"FIPE pendente", s:"Informe ou consulte a FIPE antes do envio."});
  else if(fipeValue>500000) alerts.push({cls:"bad", t:"FIPE suspeita", s:`Valor atual: ${fmtBRL(String(fipeValue))}. Revise antes de enviar.`});
  else alerts.push({cls:"ok", t:"FIPE validada", s:fmtBRL(String(fipeValue))});

  if(laudo!=="APROVADO" && !v("laudoObs")) alerts.push({cls:"bad", t:"Laudo sem descrição", s:"Apontamento/reprovação precisa de observação."});
  else alerts.push({cls:laudo==="APROVADO"?"ok":"warn", t:`Laudo: ${laudo}`, s:laudo==="APROVADO"?"Sem descrição obrigatória.":"Descrição informada ou pendente."});

  if(!cliente) alerts.push({cls:"warn", t:"Cliente não informado", s:"Preencha antes de gerar o relatório final."});
  else if(clienteDigits.length>=8 && clienteLetters<3) alerts.push({cls:"bad", t:"Cliente parece telefone", s:"Coloque o nome no campo Cliente e telefone no WhatsApp."});
  else alerts.push({cls:"ok", t:"Cliente identificado", s:cliente});

  if(v("telefone") && onlyDigits(v("telefone")).length<10) alerts.push({cls:"warn", t:"WhatsApp incompleto", s:"Revise o telefone salvo no histórico."});
  else if(v("telefone")) alerts.push({cls:"info", t:"WhatsApp salvo", s:"Telefone fica apenas no histórico."});
  else alerts.push({cls:"info", t:"WhatsApp opcional", s:"Não aparece no relatório copiado/enviado."});

  return {score, alerts};
}
function updateOperationPanel(){
  const scoreNode=el("operationScore");
  const list=el("operationAlerts");
  if(!scoreNode || !list) return;
  const {score, alerts}=getOperationalAlerts();
  scoreNode.textContent=score+"%";
  list.innerHTML=alerts.slice(0,6).map(a=>`<div class="operationAlert ${a.cls}"><div class="t">${escapeHtml(a.t)}</div><div class="s">${escapeHtml(a.s)}</div></div>`).join("");
}
function getSectionRequiredIds(card){
  const title=((card.querySelector(".sectionTitleMain")?.textContent)||"").toLowerCase();
  if(title.includes("veículo")) return ["modelo","ano","versao","placa","km","kmComprou"];
  if(title.includes("negócio")) return ["fipe"];
  if(title.includes("responsáveis")) return ["consultor"];
  if(title.includes("cliente")) return ["cliente"];
  if(title.includes("ações finais")) return [];
  return [];
}
function isFieldComplete(id){
  if(id==="kmComprou") return !!v("kmComprou");
  if(id==="versao") return !!v("versao");
  return !!v(id);
}
function updateSectionCompletion(){
  const cards=Array.from(document.querySelectorAll("#viewNova .sectionCard"));
  let done=0;
  cards.forEach(card=>{
    const titleWrap=card.querySelector(".sectionTitleWrap");
    if(!titleWrap) return;
    let row=titleWrap.querySelector(".sectionTitleRow");
    if(!row){
      row=document.createElement("span");
      row.className="sectionTitleRow";
      const main=card.querySelector(".sectionTitleMain");
      const status=document.createElement("span");
      status.className="sectionStatus statusPending";
      status.textContent="Em andamento";
      if(main){
        row.appendChild(main.cloneNode(true));
        main.remove();
        row.prepend(status);
        row.insertBefore(row.lastChild, row.firstChild);
      }
      titleWrap.prepend(row);
    }
    let main=row.querySelector(".sectionTitleMain");
    if(!main){
      main=document.createElement("span");
      main.className="sectionTitleMain";
      main.textContent=((card.querySelector(".sectionHead .sectionTitleMain")?.textContent)||"");
      row.prepend(main);
    }
    let status=row.querySelector(".sectionStatus");
    if(!status){
      status=document.createElement("span");
      status.className="sectionStatus statusPending";
      row.appendChild(status);
    }
    const req=getSectionRequiredIds(card);
    let complete=true;
    if(req.length){ complete=req.every(isFieldComplete); }
    else if(((card.querySelector(".sectionTitleMain")?.textContent)||"").toLowerCase().includes("ações finais")) complete=(!!v("modelo") && !!v("cliente") && !!v("consultor") && !!v("fipe"));
    card.classList.toggle("completed", complete);
    card.classList.toggle("pending", !complete);
    status.className="sectionStatus "+(complete?"statusDone":"statusPending");
    status.textContent=complete?"Pronta":"Em andamento";
    const navBtn=document.querySelector(`#novaQuickNav .navSecBtn[data-target="${card.id}"]`);
    if(navBtn){
      navBtn.classList.toggle("done", complete);
      navBtn.classList.toggle("pending", !complete);
    }
    if(complete) done++;
  });
  const total=cards.length;
  const pct=total?Math.round((done/total)*100):0;
  const fill=el("appProgressFill"); if(fill) fill.style.width=pct+"%";
  const meta=el("appProgressMeta"); if(meta) meta.textContent=`${done} de ${total} seções prontas`;
  const hp=el("heroProgresso"); if(hp) hp.textContent=`${done}/${total} seções prontas`;
}
function initMobileActionDock(){
  if(document.querySelector(".mobileActionDock")) return;
  const dock=document.createElement("div");
  dock.className="mobileActionDock";
  dock.innerHTML=`<button type="button" class="mMiniP" id="dockPadrao">⚡ Padrão</button><button type="button" class="mMiniB" id="dockCopy">📋 Copiar</button><button type="button" class="mMiniW" id="dockWhats">📲 Whats</button>`;
  document.body.appendChild(dock);
  el("dockPadrao")?.addEventListener("click",()=>el("btnFillPadrao")?.click());
  el("dockCopy")?.addEventListener("click",()=>el("btnCopy")?.click());
  el("dockWhats")?.addEventListener("click",()=>el("btnWhats")?.click());
}
function initSectionObserver(){
  const navBtns=Array.from(document.querySelectorAll("#novaQuickNav .navSecBtn"));
  const cards=Array.from(document.querySelectorAll("#viewNova .sectionCard"));
  if(!cards.length || !navBtns.length || !('IntersectionObserver' in window)) return;
  const byId={}; navBtns.forEach(btn=>byId[btn.dataset.target]=btn);
  const obs=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        navBtns.forEach(b=>b.classList.toggle("active", b.dataset.target===entry.target.id));
      }
    });
  },{root:null,rootMargin:'-25% 0px -55% 0px',threshold:0.05});
  cards.forEach(card=>obs.observe(card));
}
function scrollToSectionByText(text){
  const cards=Array.from(document.querySelectorAll("#viewNova .sectionCard"));
  const card=cards.find(c=>((c.querySelector(".sectionTitleMain")?.textContent)||"").toLowerCase().includes((text||"").toLowerCase()));
  if(!card) return;
  card.classList.remove("collapsed");
  saveNovaSectionState();
  card.scrollIntoView({behavior:"smooth",block:"start"});
}
function updateAssistStrip(){
  const strip=el("summaryStrip");
  if(strip){
    const chips=[];
    const la=(v("laudo")||"APROVADO").toUpperCase();
    chips.push({cls: la==="REPROVADO"?"bad":la==="APONTAMENTO"?"warn":"good", txt:`Laudo: ${la}`});
    chips.push({cls: el("blindadoChk")?.checked ? (v("blindadoEstado")==="Avariado"?"warn":"info") : "good", txt: el("blindadoChk")?.checked ? `Blindagem: ${v("blindadoEstado")||"Bom"}` : "Sem blindagem"});
    if(isArVersion()) chips.push({cls: v("arCond")==="Bom"?"good":"warn", txt:`Ar: ${v("arCond")||"Bom"}`});
    if(v("leilao") && v("leilao")!=="Não") chips.push({cls:"warn", txt:`Leilão: ${v("leilao")}`});
    if(v("captacao")) chips.push({cls:"info", txt:`Captação: ${v("captacao")}`});
    if(v("cliente")) chips.push({cls:"good", txt:`Cliente: ${v("cliente")}`});
    strip.innerHTML=chips.map(ch=>`<span class="summaryChip ${ch.cls}"><span class="miniDot"></span>${escapeHtml(ch.txt)}</span>`).join("");
  }
  const set=(id,val)=>{ const node=el(id); if(node) node.textContent=val; };
  const la=(v("laudo")||"APROVADO").toUpperCase();
  set("assistLaudo", la);
  set("assistLeilao", v("leilao") && v("leilao")!=="Não" ? `Leilão: ${v("leilao")}` : "Sem informação de leilão");
  set("assistBlindagem", el("blindadoChk")?.checked ? `Blindagem ${v("blindadoEstado")||"Bom"}` : "Sem blindagem");
  set("assistAr", isArVersion() ? `Ar-condicionado: ${v("arCond")||"Bom"}` : "Ar-condicionado não aplicável");
  set("assistCliente", v("cliente") || "Cliente não informado");
  set("assistCaptacao", v("captacao") ? `Captação: ${v("captacao")}` : "Captação não informada");
  set("assistResponsavel", v("consultor") ? `Consultor: ${v("consultor")}` : "Consultor não informado");
  set("assistAvaliadores", getAvaliadoresText() ? `Avaliadores: ${getAvaliadoresText()}` : "Avaliadores não selecionados");
}
function bindUtilityBar(){
  el("btnExpandAllSecs")?.addEventListener("click",()=>{
    document.querySelectorAll("#viewNova .sectionCard").forEach(card=>card.classList.remove("collapsed"));
    saveNovaSectionState();
  });
  el("btnCollapseAllSecs")?.addEventListener("click",()=>{
    document.querySelectorAll("#viewNova .sectionCard").forEach((card,idx)=>{
      const title=((card.querySelector(".sectionTitleMain")?.textContent)||"").toLowerCase();
      const keepOpen=idx===0 || title.includes("ações finais");
      card.classList.toggle("collapsed", !keepOpen);
    });
    saveNovaSectionState();
  });
  el("btnGoAcoes")?.addEventListener("click",()=>scrollToSectionByText("ações finais"));
  el("btnGoCliente")?.addEventListener("click",()=>scrollToSectionByText("cliente"));
  el("btnGoLaudo")?.addEventListener("click",()=>scrollToSectionByText("laudo"));
}
function refreshNovaAppUX(){
  updateHeroStats();
  updateSectionCompletion();
  updateAssistStrip();
  updateOperationPanel();
  applyPremiumFieldState();
}
function initNovaAvaliacaoUX(){
  const view=el("viewNova");
  const nav=el("novaQuickNav");
  if(!view || !nav || view.dataset.appified==="1") return;
  const cards=Array.from(view.querySelectorAll(":scope > .card"));
  cards.forEach((card,idx)=>{
    const titleEl=card.querySelector("h3,.modalTitle");
    const title=(titleEl?.textContent || `Seção ${idx+1}`).replace(/\s+/g," ").trim();
    const meta=getSectionMetaByTitle(title);
    const secId=`nova-sec-${idx+1}`;
    card.dataset.sectionId=secId;
    card.classList.add("sectionCard");
    const head=document.createElement("button");
    head.type="button";
    head.className="sectionHead";
    head.innerHTML = `<span class="sectionHeadLeft"><span class="sectionIcon">${meta.icon}</span><span class="sectionTitleWrap"><span class="sectionTitleRow"><span class="sectionTitleMain">${escapeHtml(title)}</span><span class="sectionStatus statusPending">Em andamento</span></span><span class="sectionTitleSub">${escapeHtml(meta.sub)}</span></span></span><span class="sectionChevron">⌄</span>`;
    const body=document.createElement("div");
    body.className="sectionBody";
    while(card.firstChild){ body.appendChild(card.firstChild); }
    head.addEventListener("click", ()=>{
      card.classList.toggle("collapsed");
      saveNovaSectionState();
    });
    card.appendChild(head);
    card.appendChild(body);
    card.id=secId;

    const navBtn=document.createElement("button");
    navBtn.type="button";
    navBtn.className="navSecBtn";
    navBtn.textContent = `${meta.icon} ${title.replace(/^[^\wÀ-ÿ]+/,"")}`;
    navBtn.dataset.target = secId;
    navBtn.addEventListener("click", ()=>{
      card.classList.remove("collapsed");
      saveNovaSectionState();
      card.scrollIntoView({behavior:"smooth", block:"start"});
    });
    nav.appendChild(navBtn);
  });
  const footer=document.createElement("div");
  footer.className="appFooterHint";
  footer.textContent="Dica: toque no cabeçalho da seção para recolher ou expandir.";
  view.appendChild(footer);
  el("smartCopy")?.addEventListener("click",()=>el("btnCopy")?.click());
  el("smartWhats")?.addEventListener("click",()=>el("btnWhats")?.click());
  el("smartTopo")?.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
  bindUtilityBar();
  loadNovaSectionState();
  initMobileActionDock();
  initSectionObserver();
  refreshNovaAppUX();
  view.dataset.appified="1";
}



function applyPremiumFieldState(){
  document.querySelectorAll('input, select, textarea').forEach(node=>{
    const type=(node.type||'').toLowerCase();
    const isCheck=type==='checkbox' || type==='radio';
    if(isCheck) return;
    const raw=(node.value||'').toString().trim();
    const firstOption=node.tagName==='SELECT' ? (node.options?.[0]?.textContent||'').toString().trim().toLowerCase() : '';
    const valLower=raw.toLowerCase();
    const emptyLike = !raw || valLower==='selecione' || valLower===firstOption;
    node.classList.toggle('fieldFilled', !emptyLike);
    if(node.tagName==='SELECT') node.classList.toggle('selectActive', !emptyLike);
  });
}


/* ===== Rascunho automático local seguro ===== */
const DRAFT_KEY = "clubeauto_rascunho_v1";
const DRAFT_PRIVATE_FIELDS = new Set(["cliente","telefone","local","captacao"]);
let draftRestoring = false;
let draftSaveTimer = null;
function getDraftFields(){
  return Array.from(document.querySelectorAll("#viewNova input, #viewNova select, #viewNova textarea")).filter(node=>{
    if(!node.id) return false;
    if(DRAFT_PRIVATE_FIELDS.has(node.id)) return false;
    const type=(node.type||"").toLowerCase();
    if(["button","submit","reset","file"].includes(type)) return false;
    return true;
  });
}
function readNovaDraftData(){
  const data={};
  getDraftFields().forEach(node=>{
    const type=(node.type||"").toLowerCase();
    data[node.id] = (type==="checkbox" || type==="radio") ? !!node.checked : (node.value ?? "");
  });
  return data;
}
function hasUsefulDraftData(data){
  if(!data || typeof data!=="object") return false;
  return Object.entries(data).some(([key,val])=>{
    if(key==="laudo" && String(val||"").toUpperCase()==="APROVADO") return false;
    if(key==="debitosSel" && val==="Não") return false;
    if(key==="finSel" && val==="Não") return false;
    if(typeof val==="boolean") return val;
    return String(val||"").trim()!=="";
  });
}
function formatDraftTime(ts){
  try{ return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(ts)); }catch(e){ return ""; }
}
function updateDraftBox(){
  const box=el("draftAutoBox"), sub=el("draftAutoSub"), hint=el("draftSavedHint");
  if(!box) return;
  try{
    const raw=localStorage.getItem(DRAFT_KEY);
    if(!raw){ box.classList.remove("show"); return; }
    const draft=JSON.parse(raw);
    if(!hasUsefulDraftData(draft?.data)){ box.classList.remove("show"); return; }
    const current=readNovaDraftData();
    const same = JSON.stringify(current)===JSON.stringify(draft.data);
    box.classList.toggle("show", !same);
    if(sub) sub.textContent = `Salvo em ${formatDraftTime(draft.updatedAt || Date.now())}.`;
    if(hint) hint.textContent = same ? `Rascunho salvo às ${formatDraftTime(draft.updatedAt || Date.now())}` : "Rascunho automático ativo";
  }catch(e){ box.classList.remove("show"); }
}
function saveNovaDraftNow(){
  if(draftRestoring) return;
  try{
    const data=readNovaDraftData();
    if(!hasUsefulDraftData(data)){
      localStorage.removeItem(DRAFT_KEY);
      updateDraftBox();
      return;
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({version:1, updatedAt:Date.now(), data}));
    updateDraftBox();
  }catch(e){}
}
function saveNovaDraftDebounced(){
  if(draftRestoring) return;
  clearTimeout(draftSaveTimer);
  draftSaveTimer=setTimeout(saveNovaDraftNow, 350);
}
function restoreNovaDraft(){
  try{
    const raw=localStorage.getItem(DRAFT_KEY);
    if(!raw) return false;
    const draft=JSON.parse(raw);
    if(!hasUsefulDraftData(draft?.data)) return false;
    draftRestoring=true;
    Object.entries(draft.data).forEach(([id,val])=>{
      if(DRAFT_PRIVATE_FIELDS.has(id)) return;
      const node=el(id); if(!node) return;
      const type=(node.type||"").toLowerCase();
      if(type==="checkbox" || type==="radio") node.checked=!!val;
      else node.value=val ?? "";
      node.dispatchEvent(new Event("change", {bubbles:true}));
      node.dispatchEvent(new Event("input", {bubbles:true}));
    });
    draftRestoring=false;
    setStatusBadge(); toggleLaudoDescricao(); toggleBlindagem(); toggleArCond(); toggleDebitos(); toggleFin();
    atualizarPreview(); refreshNovaAppUX();
    updateDraftBox();
    return true;
  }catch(e){ draftRestoring=false; return false; }
}
function discardNovaDraft(){
  try{ localStorage.removeItem(DRAFT_KEY); }catch(e){}
  updateDraftBox();
}
function initNovaDraftAutoSave(){
  getDraftFields().forEach(node=>{
    node.addEventListener("input", saveNovaDraftDebounced);
    node.addEventListener("change", saveNovaDraftDebounced);
  });
  el("btnDraftRestore")?.addEventListener("click", ()=>{
    if(restoreNovaDraft()) alert("Rascunho recuperado.");
  });
  el("btnDraftDiscard")?.addEventListener("click", ()=>{
    if(!confirm("Descartar o rascunho salvo neste aparelho?")) return;
    discardNovaDraft();
  });
  el("btnFillPadrao")?.addEventListener("click", ()=>setTimeout(saveNovaDraftNow, 150));
  el("btnFipeApply")?.addEventListener("click", ()=>setTimeout(saveNovaDraftNow, 150));
  const originalAtualizarPreview = atualizarPreview;
  atualizarPreview = function(){
    originalAtualizarPreview();
    saveNovaDraftDebounced();
  };
  updateDraftBox();
}

setStatusBadge();
toggleLaudoDescricao();
toggleBlindagem();
toggleArCond();
initNovaAvaliacaoUX();
initNovaDraftAutoSave();
restoreNovaDraft();
atualizarPreview();
refreshNovaAppUX();
})().catch((err)=>{
  console.error(err);
  try{
    const hint=document.getElementById("loginHint");
    if(hint) hint.innerHTML="<span class='warn'>Erro ao carregar o app. Verifique sua conexao e tente novamente.</span>";
  }catch(e){}
});
