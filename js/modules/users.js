window.createUsersModule = function createUsersModule(ctx){
  let usersIndexByUid = {};
  let unsubUsers = null;

  const fb = () => ctx.firebase;

  async function refreshUsersIndex(){
    try{
      const { db, query, collection, orderBy, limit, getDocs } = fb();
      const qy = query(collection(db,"users"), orderBy("email","asc"), limit(2000));
      const snap = await getDocs(qy);
      const idx = {};
      snap.docs.forEach(d=>{
        const data = d.data()||{};
        const uid = data.uid || d.id;
        idx[uid] = { uid, email:(data.email||"").toString(), role:(data.role||"consultor").toString(), displayName:(data.displayName||"").toString() };
      });
      usersIndexByUid = idx;
    }catch(e){}
  }

  function getUserLabelByUid(uid, fallbackEmail){
    const u = usersIndexByUid[uid];
    return (u && (u.displayName||u.email)) ? (u.displayName||u.email) : (fallbackEmail||uid||"(desconhecido)");
  }

  async function ensureUserDoc(user){
    const { db, doc, getDoc, setDoc, serverTimestamp } = fb();
    const uid=user.uid, email=ctx.lower(user.email||"");
    const ref=doc(db,"users",uid), snap=await getDoc(ref);
    if(!snap.exists()){
      const role=ctx.HARD_ADMINS.has(email)?"admin":"repasse";
      await setDoc(ref,{uid,email,role,displayName:(email.split("@")[0]||"").slice(0,24),createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});
      return role;
    }
    const data=snap.data()||{};
    if(data.accessBlocked===true || data.deleted===true || data.disabled===true || data.role==="bloqueado"){
      const err=new Error("Usuario bloqueado pelo administrador.");
      err.code="user-blocked";
      throw err;
    }
    let role=(data.role || (ctx.HARD_ADMINS.has(email)?"admin":"repasse")).toString();
    if(ctx.HARD_ADMINS.has(email) && role!=="admin"){ await setDoc(ref,{role:"admin",updatedAt:serverTimestamp()},{merge:true}); role="admin"; }
    return role;
  }

  function openUsers(){
    const { el, escapeHtml, lower, ROLE_ORDER, HARD_ADMINS } = ctx;
    const { db, auth, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } = fb();
    el("usersList").innerHTML=""; el("usersHint").innerHTML="";
    const state=ctx.getState();
    if(state.isGuest){ el("usersHint").innerHTML="<span class='warn'>Convidado nao tem acesso.</span>"; return; }
    if(!state.isAdmin){ el("usersHint").innerHTML="<span class='warn'>Apenas Admin.</span>"; return; }
    if(unsubUsers) unsubUsers();
    const qy=query(collection(db,"users"), orderBy("email","asc"), limit(500));
    unsubUsers=onSnapshot(qy,(snap)=>{
      const users=snap.docs.map(d=>({id:d.id,...d.data()}));
      el("usersList").innerHTML = users.map(u=>{
        const blocked=!!(u.accessBlocked===true || u.deleted===true || u.disabled===true || u.role==="bloqueado");
        const roleValue=ROLE_ORDER.includes(u.role) ? u.role : (ROLE_ORDER.includes(u.previousRole) ? u.previousRole : "repasse");
        const opts=ROLE_ORDER.map(r=>`<option value="${r}" ${r===roleValue?"selected":""}>${r}</option>`).join("");
        const emailLower=lower(u.email||"");
        const protectedUser=HARD_ADMINS.has(emailLower);
        const statusBadge=blocked ? `<div class="badgeRole blocked">BLOQUEADO</div>` : `<div class="badgeRole">${escapeHtml(u.role||"consultor")}</div>`;
        const blockBtn=blocked
          ? `<button class="btnP" data-restore="${u.id}">Reativar acesso</button>`
          : `<button class="btnDanger" data-block="${u.id}" ${protectedUser?"disabled title='Admin principal protegido'":""}>Excluir acesso</button>`;
        return `<div class="userItem ${blocked?"userBlocked":""}">
          <div class="userTop">
            <div><div class="userEmail">${escapeHtml(u.email||"")}</div><div class="userMeta">UID: ${escapeHtml(u.uid||u.id)}</div></div>
            ${statusBadge}
          </div>
          <div class="userActions">
            <div><label>Nome de usuário</label><input data-name="${u.id}" placeholder="Ex: Lucas" value="${escapeHtml(u.displayName||"")}"></div>
            <div><label>Alterar cargo</label><select data-role="${u.id}">${opts}</select></div>
            <div><button class="btnP" data-save="${u.id}">Salvar</button></div>
            <div>${blockBtn}</div>
          </div>
          ${blocked?`<div class="hint" style="margin-top:8px"><span class="warn">Acesso bloqueado.</span> Este usuario nao consegue entrar no app.</div>`:""}
        </div>`;
      }).join("") || "<div class='userItem'><b>Nenhum usuario.</b></div>";

      el("usersList").querySelectorAll("[data-save]").forEach(btn=>btn.addEventListener("click", async()=>{
        const id=btn.dataset.save;
        const sel=el("usersList").querySelector(`select[data-role="${id}"]`);
        const inp=el("usersList").querySelector(`input[data-name="${id}"]`);
        const newRole=(sel?.value||"consultor").toString();
        const newName=((inp?.value||"").toString().trim()).slice(0,40);
        try{
          await updateDoc(doc(db,"users", id), {role:newRole, displayName:newName, updatedAt:serverTimestamp()});
          alert("Salvo!");
          if(auth.currentUser && id===auth.currentUser.uid){
            ctx.setCurrentRole(newRole);
            ctx.computePermissions();
            ctx.setRoleUI();
          }
        }catch(e){ alert("Erro: "+(e?.message||e)); }
      }));

      el("usersList").querySelectorAll("[data-block]").forEach(btn=>btn.addEventListener("click", async()=>{
        const id=btn.dataset.block;
        const user=users.find(u=>u.id===id) || {};
        const emailLower=lower(user.email||"");
        if(auth.currentUser && id===auth.currentUser.uid) return alert("Voce nao pode excluir o proprio acesso.");
        if(HARD_ADMINS.has(emailLower)) return alert("Este admin principal esta protegido.");
        if(!confirm(`Excluir/bloquear acesso de ${user.email||"este usuario"}?\n\nEle nao conseguira mais entrar no app.`)) return;
        try{
          const admin=auth.currentUser;
          const previousRole=ROLE_ORDER.includes(user.role) ? user.role : (ROLE_ORDER.includes(user.previousRole) ? user.previousRole : "repasse");
          await updateDoc(doc(db,"users", id), {
            accessBlocked:true,
            deleted:true,
            disabled:true,
            role:"bloqueado",
            previousRole,
            blockedAt:serverTimestamp(),
            blockedByUid:admin?.uid||"",
            blockedByEmail:lower(admin?.email||""),
            updatedAt:serverTimestamp()
          });
          alert("Acesso bloqueado.");
        }catch(e){ alert("Erro ao bloquear acesso: "+(e?.message||e)); }
      }));

      el("usersList").querySelectorAll("[data-restore]").forEach(btn=>btn.addEventListener("click", async()=>{
        const id=btn.dataset.restore;
        const user=users.find(u=>u.id===id) || {};
        const role=ROLE_ORDER.includes(user.previousRole) ? user.previousRole : "repasse";
        if(!confirm(`Reativar acesso de ${user.email||"este usuario"} como ${role}?`)) return;
        try{
          const admin=auth.currentUser;
          await updateDoc(doc(db,"users", id), {
            accessBlocked:false,
            deleted:false,
            disabled:false,
            role,
            restoredAt:serverTimestamp(),
            restoredByUid:admin?.uid||"",
            restoredByEmail:lower(admin?.email||""),
            updatedAt:serverTimestamp()
          });
          alert("Acesso reativado.");
        }catch(e){ alert("Erro ao reativar acesso: "+(e?.message||e)); }
      }));
    }, (err)=>{ el("usersList").innerHTML="<div class='userItem'><b>Erro:</b> "+escapeHtml(err?.message||err)+"</div>"; });
  }

  return {
    refreshUsersIndex,
    getUserLabelByUid,
    ensureUserDoc,
    openUsers
  };
};
