const SUPABASE_URL="https://mpixyyrghnyhyocssvjd.supabase.co";
const SUPABASE_KEY="sb_publishable_w9BdB54lL2TSiJYs_QjtFw_1Rb_V6ZK";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s), modal=$("#modalBackdrop"), content=$("#modalContent");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const CONFIDENTIAL_MSG="No se pueden enviar números de teléfono ni datos confidenciales. Los números de 7 o más cifras no están permitidos.";
function hasBlockedNumber(v){
 const s=String(v??"");
 if(/\d{7,}/.test(s))return true;
 const groups=s.match(/\d(?:[\s.-]?\d){6,}/g)||[];
 return groups.some(x=>x.replace(/\D/g,"").length>=7);
}
function validatePublicText(values){
 return Object.values(values||{}).some(v=>hasBlockedNumber(v));
}
function rejectConfidentialData(){
 alert(CONFIDENTIAL_MSG);
 return false;
}
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
async function renderHeroAvailability(){
 const box=$("#heroAvailability"); if(!box)return;
 const u=await user();
 if(!u){
   box.innerHTML='<div class="mini-top"><span class="live-dot"></span> MOVELO</div><div class="availability-empty"><strong>Tu información aparecerá aquí.</strong><span>Entra como cliente o transportista para ver únicamente tus propios datos.</span></div>';
   return;
 }
 const p=await myProfile();
 if(p?.role==="customer"){
   const r=await sb.from("load_requests").select("cargo_type,origin_area,destination_area,requested_date,quantity,urgency,status").eq("customer_id",u.id).order("created_at",{ascending:false}).limit(1);
   const l=r.data?.[0];
   box.innerHTML=l
    ? '<div class="mini-top"><span class="live-dot"></span> MI SOLICITUD</div><div class="availability-empty"><strong>'+esc(l.cargo_type)+' · '+esc(l.origin_area)+' → '+esc(l.destination_area)+'</strong><span>'+esc(l.quantity)+' · '+esc(l.requested_date)+' · '+esc(l.urgency)+' · '+esc(l.status)+'</span></div>'
    : '<div class="mini-top"><span class="live-dot"></span> MI MOVELO</div><div class="availability-empty"><strong>No tienes solicitudes activas.</strong><span>Aquí aparecerá tu propia solicitud cuando publiques una.</span></div>';
   return;
 }
 if(p?.role==="carrier"){
   const r=await sb.from("carrier_profiles").select("vehicle_type,capacity,base_zone,service_types,return_alerts,verification_status").eq("id",u.id).maybeSingle();
   const x=r.data;
   box.innerHTML=x
    ? '<div class="mini-top"><span class="live-dot"></span> MI DISPONIBILIDAD</div><div class="availability-empty"><strong>'+esc(x.vehicle_type||"Transporte")+' · '+esc(x.base_zone||"Zona no indicada")+'</strong><span>'+esc(x.capacity||"Capacidad no indicada")+' · '+esc((x.service_types||[]).join(", ")||"Servicios por definir")+' · Retornos: '+(x.return_alerts?"Sí":"No")+'</span></div>'
    : '<div class="mini-top"><span class="live-dot"></span> MI DISPONIBILIDAD</div><div class="availability-empty"><strong>Aún no tienes disponibilidad configurada.</strong><span>Completa tu perfil de transportista para aparecer aquí.</span></div>';
 }
}
function authForm(role){
 openModal('<span class="eyebrow">ENTRAR A MOVELO</span><h2>'+ (role==="customer"?"Publicar una carga":"Encontrar cargas")+'</h2><p class="modal-sub">Crea una cuenta de prueba o entra con una existente.</p><form id="authForm"><label>Correo<input name="email" type="email" required placeholder="tu@email.com"></label><label>Contraseña<input name="password" type="password" minlength="6" required placeholder="Mínimo 6 caracteres"></label><div class="two"><button class="secondary" type="button" id="signupBtn">Crear cuenta</button><button class="primary" type="submit">Entrar</button></div><small class="form-note" id="authMsg">🔒 Tu teléfono no se muestra al otro usuario.</small></form>');
 $("#signupBtn").onclick=async()=>{const d=Object.fromEntries(new FormData($("#authForm")));const r=await sb.auth.signUp({email:d.email,password:d.password});$("#authMsg").textContent=r.error?r.error.message:(r.data.session?"Cuenta creada.":"Cuenta creada. Revisa tu correo para confirmar y luego entra.")};
 $("#authForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const r=await sb.auth.signInWithPassword({email:d.email,password:d.password});if(r.error){$("#authMsg").textContent=r.error.message;return}await profile(role);closeModal();render();role==="customer"?loadForm():carrierDashboard()}
}
function loadForm(){
 openModal('<span class="eyebrow">CLIENTE · NECESITO MOVER</span><h2>¿Qué necesitas mover?</h2><p class="modal-sub">Primero eliges qué vas a mover. MOVELO te muestra solo las preguntas necesarias.</p><form id="loadForm"><label>¿Qué necesitas mover?<select name="move_type" id="moveType" required><option value="">Elige una opción</option><option value="persona">👤 Persona</option><option value="animal">🐄 Animal</option><option value="carga">📦 Carga</option><option value="mudanza">🏠 Mudanza</option></select></label><div id="moveDetails"></div><div class="two"><label>De<input name="origin" required placeholder="Ej. Penonomé"></label><label>A<input name="destination" required placeholder="Ej. Panamá"></label></div><div class="two"><label>Fecha<input name="pickup_date" type="date" required></label><label>Cantidad / tamaño<input name="quantity" required placeholder="Ej. 1,500 kg"></label></div><label>Urgencia<select name="urgency"><option>Normal</option><option>Pronto</option><option>Urgente</option></select></label><label>Presupuesto (opcional)<input name="budget" type="number" step="0.01" placeholder="Ej. 180"></label><label>Detalles adicionales<textarea name="notes" rows="3" placeholder="Horario, dirección de referencia, fragilidad, requisitos…"></textarea></label><button class="primary submit">Buscar transporte →</button><small class="form-note">🔒 Tu teléfono no se publica. MOVELO mantiene la comunicación protegida.</small></form>');
 const details=$('#moveDetails'), type=$('#moveType');
 const renderDetails=()=>{
   const t=type.value;
   let h='';
   if(t==='persona') h='<div class="dynamic-box"><label>¿Cuántas personas?<input name="people_count" type="number" min="1" value="1" required></label><label>¿Necesitas asistencia especial?<select name="special_requirements"><option value="">No</option><option>Adulto mayor</option><option>Persona con movilidad reducida</option><option>Otro</option></select></label></div>';
   if(t==='animal') h='<div class="dynamic-box"><label>¿Qué animal?<input name="cargo_detail" required placeholder="Ej. 2 cerdos, ganado, perro"></label><label>¿Cuántos?<input name="animal_count" type="number" min="1" value="1" required></label></div>';
   if(t==='carga') h='<div class="dynamic-box"><label>¿Qué tipo de carga?<select name="cargo_detail" required><option value="">Elige</option><option>Carga seca</option><option>Agrícola</option><option>Refrigerada</option><option>Maquinaria</option><option>Líquidos</option><option>Otro</option></select></label><label>Describe la carga<input name="special_requirements" placeholder="Ej. 30 lb de producto, 3 sacos, frágil…"></label></div>';
   if(t==='mudanza') h='<div class="dynamic-box"><label>¿Qué vas a mudar?<input name="cargo_detail" required placeholder="Ej. Casa de 2 habitaciones"></label><label>¿Necesitas que alguien cargue y descargue?<select name="loading_help" required><option value="no">No, nosotros hacemos todo</option><option value="si">Sí, necesito ayuda para cargar y descargar</option></select></label></div>';
   details.innerHTML=h;
 };
 type.onchange=renderDetails;
 $('#loadForm').onsubmit=async e=>{e.preventDefault();const u=await user(),d=Object.fromEntries(new FormData(e.target));if(validatePublicText({origin:d.origin,destination:d.destination,quantity:d.quantity,notes:d.notes,cargo_detail:d.cargo_detail,special_requirements:d.special_requirements}))return rejectConfidentialData();const move=d.move_type;const cargo=move==='persona'?'Personas':move==='animal'?'Animal':move==='mudanza'?'Mudanza / acarreo':(d.cargo_detail||'Carga');const quantity=move==='persona'?(d.people_count+' persona(s)'):move==='animal'?(d.animal_count+' animal(es)'):d.quantity;const r=await sb.from("load_requests").insert({customer_id:u.id,move_type:move,cargo_type:cargo,origin_area:d.origin,destination_area:d.destination,requested_date:d.pickup_date,quantity,urgency:(d.urgency||"normal").toLowerCase(),budget:d.budget?Number(d.budget):null,notes:d.notes||null,loading_help:d.loading_help||null,cargo_detail:d.cargo_detail||null,special_requirements:d.special_requirements||null,status:"open"});if(r.error){alert(r.error.message);return}openModal('<div class="success"><div class="success-icon">✓</div><span class="eyebrow">PUBLICADA</span><h2>Tu necesidad ya está en MOVELO.</h2><p>Ahora los transportistas pueden verla y cotizar.</p><button class="primary submit" id="ok">Ver mis cargas</button></div>');$('#ok').onclick=customerDashboard;refresh()};
}
async function customerDashboard(){
 const u=await user();if(!u)return authForm("customer");const r=await sb.from("load_requests").select("*").eq("customer_id",u.id).order("created_at",{ascending:false});if(r.error){alert(r.error.message);return}
 let h='<span class="eyebrow">MI MOVELO</span><h2>Mis cargas</h2><div class="dashboard">';
 if(!r.data?.length)h+='<p class="empty">Todavía no has publicado ninguna carga.</p>';
 for(const l of r.data||[]){const q=await sb.from("quotes").select("id,amount,note,status").eq("load_id",l.id).order("amount",{ascending:true});h+='<article class="dash-card"><div><b>'+esc(l.cargo_type)+'</b><span class="status">'+esc(l.status)+'</span></div><strong>'+esc(l.origin_area)+' → '+esc(l.destination_area)+'</strong><small>'+esc(l.quantity)+' · '+esc(l.requested_date)+' · '+esc(l.urgency)+'</small>'+(q.data?.length?'<div class="quotes"><b>Cotizaciones</b>'+q.data.map(x=>'<div class="quote"><span>$'+Number(x.amount).toFixed(2)+(x.note?' · '+esc(x.note):"")+'</span>'+(x.status==="pending"&&l.status==="open"?'<button class="primary small accept" data-q="'+x.id+'">Aceptar</button>':(x.status==="accepted"?'<button class="secondary small chatBtn" data-load="'+l.id+'">Chat</button>':'<span>'+esc(x.status)+'</span>'))+'</div>').join("")+'</div>':'<p class="muted">Aún no hay cotizaciones.</p>')+'</article>'}
 h+='</div><button class="primary submit" id="newLoad">+ Publicar otra carga</button>';openModal(h);$("#newLoad").onclick=loadForm;document.querySelectorAll(".accept").forEach(b=>b.onclick=async()=>{const x=await sb.rpc("accept_quote",{p_quote_id:b.dataset.q});if(x.error)alert(x.error.message);else customerDashboard()});document.querySelectorAll(".chatBtn").forEach(b=>b.onclick=()=>chatBox(b.dataset.load))}
async function chatBox(loadId){
 const u=await user();if(!u){authForm("customer");return}
 const load=await sb.from("load_requests").select("id,cargo_type,origin_area,destination_area,status").eq("id",loadId).maybeSingle();
 if(load.error||!load.data){alert(load.error?.message||"Operación no encontrada");return}
 const renderMessages=async()=>{
   const msgs=await sb.from("messages").select("id,sender_id,body,created_at").eq("load_id",loadId).order("created_at",{ascending:true});
   if(msgs.error){alert(msgs.error.message);return}
   const list=$("#chatList");
   if(!list)return;
   list.innerHTML=(msgs.data||[]).map(m=>'<div class="chat-msg '+(m.sender_id===u.id?'mine':'')+'"><span>'+esc(m.body)+'</span><small>'+new Date(m.created_at).toLocaleString()+'</small></div>').join("");
   list.scrollTop=list.scrollHeight;
 };
 openModal('<span class="eyebrow">CHAT MOVELO</span><h2>'+esc(load.data.origin_area)+' → '+esc(load.data.destination_area)+'</h2><p class="modal-sub">Comunicación dentro de MOVELO. Los teléfonos siguen ocultos.</p><div id="chatList" class="chat-list"></div><form id="chatForm"><textarea name="body" rows="2" maxlength="1000" required placeholder="Escribe aquí…"></textarea><button class="primary submit">Enviar mensaje</button></form>');
 await renderMessages();
 $("#chatForm").onsubmit=async e=>{
   e.preventDefault();
   const body=new FormData(e.target).get("body")?.toString().trim();
   if(!body)return;
   if(hasBlockedNumber(body))return rejectConfidentialData();
   const r=await sb.from("messages").insert({load_id:loadId,sender_id:u.id,body});
   if(r.error){alert(r.error.message);return}
   e.target.reset();
   await renderMessages();
 };
 const ch=sb.channel("movelo-chat-"+loadId)
   .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"load_id=eq."+loadId},()=>renderMessages())
   .subscribe();
 const closeWatcher=setInterval(()=>{if(modal.hidden){clearInterval(closeWatcher);sb.removeChannel(ch)}},1000);
}
async function uploadCarrierPhoto(file, kind, userId){
 if(!file)return null;
 if(!file.type.startsWith("image/"))throw new Error("Solo se permiten imágenes.");
 if(file.size>6*1024*1024)throw new Error("Cada foto debe pesar menos de 6 MB.");
 const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
 const path=userId+"/"+kind+"-"+Date.now()+"."+ext;
 const r=await sb.storage.from("carrier-docs").upload(path,file,{contentType:file.type,upsert:false});
 if(r.error)throw r.error;
 return path;
}
async function carrierDashboard(){
 const u=await user();if(!u)return authForm("carrier");
 openModal('<span class="eyebrow">TRANSPORTISTA · PERFIL</span><h2>Cuéntanos qué tienes para trabajar.</h2><p class="modal-sub">Por seguridad, necesitamos una foto clara de tu cara y una foto del vehículo o maquinaria que utilizas.</p><form id="carrierForm"><label>Foto de tu cara <input name="face_photo" type="file" accept="image/*" capture="user" required></label><label>Foto del vehículo / maquinaria <input name="vehicle_photo" type="file" accept="image/*" capture="environment" required></label><label>¿Qué tienes para trabajar?<select name="vehicle_type" required><option value="">Elige</option><option>Carro</option><option>Pickup</option><option>Panel / furgón</option><option>Camión</option><option>Camión refrigerado</option><option>Mula / tractocamión</option><option>Plataforma</option><option>Grúa</option><option>Moto</option><option>Bus / transporte de personas</option><option>Retroexcavadora</option><option>Bulldozer / cuchilla</option><option>Tractor agrícola</option><option>Cosechadora / maquinaria agrícola</option><option>Montacargas</option><option>Otra maquinaria terrestre</option></select></label><div class="two"><label>Capacidad<input name="capacity" placeholder="Ej. 2,000 kg"></label><label>Zona base<input name="base_zone" placeholder="Ej. Penonomé"></label></div><label>Servicios que puedes ofrecer<input name="service_types" placeholder="Ej. carga, mudanza, acarreo, trabajo agrícola"></label><label>Describe tu vehículo o maquinaria<input name="vehicle_description" placeholder="Marca, modelo, capacidad o implementos"></label><label>Tipos de carga que manejas<input name="cargo_types" placeholder="Ej. agrícola, seca, animales, mudanza"></label><label>¿Quieres recibir oportunidades de retorno?<select name="return_alerts"><option value="true">Sí</option><option value="false">No por ahora</option></select></label><button class="primary submit">Guardar perfil y ver oportunidades →</button><small class="form-note">🔒 Las fotos no muestran tu teléfono. El perfil queda pendiente de verificación.</small></form>');
 $("#carrierForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));if(validatePublicText({capacity:d.capacity,base_zone:d.base_zone,service_types:d.service_types,vehicle_description:d.vehicle_description,cargo_types:d.cargo_types}))return rejectConfidentialData();try{const face=await uploadCarrierPhoto(d.face_photo,"face",u.id);const vehicle=await uploadCarrierPhoto(d.vehicle_photo,"vehicle",u.id);const r=await sb.from("carrier_profiles").upsert({id:u.id,vehicle_type:d.vehicle_type,capacity:d.capacity,base_zone:d.base_zone,cargo_types:(d.cargo_types||"").split(",").map(x=>x.trim()).filter(Boolean),service_types:(d.service_types||"").split(",").map(x=>x.trim()).filter(Boolean),vehicle_description:d.vehicle_description||null,face_photo_path:face,vehicle_photo_path:vehicle,verification_status:"pending",return_alerts:d.return_alerts==="true"});if(r.error)throw r.error;carrierLoads()}catch(err){alert(err.message||"No se pudieron guardar las fotos y el perfil.")}}
}
async function carrierOperations(){
 const u=await user();if(!u)return authForm("carrier");
 const r=await sb.from("quotes").select("id,amount,note,status,load_id,load_requests(id,cargo_type,origin_area,destination_area,requested_date,quantity,urgency,status)").eq("carrier_id",u.id).order("created_at",{ascending:false});
 if(r.error){alert(r.error.message);return}
 let h='<span class="eyebrow">MI MOVELO</span><h2>Mis operaciones</h2><p class="modal-sub">Aquí ves tus cotizaciones y los viajes aceptados.</p><div class="dashboard">';
 if(!r.data?.length)h+='<p class="empty">Todavía no has enviado cotizaciones.</p>';
 for(const q of r.data||[]){const l=q.load_requests;
   h+='<article class="dash-card"><div><b>'+esc(l?.cargo_type||"Carga")+'</b><span class="status">'+esc(q.status)+'</span></div><strong>'+esc(l?.origin_area||"")+' → '+esc(l?.destination_area||"")+'</strong><small>'+esc(l?.quantity||"")+' · '+esc(l?.requested_date||"")+' · '+esc(l?.urgency||"")+'</small><p>Tu cotización: <b>$'+Number(q.amount).toFixed(2)+'</b>'+(q.note?' · '+esc(q.note):"")+'</p>';
   if(q.status==="accepted"&&l?.status==="accepted")h+='<button class="secondary small chatBtn" data-load="'+q.load_id+'">Abrir chat</button>';
   else if(q.status==="pending")h+='<span class="muted">Esperando respuesta del cliente.</span>';
   h+='</article>';
 }
 h+='</div><button class="primary submit" id="openLoads">Ver cargas abiertas</button>';
 openModal(h);
 $("#openLoads").onclick=carrierLoads;
 document.querySelectorAll(".chatBtn").forEach(b=>b.onclick=()=>chatBox(b.dataset.load));
}
async function opportunityDetails(loadId){ const r=await sb.from("load_requests").select("*").eq("id",loadId).maybeSingle(); if(r.error||!r.data){alert(r.error?.message||"Oportunidad no encontrada");return} const l=r.data;if(validatePublicText({origin:l.origin_area,destination:l.destination_area,quantity:l.quantity,notes:l.notes,cargo_detail:l.cargo_detail,special_requirements:l.special_requirements}))return rejectConfidentialData(); openModal('<span class="eyebrow">OPORTUNIDAD MOVELO</span><h2>'+esc(l.origin_area)+' → '+esc(l.destination_area)+'</h2><p>'+esc(l.cargo_type)+' · '+esc(l.quantity)+' · '+esc(l.requested_date)+' · '+esc(l.urgency)+'</p><p>'+esc(l.notes||"Sin detalles adicionales.")+'</p><p>🔒 Contacto protegido.</p><button class="primary submit" id="quoteFromOpp">Cotizar esta oportunidad →</button>'); $("#quoteFromOpp").onclick=()=>quoteForm(loadId); }
async function carrierLoads(){
 const r=await sb.from("load_requests").select("*").eq("status","open").order("created_at",{ascending:false});if(r.error){alert(r.error.message);return}
 let h='<span class="eyebrow">TRANSPORTISTA</span><h2>Cargas abiertas</h2><p class="modal-sub">No ves teléfonos. Solo la información necesaria para cotizar.</p><div class="dashboard">';
 if(!r.data?.length)h+='<p class="empty">No hay cargas abiertas todavía.</p>';
 for(const l of r.data||[])h+='<article class="dash-card"><div><b>'+esc(l.cargo_type)+'</b><span class="status">'+esc(l.urgency)+'</span></div><strong>'+esc(l.origin_area)+' → '+esc(l.destination_area)+'</strong><small>'+esc(l.quantity)+' · '+esc(l.requested_date)+'</small><p>'+esc(l.notes||"Sin detalles adicionales.")+'</p><button class="primary small quoteBtn" data-load="'+l.id+'">Cotizar</button></article>';
 h+='</div>';openModal(h);document.querySelectorAll(".quoteBtn").forEach(b=>b.onclick=()=>quoteForm(b.dataset.load))
}
function quoteForm(loadId){
 openModal('<span class="eyebrow">COTIZACIÓN</span><h2>¿Cuánto cobras por este viaje?</h2><form id="quoteForm"><label>Precio<input name="amount" type="number" step="0.01" required placeholder="Ej. 200"></label><label>Mensaje (opcional)<textarea name="note" rows="3" placeholder="Horario, condiciones, etc."></textarea></label><button class="primary submit">Enviar cotización →</button><small class="form-note">🔒 Tu teléfono no se comparte.</small></form>');
 $("#quoteForm").onsubmit=async e=>{e.preventDefault();const u=await user(),d=Object.fromEntries(new FormData(e.target));if(validatePublicText({note:d.note}))return rejectConfidentialData();const r=await sb.from("quotes").insert({load_id:loadId,carrier_id:u.id,amount:Number(d.amount),note:d.note||null,status:"pending"});if(r.error){alert(r.error.message);return}openModal('<div class="success"><div class="success-icon">✓</div><span class="eyebrow">ENVIADA</span><h2>Cotización enviada.</h2><p>El cliente la verá desde su cuenta. Su teléfono sigue protegido.</p><button class="primary submit" id="backLoads">Volver a cargas</button></div>');$("#backLoads").onclick=carrierLoads}
}
async function refresh(){
 const g=$("#opportunityGrid");if(!g)return;
 const u=await user();
 const p=u?await myProfile():null;
 if(!u||p?.role!=="carrier"){g.innerHTML='<div class="empty">Esta sección es para transportistas. Entra como transportista para ver oportunidades abiertas.</div>';return}
 const r=await sb.from("load_requests").select("*").eq("status","open").order("created_at",{ascending:false});
 if(r.error){g.innerHTML='<div class="empty">No se pudo cargar la información.</div>';return}
 if(!r.data?.length){g.innerHTML='<div class="empty">No hay cargas reales todavía. Publica una para probar.</div>';return}
 g.innerHTML=r.data.map(l=>'<article class="opportunity" tabindex="0" role="button" data-load="'+l.id+'"><div class="opp-head"><span class="pill">📦 '+esc(l.cargo_type)+'</span><span class="urgency">'+esc(l.urgency)+'</span></div><div class="opp-route"><strong>'+esc(l.origin_area)+'</strong><span>→</span><strong>'+esc(l.destination_area)+'</strong></div><div class="opp-meta"><span>⚖️ '+esc(l.quantity)+'</span><span>📅 '+esc(l.requested_date)+'</span></div><div class="opp-bottom"><span class="budget">'+(l.budget!==null&&l.budget!==undefined?"Presupuesto $"+Number(l.budget).toFixed(2):"Precio a cotizar")+'</span><span class="privacy">🔒 Contacto protegido</span></div><div class="opp-action">Ver oportunidad →</div></article>').join("");
document.querySelectorAll(".opportunity[data-load]").forEach(card=>{card.onclick=()=>opportunityDetails(card.dataset.load);card.onkeydown=e=>{if(e.key==="Enter"||e.key===" ")opportunityDetails(card.dataset.load)}});
}
let liveChannel=null;
function startLiveMarket(){
 if(liveChannel)return;
 const connect=async()=>{
   const u=await user();
   if(!u){if(liveChannel){sb.removeChannel(liveChannel);liveChannel=null}return}
   if(liveChannel)return;
   liveChannel=sb.channel("movelo-live-market")
     .on("postgres_changes",{event:"*",schema:"public",table:"load_requests"},()=>refresh())
     .on("postgres_changes",{event:"*",schema:"public",table:"quotes"},()=>refresh())
     .subscribe();
 };
 connect();
 setInterval(connect,5000);
 setInterval(refresh,15000);
}
async function adminDashboard(){
 const u=await user();
 if(!u){return authForm("customer")}
 const p=await myProfile();
 if(p?.role!=="admin"){alert("Esta pantalla es solo para el administrador.");return}
 const [profiles,loads,carriers,quotes,messages]=await Promise.all([
   sb.from("profiles").select("id,full_name,role").order("full_name"),
   sb.from("load_requests").select("id,customer_id,cargo_type,origin_area,destination_area,requested_date,quantity,urgency,status,created_at").order("created_at",{ascending:false}),
   sb.from("carrier_profiles").select("id,vehicle_type,capacity,base_zone,verification_status,verified,return_alerts"),
   sb.from("quotes").select("id,load_id,carrier_id,amount,status,created_at").order("created_at",{ascending:false}),
   sb.from("messages").select("id,load_id,sender_id,body,created_at").order("created_at",{ascending:false})
 ]);
 const err=[profiles,loads,carriers,quotes,messages].find(x=>x.error);
 if(err){alert(err.error.message);return}
 const ps=profiles.data||[], ls=loads.data||[], cs=carriers.data||[], qs=quotes.data||[], ms=messages.data||[];
 const nameById=new Map(ps.map(x=>[x.id,x.full_name||"Usuario"]));
 let h='<span class="eyebrow">DUEÑO · ADMINISTRADOR</span><h2>Centro de Control MOVELO</h2><p class="modal-sub">Aquí tienes la visión completa de la plataforma. Esta información no se muestra a clientes ni transportistas.</p><div class="admin-stats"><div><strong>'+ps.length+'</strong><span>Usuarios</span></div><div><strong>'+ls.length+'</strong><span>Cargas</span></div><div><strong>'+cs.length+'</strong><span>Transportistas</span></div><div><strong>'+qs.length+'</strong><span>Cotizaciones</span></div><div><strong>'+ms.length+'</strong><span>Mensajes</span></div></div>';
 h+='<div class="admin-block"><div class="section-head row"><div><span class="eyebrow">USUARIOS</span><h3>Usuarios registrados</h3></div></div><div class="admin-table">'+(ps.length?ps.map(x=>'<div class="admin-row"><b>'+esc(x.full_name)+'</b><span>'+esc(x.role)+'</span></div>').join(""):'<p class="empty">No hay usuarios.</p>')+'</div></div>';
 h+='<div class="admin-block"><span class="eyebrow">CARGAS</span><h3>Todas las necesidades publicadas</h3><div class="admin-table">'+(ls.length?ls.slice(0,30).map(x=>'<div class="admin-row"><div><b>'+esc(x.cargo_type)+'</b><small>'+esc(nameById.get(x.customer_id)||"Usuario")+' · '+esc(x.origin_area)+' → '+esc(x.destination_area)+'</small></div><span>'+esc(x.status)+'</span></div>').join(""):'<p class="empty">No hay cargas.</p>')+'</div></div>';
 h+='<div class="admin-block"><span class="eyebrow">TRANSPORTISTAS</span><h3>Flota registrada</h3><div class="admin-table">'+(cs.length?cs.map(x=>'<div class="admin-row"><div><b>'+esc(x.vehicle_type||"Transporte")+'</b><small>'+esc(x.base_zone||"Zona no indicada")+' · '+esc(x.capacity||"Capacidad no indicada")+'</small></div><span>'+esc(x.verification_status||"pending")+'</span></div>').join(""):'<p class="empty">No hay transportistas.</p>')+'</div></div>';
 h+='<div class="admin-block"><span class="eyebrow">COTIZACIONES</span><h3>Actividad comercial</h3><div class="admin-table">'+(qs.length?qs.slice(0,30).map(x=>'<div class="admin-row"><div><b>
 const u=await user(),box=$("#sessionBox");if(!u){box.innerHTML="";$("#loginNav").textContent="Entrar";await renderHeroAvailability();return}
 const p=await myProfile();
 box.innerHTML='<span>Sesión: <b>'+esc(u.email)+'</b> · '+esc(p?.role||"usuario")+'</span> <button id="logoutBtn" class="secondary small">Salir</button>';
 $("#logoutBtn").onclick=async()=>{await sb.auth.signOut();render();refresh()};
 $("#loginNav").textContent="Mi cuenta";await renderHeroAvailability();
}
async function start(role){const u=await user();if(!u){authForm(role);return}await profile(role);render();role==="customer"?loadForm():carrierDashboard()}
$("#clientBtn").onclick=$("#clientBtn2").onclick=()=>start("customer");
$("#carrierBtn").onclick=$("#carrierBtn2").onclick=()=>start("carrier");
$("#loginNav").onclick=async()=>{const p=await myProfile();if(p?.role==="admin")adminDashboard();else if(p?.role==="customer")customerDashboard();else if(p?.role==="carrier")carrierOperations();else authForm("customer")};
$("#refreshBtn").onclick=refresh;startLiveMarket();$("#menuBtn").onclick=()=>$(".nav").classList.toggle("show");
sb.auth.onAuthStateChange(()=>setTimeout(render,0));refresh();render();
+Number(x.amount).toFixed(2)+'</b><small>'+esc(nameById.get(x.carrier_id)||"Transportista")+' · carga '+esc(x.load_id.slice(0,8))+'</small></div><span>'+esc(x.status)+'</span></div>').join(""):'<p class="empty">No hay cotizaciones.</p>')+'</div></div>';
 h+='<button class="secondary submit" id="adminClose">Cerrar centro de control</button>';
 openModal(h);$("#adminClose").onclick=closeModal;
}

async function render(){
 const u=await user(),box=$("#sessionBox");if(!u){box.innerHTML="";$("#loginNav").textContent="Entrar";await renderHeroAvailability();return}
 const p=await myProfile();
 box.innerHTML='<span>Sesión: <b>'+esc(u.email)+'</b> · '+esc(p?.role||"usuario")+'</span> <button id="logoutBtn" class="secondary small">Salir</button>';
 $("#logoutBtn").onclick=async()=>{await sb.auth.signOut();render();refresh()};
 $("#loginNav").textContent="Mi cuenta";await renderHeroAvailability();
}
async function start(role){const u=await user();if(!u){authForm(role);return}await profile(role);render();role==="customer"?loadForm():carrierDashboard()}
$("#clientBtn").onclick=$("#clientBtn2").onclick=()=>start("customer");
$("#carrierBtn").onclick=$("#carrierBtn2").onclick=()=>start("carrier");
$("#loginNav").onclick=async()=>{const p=await myProfile();if(p?.role==="customer")customerDashboard();else if(p?.role==="carrier")carrierOperations();else authForm("customer")};
$("#refreshBtn").onclick=refresh;startLiveMarket();$("#menuBtn").onclick=()=>$(".nav").classList.toggle("show");
sb.auth.onAuthStateChange(()=>setTimeout(render,0));refresh();render();
