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
 const textFields=["origin","destination","notes","cargo_detail","service_detail","work_location","quantity_detail"];
 return textFields.some(k=>hasBlockedNumber(values?.[k]));
}
function rejectConfidentialData(){
 alert(CONFIDENTIAL_MSG);
 return false;
}
const openModal=h=>{content.innerHTML=h;modal.hidden=false},closeModal=()=>{modal.hidden=true;content.innerHTML=""};
$("#closeModal").onclick=closeModal;modal.onclick=e=>{if(e.target===modal)closeModal()};
function fmtDate(d){return d?new Date(d).toLocaleString("es-PA",{dateStyle:"short",timeStyle:"short"}):"—"}function fmtMoney(n){return n==null?"—":"$"+Number(n).toFixed(2)}function auctionClosed(l){return !!l.auction_close_at&&new Date(l.auction_close_at)<=new Date()}function closeText(l){return l.auction_close_at?"Cierra: "+fmtDate(l.auction_close_at):"Cierre pendiente"}
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
 openModal('<span class="eyebrow">ENTRAR A MOVELO</span><h2>'+ (role==="customer"?"Publicar una carga":"Encontrar cargas")+'</h2><p class="modal-sub">Crea tu cuenta o entra con la que ya tienes.</p><form id="authForm"><label>Correo<input name="email" type="email" autocomplete="email" required placeholder="tu@email.com"></label><label>Contraseña<input name="password" type="password" autocomplete="current-password" minlength="6" required placeholder="Mínimo 6 caracteres"></label><div class="two"><button class="secondary" type="button" id="signupBtn">Crear cuenta</button><button class="primary" type="submit" id="loginBtn">Entrar</button></div><small class="form-note" id="authMsg">🔒 Tu teléfono no se muestra al otro usuario.</small></form>');
 const form=$("#authForm"),authMessage=$("#authMsg"),loginBtn=$("#loginBtn");
 $("#signupBtn").onclick=async()=>{
   const d=Object.fromEntries(new FormData(form));
   const email=String(d.email||"").trim().toLowerCase(),password=String(d.password||"");
   loginBtn.disabled=true;
   const r=await sb.auth.signUp({email,password});
   loginBtn.disabled=false;
   authMessage.textContent=r.error?r.error.message:(r.data.session?"Cuenta creada.":"Cuenta creada. Revisa tu correo para confirmar y luego entra.");
 };
 form.onsubmit=async e=>{
   e.preventDefault();
   const d=Object.fromEntries(new FormData(e.target));
   const email=String(d.email||"").trim().toLowerCase(),password=String(d.password||"");
   loginBtn.disabled=true;
   loginBtn.textContent="Entrando…";
   authMessage.textContent="Conectando con MOVELO…";
   try{
     const r=await sb.auth.signInWithPassword({email,password});
     if(r.error){authMessage.textContent=r.error.message;return}
     if(!r.data?.session){authMessage.textContent="La cuenta fue aceptada pero no se recibió la sesión. Vuelve a tocar Entrar.";return}
     await profile(role);
     closeModal();
     await render();
     role==="customer"?loadForm():carrierDashboard();
   }catch(err){
     console.error(err);
     authMessage.textContent=err?.message||"No pudimos abrir tu sesión. Intenta de nuevo.";
   }finally{
     loginBtn.disabled=false;
     loginBtn.textContent="Entrar";
   }
 }
}
function loadForm(){
 openModal('<span class="eyebrow">CLIENTE · NECESITO MOVER</span><h2>¿Qué servicio necesitas?</h2><p class="modal-sub">Primero elige el tipo de transporte. MOVELO te hará las preguntas necesarias para que el transportista entienda el trabajo y pueda ofertar un precio.</p><form id="loadForm"><label>Tipo de transporte<select name="transport_type" id="transportType" required><option value="">Elige una opción</option><option>Bicicleta</option><option>Moto</option><option>Carro</option><option>Pickup</option><option>Panel / furgón</option><option>Camión</option><option>Bus / transporte de personas</option><option>Tractor</option><option>Maquinaria</option><option>Otro</option></select></label><div id="transportDetails"></div><label>Fecha del servicio<input name="pickup_date" type="date" required></label><div class="two"><label>Urgencia<select name="urgency"><option>Normal</option><option>Pronto</option><option>Urgente</option></select></label><label>Presupuesto (opcional)<input name="budget" type="number" step="0.01" placeholder="Ej. 180"></label></div><label>Descripción breve del trabajo<textarea name="notes" rows="4" required placeholder="Explica lo que necesitas: qué hay que mover o hacer, cantidades, horarios, acceso, si hay que cargar/descargar, entregar en persona, esperar, etc."></textarea><small class="form-note">Mientras más claro describas el trabajo, mejor podrá calcular su oferta el transportista.</small></label><button class="primary submit">Publicar solicitud →</button><small class="form-note">🔒 Tu teléfono no se publica. MOVELO mantiene la comunicación protegida.</small></form>');
 const details=$("#transportDetails"), type=$("#transportType");
 const renderDetails=()=>{
   const t=type.value;
   let h="";
   const route='<div class="two"><label>De<input name="origin" required placeholder="Lugar de salida"></label><label>A<input name="destination" required placeholder="Lugar de destino"></label></div>';
   if(["Bicicleta","Moto"].includes(t)){
     h='<div class="dynamic-box"><label>¿Qué necesitas enviar?<select name="service_detail" required><option value="">Elige</option><option>Mensajería / documento</option><option>Delivery</option><option>Paquete pequeño</option><option>Otro</option></select></label>'+route+'<label>¿Hay que bajarse y hacer la entrega?<select name="delivery_help" required><option value="si">Sí, recoger y entregar</option><option value="no">Solo transportar</option></select></label><label>¿Qué se transporta?<input name="cargo_detail" required placeholder="Ej. documentos, comida, paquete"></label><label>Peso aproximado (opcional)<input name="weight" placeholder="Ej. 5 kg"></label></div>';
   } else if(["Carro","Pickup","Panel / furgón","Camión"].includes(t)){
     h='<div class="dynamic-box"><label>¿Qué servicio necesitas?<select name="service_detail" required><option value="">Elige</option><option>Transporte de personas</option><option>Carga / acarreo</option><option>Mensajería / entrega</option><option>Mudanza</option><option>Otro</option></select></label>'+route+'<label>¿Qué se transporta o quién viaja?<input name="cargo_detail" required placeholder="Ej. 3 personas / muebles / 20 sacos"></label><label>¿Hay que cargar y descargar?<select name="loading_help" required><option value="no">No</option><option value="si">Sí, necesito ayuda</option></select></label><label>Peso aproximado (opcional)<input name="weight" placeholder="Ej. 1,500 kg"></label></div>';
   } else if(t==="Bus / transporte de personas"){
     h='<div class="dynamic-box">'+route+'<label>¿Cuántas personas?<input name="people_count" type="number" min="1" required placeholder="Ej. 20"></label><label>¿Es solo traslado o hay que esperar?<select name="service_detail" required><option value="">Elige</option><option>Solo traslado</option><option>Traslado y regreso</option><option>Traslado con espera</option><option>Otro</option></select></label></div>';
   } else if(t==="Tractor"){
     h='<div class="dynamic-box"><label>¿Dónde será el trabajo?<input name="work_location" required placeholder="Finca, comunidad o dirección"></label><label>¿Qué trabajo necesitas realizar?<select name="service_detail" required><option value="">Elige</option><option>Arado</option><option>Rastra</option><option>Desbroce / limpieza</option><option>Movimiento de tierra</option><option>Remolque / acarreo</option><option>Otro</option></select></label><label>Describe el trabajo<input name="cargo_detail" required placeholder="Ej. limpiar 2 hectáreas"></label><label>¿Cuántas horas o qué cantidad de trabajo?<input name="quantity_detail" placeholder="Ej. 6 horas / 2 hectáreas"></label></div>';
   } else if(t==="Maquinaria"){
     h='<div class="dynamic-box"><label>¿Dónde será el trabajo?<input name="work_location" required placeholder="Lugar o dirección"></label><label>¿Qué maquinaria necesitas?<input name="cargo_detail" required placeholder="Ej. retroexcavadora"></label><label>¿Qué trabajo debe realizar?<input name="service_detail" required placeholder="Ej. excavación, nivelación, carga"></label><label>¿Cuánto trabajo estimas?<input name="quantity_detail" placeholder="Ej. 8 horas / 30 m³"></label></div>';
   } else {
     h='<div class="dynamic-box">'+route+'<label>¿Qué necesitas exactamente?<input name="cargo_detail" required placeholder="Describe el servicio"></label><label>Detalles del servicio<input name="service_detail" placeholder="Ej. carga, entrega, personas, trabajo en finca"></label></div>';
   }
   details.innerHTML=h;
 };
 type.onchange=renderDetails;
 $("#loadForm").onsubmit=async e=>{
   e.preventDefault();
   const u=await user(),d=Object.fromEntries(new FormData(e.target));
   if(validatePublicText(d))return rejectConfidentialData();
   const t=d.transport_type;
   const workAt=["Tractor","Maquinaria"].includes(t);
   const cargo=d.cargo_detail||d.service_detail||t;
   const quantity=d.people_count?(d.people_count+" persona(s)"):d.quantity_detail||(d.weight?"Peso aprox. "+d.weight:"Servicio solicitado");
   const routeOrigin=workAt?(d.work_location||"Trabajo en lugar indicado"):(d.origin||"");
   const routeDestination=workAt?(d.work_location||"Trabajo en lugar indicado"):(d.destination||"");
   const notes=[d.notes,d.service_detail?"Servicio: "+d.service_detail:null,d.loading_help?("Carga/descarga: "+(d.loading_help==="si"?"Sí":"No")):null,d.delivery_help?("Entrega: "+(d.delivery_help==="si"?"Sí, recoger y entregar":"No")):null,d.weight?"Peso aprox.: "+d.weight:null,d.work_location?"Lugar de trabajo: "+d.work_location:null,d.quantity_detail?"Cantidad de trabajo: "+d.quantity_detail:null].filter(Boolean).join(" · ");
   const r=await sb.from("load_requests").insert({customer_id:u.id,move_type:workAt?"trabajo":t.toLowerCase(),cargo_type:cargo,origin_area:routeOrigin,destination_area:routeDestination,requested_date:d.pickup_date,quantity,urgency:(d.urgency||"normal").toLowerCase(),budget:d.budget?Number(d.budget):null,notes:notes||null,loading_help:d.loading_help||null,cargo_detail:d.cargo_detail||null,special_requirements:d.service_detail||null});
   if(r.error){alert(r.error.message);return}
   openModal('<div class="success"><div class="success-icon">✓</div><span class="eyebrow">PUBLICADA</span><h2>Tu solicitud ya está en MOVELO.</h2><p>Los transportistas podrán leer los detalles y ofertar por el trabajo.</p><button class="primary submit" id="ok">Ver mis solicitudes</button></div>');
   $("#ok").onclick=customerDashboard;refresh();
 };
}
async function customerDashboard(){const u=await user();if(!u)return authForm("customer");const r=await sb.from("load_requests").select("*").eq("customer_id",u.id).order("created_at",{ascending:false});if(r.error){alert(r.error.message);return}let h='<span class="eyebrow">PANEL DEL CLIENTE</span><h2>Mis cargas</h2><div class="dashboard">';for(const l of r.data||[]){const q=await sb.from("quotes").select("id,amount,note,status").eq("load_id",l.id).order("amount",{ascending:true});h+='<article class="dash-card"><div><b>'+esc(l.cargo_type)+'</b><span class="status">'+esc(l.status)+'</span></div><strong>'+esc(l.origin_area)+' → '+esc(l.destination_area)+'</strong><small>'+esc(l.quantity)+' · '+esc(l.requested_date)+' · '+esc(closeText(l))+'</small>';if(l.status==="open")h+=auctionClosed(l)?'<p class="auction-closed">🔒 Subasta cerrada</p>':'<p class="auction-open">🟢 Subasta abierta</p>';if(q.data?.length){h+='<div class="quotes"><b>Ofertas</b>';for(const x of q.data){h+='<div class="quote"><div><strong>'+fmtMoney(x.amount)+'</strong><small>'+esc(x.note||"Sin condiciones adicionales")+'</small></div>';if(x.status==="pending"&&l.status==="open"&&auctionClosed(l))h+='<button class="primary small accept" data-q="'+x.id+'">Aceptar</button>';else if(x.status==="accepted")h+='<div class="quote-actions"><span class="status">Aceptada</span><button class="secondary small chatBtn" data-load="'+l.id+'">Chat</button></div>';else h+='<span class="muted">'+esc(x.status)+'</span>';h+='</div>'}h+='</div>'}else h+='<p class="muted">Aún no hay ofertas.</p>';if(l.status==="accepted")h+='<div class="completion-box"><strong>Operación confirmada.</strong><p>Precio y condiciones registrados. Coordinen por el chat privado.</p><button class="secondary small chatBtn" data-load="'+l.id+'">💬 Chat</button><button class="secondary small completeBtn" data-load="'+l.id+'">Marcar mi parte completada</button></div>';if(l.status==="delivered")h+='<button class="primary small reviewBtn" data-load="'+l.id+'">⭐ Evaluar experiencia</button>';h+='</article>'}h+='</div><button class="primary submit" id="newLoad">+ Publicar otra carga</button>';openModal(h);$("#newLoad").onclick=loadForm;document.querySelectorAll(".accept").forEach(b=>b.onclick=async()=>{const x=await sb.rpc("accept_quote",{p_quote_id:b.dataset.q});if(x.error)alert(x.error.message);else customerDashboard()});document.querySelectorAll(".chatBtn").forEach(b=>b.onclick=()=>chatBox(b.dataset.load));document.querySelectorAll(".completeBtn").forEach(b=>b.onclick=completeTrip);document.querySelectorAll(".reviewBtn").forEach(b=>b.onclick=reviewForm)}

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
async function carrierLoads(){const u=await user();if(!u)return authForm("carrier");const r=await sb.from("load_requests").select("*").eq("status","open").order("created_at",{ascending:false});if(r.error){alert(r.error.message);return}let h='<span class="eyebrow">PANEL DEL TRANSPORTISTA</span><h2>Cargas abiertas</h2><p class="modal-sub">Una sola oferta por carga. Sin chat hasta ser seleccionado.</p><div class="dashboard">';for(const l of r.data||[]){const my=await sb.from("quotes").select("id,status,amount,note").eq("load_id",l.id).eq("carrier_id",u.id).maybeSingle();h+='<article class="dash-card"><div><b>'+esc(l.cargo_type)+'</b><span class="status">'+esc(l.urgency)+'</span></div><strong>'+esc(l.origin_area)+' → '+esc(l.destination_area)+'</strong><small>'+esc(l.quantity)+' · '+esc(l.requested_date)+' · '+esc(closeText(l))+'</small><p>'+esc(l.notes||"Sin detalles adicionales.")+'</p>';if(my.data)h+='<div class="my-offer"><strong>Tu oferta: '+fmtMoney(my.data.amount)+'</strong><span>'+esc(my.data.note||"Sin condiciones")+'</span>'+(my.data.status==="pending"&&!auctionClosed(l)?'<button class="secondary small withdrawBtn" data-q="'+my.data.id+'">Retirar</button>':'<span class="muted">'+esc(my.data.status==="pending"?"Subasta cerrada":"Oferta "+my.data.status)+'</span>')+'</div>';else if(!auctionClosed(l))h+='<button class="primary small quoteBtn" data-load="'+l.id+'">Hacer mi única oferta</button>';else h+='<span class="muted">Subasta cerrada.</span>';h+='</article>'}h+='</div><button class="secondary submit" id="ops">Mis operaciones</button>';openModal(h);document.querySelectorAll(".quoteBtn").forEach(b=>b.onclick=()=>quoteForm(b.dataset.load));document.querySelectorAll(".withdrawBtn").forEach(b=>b.onclick=async()=>{const x=await sb.from("quotes").update({status:"withdrawn",withdrawn_at:new Date().toISOString()}).eq("id",b.dataset.q).eq("carrier_id",u.id).eq("status","pending");if(x.error)alert(x.error.message);else carrierLoads()});$("#ops").onclick=carrierOperations}

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
async function completeTrip(e){const r=await sb.rpc("movelo_complete_trip",{p_load_id:e.currentTarget.dataset.load});if(r.error)alert(r.error.message);else{alert("Tu parte quedó marcada como completada.");const p=await myProfile();p?.role==="carrier"?carrierOperations():customerDashboard()}}
async function reviewForm(e){const id=e.currentTarget.dataset.load,u=await user(),x=(await sb.from("reviews").select("rating,comment").eq("load_id",id).eq("reviewer_id",u.id).maybeSingle()).data||{};openModal('<span class="eyebrow">EXPERIENCIA</span><h2>¿Cómo fue?</h2><form id="reviewForm"><label>Calificación<select name="rating" required><option value="">Elige</option><option value="5">⭐⭐⭐⭐⭐</option><option value="4">⭐⭐⭐⭐</option><option value="3">⭐⭐⭐</option><option value="2">⭐⭐</option><option value="1">⭐</option></select></label><label>Experiencia<textarea name="comment" rows="4" maxlength="1000"></textarea></label><button class="primary submit">Guardar</button></form>');$("#reviewForm").onsubmit=async ev=>{ev.preventDefault();const d=Object.fromEntries(new FormData(ev.target));if(hasBlockedNumber(d.comment))return rejectConfidentialData();const r=await sb.rpc("movelo_submit_review",{p_load_id:id,p_rating:Number(d.rating),p_comment:d.comment||null});if(r.error)alert(r.error.message);else{alert("Experiencia guardada.");closeModal()}}}
async function messagingCenter(){
 const u=await user(); if(!u){authForm("customer");return}
 const p=await myProfile(); if(!p)return;
 let loads=[];
 if(p.role==="customer"){
   const r=await sb.from("load_requests").select("id,cargo_type,origin_area,destination_area,status").eq("customer_id",u.id).in("status",["accepted","delivered"]).order("created_at",{ascending:false});
   if(r.error){alert(r.error.message);return} loads=r.data||[];
 }else if(p.role==="carrier"){
   const r=await sb.from("quotes").select("load_id,status,load_requests(id,cargo_type,origin_area,destination_area,status)").eq("carrier_id",u.id).eq("status","accepted").order("created_at",{ascending:false});
   if(r.error){alert(r.error.message);return} loads=(r.data||[]).map(x=>x.load_requests).filter(Boolean);
 }else{adminDashboard();return}
 let h='<span class="eyebrow">MENSAJERÍA MOVELO</span><h2>Mis conversaciones</h2><p class="modal-sub">Habla dentro de MOVELO con la otra parte de una operación aceptada. Los teléfonos permanecen protegidos.</p><div class="dashboard">';
 if(!loads.length) h+='<p class="empty">Todavía no tienes conversaciones activas. El chat aparece cuando una cotización es aceptada.</p>';
 for(const l of loads){
   const m=await sb.from("messages").select("body,created_at,sender_id").eq("load_id",l.id).order("created_at",{ascending:false}).limit(1);
   const last=m.data?.[0];
   h+='<article class="dash-card"><div><b>'+esc(l.cargo_type||"Operación")+'</b><span class="status">'+esc(l.status)+'</span></div><strong>'+esc(l.origin_area||"")+' → '+esc(l.destination_area||"")+'</strong><small>'+(last?esc(last.body):"Sin mensajes todavía")+'</small><button class="secondary small chatBtn" data-load="'+l.id+'">💬 Abrir conversación</button></article>';
 }
 h+='</div><button class="secondary submit" id="msgClose">Cerrar</button>';
 openModal(h); $("#msgClose").onclick=closeModal;
 document.querySelectorAll(".chatBtn").forEach(b=>b.onclick=()=>chatBox(b.dataset.load));
}
async function notifications(){const u=await user(),r=await sb.from("notifications").select("*").eq("user_id",u.id).order("created_at",{ascending:false}).limit(30);if(r.error){alert(r.error.message);return}let h='<span class="eyebrow">NOTIFICACIONES</span><h2>Actividad</h2><div class="dashboard">';if(!r.data?.length)h+='<p class="empty">No tienes notificaciones.</p>';for(const n of r.data||[])h+='<article class="dash-card '+(!n.read_at?"unread":"")+'"><b>'+esc(n.title)+'</b><p>'+esc(n.body)+'</p><small>'+fmtDate(n.created_at)+'</small></article>';h+='</div>';openModal(h);await sb.from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",u.id).is("read_at",null)}
async function adminDashboard(){const u=await user();if(!u)return authForm("customer");const p=await myProfile();if(p?.role!=="admin"){alert("Esta pantalla es solo para el administrador.");return}const [a,b,c,d,e,f]=await Promise.all([sb.from("profiles").select("id,full_name,role").order("full_name"),sb.from("load_requests").select("*").order("created_at",{ascending:false}),sb.from("carrier_profiles").select("*"),sb.from("quotes").select("*").order("created_at",{ascending:false}),sb.from("messages").select("id,load_id,sender_id,body,created_at").order("created_at",{ascending:false}),sb.from("reviews").select("*").order("created_at",{ascending:false})]);const er=[a,b,c,d,e,f].find(x=>x.error);if(er){alert(er.error.message);return}const P=a.data||[],L=b.data||[],C=c.data||[],Q=d.data||[],M=e.data||[],R=f.data||[],names=new Map(P.map(x=>[x.id,x.full_name||"Usuario"]));let h='<span class="eyebrow">DUEÑO · ADMINISTRADOR</span><h2>Centro de Control MOVELO</h2><div class="admin-stats"><div><strong>'+P.length+'</strong><span>Usuarios</span></div><div><strong>'+L.length+'</strong><span>Cargas</span></div><div><strong>'+C.length+'</strong><span>Transportistas</span></div><div><strong>'+Q.length+'</strong><span>Ofertas</span></div><div><strong>'+R.length+'</strong><span>Evaluaciones</span></div></div><div class="admin-block"><span class="eyebrow">CARGAS</span><div class="admin-table">'+(L.slice(0,30).map(x=>'<div class="admin-row"><div><b>'+esc(x.cargo_type)+'</b><small>'+esc(names.get(x.customer_id)||"Usuario")+' · '+esc(x.origin_area)+' → '+esc(x.destination_area)+'</small></div><span>'+esc(x.status)+'</span></div>').join("")||"<p class='empty'>No hay cargas.</p>")+'</div></div><div class="admin-block"><span class="eyebrow">OFERTAS</span><div class="admin-table">'+(Q.slice(0,30).map(x=>'<div class="admin-row"><div><b>'+fmtMoney(x.amount)+'</b><small>'+esc(names.get(x.carrier_id)||"Transportista")+'</small></div><span>'+esc(x.status)+'</span></div>').join("")||"<p class='empty'>No hay ofertas.</p>")+'</div></div><div class="admin-block"><span class="eyebrow">CHAT</span><div class="admin-table">'+(M.slice(0,20).map(x=>'<div class="admin-row"><b>'+esc(names.get(x.sender_id)||"Usuario")+'</b><small>'+esc(x.body)+'</small></div>').join("")||"<p class='empty'>No hay mensajes.</p>")+'</div></div><button class="secondary submit" id="adminClose">Cerrar</button>';openModal(h);$("#adminClose").onclick=closeModal}
async function render(){const u=await user(),box=$("#sessionBox");if(!u){box.innerHTML="";$("#loginNav").textContent="Entrar";await renderHeroAvailability();return}const p=await myProfile();box.innerHTML='<span>Sesión: <b>'+esc(u.email)+'</b> · '+esc(p?.role||"usuario")+'</span> <button id="msgBtn" class="secondary small">💬 Mensajes</button> <button id="notifBtn" class="secondary small">🔔</button> <button id="logoutBtn" class="secondary small">Salir</button>';$("#msgBtn").onclick=messagingCenter;$("#notifBtn").onclick=notifications;$("#logoutBtn").onclick=async()=>{await sb.auth.signOut();render();refresh()};$("#loginNav").textContent=p?.role==="admin"?"Centro de Control":"Mi cuenta";await renderHeroAvailability()}
async function start(role){const u=await user();if(!u){authForm(role);return}await profile(role);render();role==="customer"?loadForm():carrierDashboard()}
["#clientBtn","#clientBtn2","#clientBtn3"].forEach(s=>{const el=$(s);if(el)el.onclick=()=>start("customer")});["#carrierBtn","#carrierBtn2","#carrierBtn3"].forEach(s=>{const el=$(s);if(el)el.onclick=()=>start("carrier")});$("#loginNav").onclick=async()=>{const p=await myProfile();if(p?.role==="admin")adminDashboard();else if(p?.role==="customer")customerDashboard();else if(p?.role==="carrier")carrierOperations();else authForm("customer")};$("#refreshBtn").onclick=refresh;$("#menuBtn").onclick=()=>$(".nav").classList.toggle("show");async function connectLive(){const u=await user();if(!u){if(liveChannel){sb.removeChannel(liveChannel);liveChannel=null}return}if(!liveChannel)liveChannel=sb.channel("movelo-market").on("postgres_changes",{event:"*",schema:"public",table:"load_requests"},refresh).subscribe()}connectLive();setInterval(connectLive,5000);setInterval(refresh,15000);sb.auth.onAuthStateChange(()=>setTimeout(render,0));refresh();render();