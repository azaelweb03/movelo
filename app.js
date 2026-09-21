const SUPABASE_URL="https://mpixyyrghnyhyocssvjd.supabase.co";
const SUPABASE_KEY="sb_publishable_w9BdB54lL2TSiJYs_QjtFw_1Rb_V6ZK";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s), modal=$("#modalBackdrop"), content=$("#modalContent");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const openModal=h=>{content.innerHTML=h;modal.hidden=false},closeModal=()=>{modal.hidden=true;content.innerHTML=""};
$("#closeModal").onclick=closeModal;modal.onclick=e=>{if(e.target===modal)closeModal()};
async function user(){return (await sb.auth.getUser()).data.user}
async function profile(role){
 const u=await user();if(!u)return null;
 let {data:p}=await sb.from("profiles").select("*").eq("id",u.id).maybeSingle();
 if(!p){const r=await sb.from("profiles").insert({id:u.id,role,full_name:u.email?.split("@")[0]||"Usuario"}).select().single();if(r.error)throw r.error;p=r.data}
 else if(role&&p.role!==role&&p.role!=="admin"){await sb.from("profiles").update({role}).eq("id",u.id);p.role=role}
 return p
}
async function myProfile(){const u=await user();if(!u)return null;return (await sb.from("profiles").select("*").eq("id",u.id).maybeSingle()).data}
function authForm(role){
 openModal('<span class="eyebrow">ENTRAR A MOVELO</span><h2>'+ (role==="customer"?"Publicar una carga":"Encontrar cargas")+'</h2><p class="modal-sub">Crea una cuenta de prueba o entra con una existente.</p><form id="authForm"><label>Correo<input name="email" type="email" required placeholder="tu@email.com"></label><label>Contraseña<input name="password" type="password" minlength="6" required placeholder="Mínimo 6 caracteres"></label><div class="two"><button class="secondary" type="button" id="signupBtn">Crear cuenta</button><button class="primary" type="submit">Entrar</button></div><small class="form-note" id="authMsg">🔒 Tu teléfono no se muestra al otro usuario.</small></form>');
 $("#signupBtn").onclick=async()=>{const d=Object.fromEntries(new FormData($("#authForm")));const r=await sb.auth.signUp({email:d.email,password:d.password});$("#authMsg").textContent=r.error?r.error.message:(r.data.session?"Cuenta creada.":"Cuenta creada. Revisa tu correo para confirmar y luego entra.")};
 $("#authForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const r=await sb.auth.signInWithPassword({email:d.email,password:d.password});if(r.error){$("#authMsg").textContent=r.error.message;return}await profile(role);closeModal();render();role==="customer"?loadForm():carrierDashboard()}
}
function loadForm(){
 openModal('<span class="eyebrow">CLIENTE</span><h2>Publica lo que necesitas mover.</h2><form id="loadForm"><label>Tipo de carga<select name="cargo_type" required><option value="">Elige</option><option>Carga seca</option><option>Agrícola</option><option>Animal</option><option>Refrigerada</option><option>Maquinaria</option><option>Líquidos</option><option>Personas</option><option>Mudanza / acarreo</option></select></label><div class="two"><label>De<input name="origin" required placeholder="Ej. Penonomé"></label><label>A<input name="destination" required placeholder="Ej. Panamá"></label></div><div class="two"><label>Fecha<input name="pickup_date" type="date" required></label><label>Cantidad<input name="quantity" required placeholder="Ej. 1,500 kg"></label></div><label>Urgencia<select name="urgency"><option>Normal</option><option>Pronto</option><option>Urgente</option></select></label><label>Presupuesto (opcional)<input name="budget" type="number" step="0.01" placeholder="Ej. 180"></label><label>Detalles<textarea name="notes" rows="3" placeholder="Horario, fragilidad, requisitos…"></textarea></label><button class="primary submit">Publicar necesidad →</button><small class="form-note">🔒 El teléfono no se publica.</small></form>');
 $("#loadForm").onsubmit=async e=>{e.preventDefault();const u=await user(),d=Object.fromEntries(new FormData(e.target));const r=await sb.from("load_requests").insert({customer_id:u.id,cargo_type:d.cargo_type,origin:d.origin,destination:d.destination,pickup_date:d.pickup_date,quantity:d.quantity,urgency:d.urgency,budget:d.budget?Number(d.budget):null,notes:d.notes||null,status:"open"});if(r.error){alert(r.error.message);return}openModal('<div class="success"><div class="success-icon">✓</div><span class="eyebrow">PUBLICADA</span><h2>Tu carga ya está en MOVELO.</h2><p>Ahora un transportista compatible puede verla y cotizar.</p><button class="primary submit" id="ok">Ver mis cargas</button></div>');$("#ok").onclick=customerDashboard;refresh()}
}
async function customerDashboard(){
 const u=await user();if(!u)return authForm("customer");const r=await sb.from("load_requests").select("*").eq("customer_id",u.id).order("created_at",{ascending:false});if(r.error){alert(r.error.message);return}
 let h='<span class="eyebrow">MI MOVELO</span><h2>Mis cargas</h2><div class="dashboard">';
 if(!r.data?.length)h+='<p class="empty">Todavía no has publicado ninguna carga.</p>';
 for(const l of r.data||[]){const q=await sb.from("quotes").select("id,amount,note,status").eq("load_id",l.id).order("amount",{ascending:true});h+='<article class="dash-card"><div><b>'+esc(l.cargo_type)+'</b><span class="status">'+esc(l.status)+'</span></div><strong>'+esc(l.origin)+' → '+esc(l.destination)+'</strong><small>'+esc(l.quantity)+' · '+esc(l.pickup_date)+' · '+esc(l.urgency)+'</small>'+(q.data?.length?'<div class="quotes"><b>Cotizaciones</b>'+q.data.map(x=>'<div class="quote"><span>$'+Number(x.amount).toFixed(2)+(x.note?' · '+esc(x.note):"")+'</span>'+(x.status==="pending"&&l.status==="open"?'<button class="primary small accept" data-q="'+x.id+'">Aceptar</button>':(x.status==="accepted"?'<button class="secondary small chatBtn" data-load="'+l.id+'">Chat</button>':'<span>'+esc(x.status)+'</span>'))+'</div>').join("")+'</div>':'<p class="muted">Aún no hay cotizaciones.</p>')+'</article>'}
 h+='</div><button class="primary submit" id="newLoad">+ Publicar otra carga</button>';openModal(h);$("#newLoad").onclick=loadForm;document.querySelectorAll(".accept").forEach(b=>b.onclick=async()=>{const x=await sb.rpc("accept_quote",{p_quote_id:b.dataset.q});if(x.error)alert(x.error.message);else customerDashboard()});document.querySelectorAll(".chatBtn").forEach(b=>b.onclick=()=>chatBox(b.dataset.load))}
async function chatBox(loadId){
 const u=await user();if(!u)return authForm("customer");
 const load=await sb.from("load_requests").select("id,cargo_type,origin,destination,status").eq("id",loadId).maybeSingle();
 if(load.error||!load.data){alert(load.error?.message||"Operación no encontrada");return}
 const msgs=await sb.from("messages").select("id,sender_id,body,created_at").eq("load_id",loadId).order("created_at",{ascending:true});
 if(msgs.error){alert(msgs.error.message);return}
 let h='<span class="eyebrow">CHAT MOVELO</span><h2>'+esc(load.data.origin)+' → '+esc(load.data.destination)+'</h2><p class="modal-sub">Comunicación dentro de MOVELO. Los teléfonos siguen ocultos.</p><div class="chat-list">';
 h+=(msgs.data||[]).map(m=>'<div class="chat-msg '+(m.sender_id===u.id?'mine':'')+'"><span>'+esc(m.body)+'</span><small>'+new Date(m.created_at).toLocaleString()+'</small></div>').join("");
 h+='</div><form id="chatForm"><textarea name="body" rows="2" maxlength="1000" required placeholder="Escribe aquí…"></textarea><button class="primary submit">Enviar mensaje</button></form>';
 openModal(h);
 $("#chatForm").onsubmit=async e=>{e.preventDefault();const body=new FormData(e.target).get("body")?.toString().trim();if(!body)return;const r=await sb.from("messages").insert({load_id:loadId,sender_id:u.id,body});if(r.error){alert(r.error.message);return}chatBox(loadId)};
 const ch=sb.channel("movelo-chat-"+loadId).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"load_id=eq."+loadId},()=>{if(!modal.hidden)chatBox(loadId)}).subscribe();
 setTimeout(()=>sb.removeChannel(ch),30000);
}
async function carrierDashboard(){
 const u=await user();if(!u)return authForm("carrier");
 openModal('<span class="eyebrow">TRANSPORTISTA</span><h2>Configura tu transporte.</h2><form id="carrierForm"><label>Vehículo<select name="vehicle_type" required><option>Carro</option><option>Pickup</option><option>Camión</option><option>Mula / pesado</option><option>Moto</option><option>Transporte de personas</option><option>Maquinaria</option></select></label><div class="two"><label>Capacidad<input name="capacity" placeholder="Ej. 2,000 kg"></label><label>Zona base<input name="base_zone" placeholder="Ej. Penonomé"></label></div><label>Tipos de carga<input name="cargo_types" placeholder="Ej. agrícola, seca, maquinaria"></label><label>Retornos<select name="return_alerts"><option value="true">Sí, quiero oportunidades de regreso</option><option value="false">No por ahora</option></select></label><button class="primary submit">Guardar y ver cargas →</button></form>');
 $("#carrierForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const r=await sb.from("carrier_profiles").upsert({id:u.id,vehicle_type:d.vehicle_type,capacity:d.capacity,base_zone:d.base_zone,cargo_types:d.cargo_types,return_alerts:d.return_alerts==="true"});if(r.error){alert(r.error.message);return}carrierLoads()}
}
async function carrierLoads(){
 const r=await sb.from("load_requests").select("*").eq("status","open").order("created_at",{ascending:false});if(r.error){alert(r.error.message);return}
 let h='<span class="eyebrow">TRANSPORTISTA</span><h2>Cargas abiertas</h2><p class="modal-sub">No ves teléfonos. Solo la información necesaria para cotizar.</p><div class="dashboard">';
 if(!r.data?.length)h+='<p class="empty">No hay cargas abiertas todavía.</p>';
 for(const l of r.data||[])h+='<article class="dash-card"><div><b>'+esc(l.cargo_type)+'</b><span class="status">'+esc(l.urgency)+'</span></div><strong>'+esc(l.origin)+' → '+esc(l.destination)+'</strong><small>'+esc(l.quantity)+' · '+esc(l.pickup_date)+'</small><p>'+esc(l.notes||"Sin detalles adicionales.")+'</p><button class="primary small quoteBtn" data-load="'+l.id+'">Cotizar</button></article>';
 h+='</div>';openModal(h);document.querySelectorAll(".quoteBtn").forEach(b=>b.onclick=()=>quoteForm(b.dataset.load))
}
function quoteForm(loadId){
 openModal('<span class="eyebrow">COTIZACIÓN</span><h2>¿Cuánto cobras por este viaje?</h2><form id="quoteForm"><label>Precio<input name="amount" type="number" step="0.01" required placeholder="Ej. 200"></label><label>Mensaje (opcional)<textarea name="note" rows="3" placeholder="Horario, condiciones, etc."></textarea></label><button class="primary submit">Enviar cotización →</button><small class="form-note">🔒 Tu teléfono no se comparte.</small></form>');
 $("#quoteForm").onsubmit=async e=>{e.preventDefault();const u=await user(),d=Object.fromEntries(new FormData(e.target));const r=await sb.from("quotes").insert({load_id:loadId,carrier_id:u.id,amount:Number(d.amount),note:d.note||null,status:"pending"});if(r.error){alert(r.error.message);return}openModal('<div class="success"><div class="success-icon">✓</div><span class="eyebrow">ENVIADA</span><h2>Cotización enviada.</h2><p>El cliente la verá desde su cuenta. Su teléfono sigue protegido.</p><button class="primary submit" id="backLoads">Volver a cargas</button></div>');$("#backLoads").onclick=carrierLoads}
}
async function refresh(){
 const r=await sb.from("load_requests").select("*").eq("status","open").order("created_at",{ascending:false});const g=$("#opportunityGrid");if(r.error){g.innerHTML='<div class="empty">No se pudo cargar la información.</div>';return}if(!r.data?.length){g.innerHTML='<div class="empty">No hay cargas reales todavía. Publica una para probar.</div>';return}g.innerHTML=r.data.map(l=>'<article class="opportunity"><div class="opp-head"><span class="pill">📦 '+esc(l.cargo_type)+'</span><span class="urgency">'+esc(l.urgency)+'</span></div><div class="opp-route"><strong>'+esc(l.origin)+'</strong><span>→</span><strong>'+esc(l.destination)+'</strong></div><div class="opp-meta"><span>⚖️ '+esc(l.quantity)+'</span><span>📅 '+esc(l.pickup_date)+'</span></div><div class="opp-bottom"><span class="budget">'+(l.budget?"Presupuesto $"+Number(l.budget).toFixed(2):"Precio a cotizar")+'</span><span class="privacy">🔒 Contacto protegido</span></div></article>').join("")
}
let liveChannel=null;
function startLiveMarket(){
  if(liveChannel) return;
  liveChannel=sb.channel("movelo-live-market")
    .on("postgres_changes",{event:"*",schema:"public",table:"load_requests"},()=>refresh())
    .on("postgres_changes",{event:"*",schema:"public",table:"quotes"},()=>refresh())
    .subscribe();
  setInterval(refresh,15000);
}

async function render(){
 const u=await user(),box=$("#sessionBox");if(!u){box.innerHTML="";$("#loginNav").textContent="Entrar";return}const p=await myProfile();box.innerHTML='<span>Sesión: <b>'+esc(u.email)+'</b> · '+esc(p?.role||"usuario")+'</span> <button id="logoutBtn" class="secondary small">Salir</button>';$("#logoutBtn").onclick=async()=>{await sb.auth.signOut();render();refresh()};$("#loginNav").textContent="Mi cuenta"
}
async function start(role){const u=await user();if(!u){authForm(role);return}await profile(role);render();role==="customer"?loadForm():carrierDashboard()}
$("#clientBtn").onclick=$("#clientBtn2").onclick=()=>start("customer");
$("#carrierBtn").onclick=$("#carrierBtn2").onclick=()=>start("carrier");
$("#loginNav").onclick=async()=>{const p=await myProfile();if(p?.role==="customer")customerDashboard();else if(p?.role==="carrier")carrierLoads();else authForm("customer")};
$("#refreshBtn").onclick=refresh;startLiveMarket();$("#menuBtn").onclick=()=>$(".nav").classList.toggle("show");
sb.auth.onAuthStateChange(()=>setTimeout(render,0));refresh();render();