/* Panel del taller · Fase 1. Vanilla JS sobre la API JSON. */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const nf = new Intl.NumberFormat("es-CO");
  const pesos = (n) => (n == null ? "—" : nf.format(n) + " $");
  let yo = null;

  /* ---------- sesión y fetch ---------- */
  function tk() { try { return localStorage.getItem("k0-token"); } catch { return null; } }
  function guardarTk(t) { try { t ? localStorage.setItem("k0-token", t) : localStorage.removeItem("k0-token"); } catch {} }
  async function api(metodo, ruta, cuerpo) {
    const r = await fetch("/api" + ruta, {
      method: metodo,
      headers: { "content-type": "application/json", ...(tk() ? { authorization: "Bearer " + tk() } : {}) },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const json = await r.json().catch(() => ({}));
    if (r.status === 401) { mostrarLogin(); throw new Error(json.error || "Sesión vencida"); }
    if (!r.ok) throw new Error(json.error || "Error " + r.status);
    return json;
  }
  const GET = (r) => api("GET", r), POST = (r, c) => api("POST", r, c ?? {}), PUT = (r, c) => api("PUT", r, c);

  let toastT;
  function toast(m, esError) {
    const el = $("#toast"); el.textContent = m; el.classList.add("ver");
    el.style.background = esError ? "var(--malo)" : "";
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("ver"), 2600);
  }
  const atrapar = (fn) => (...a) => Promise.resolve(fn(...a)).catch((e) => toast(e.message, true));

  function esc(t) { const d = document.createElement("span"); d.textContent = t ?? ""; return d.innerHTML; }
  const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : "—");
  const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

  /* ---------- login ---------- */
  function mostrarLogin() { yo = null; $("#login").hidden = false; $("#nav").hidden = true; $("#quien").hidden = true; }
  $("#form-login").addEventListener("submit", atrapar(async (e) => {
    e.preventDefault(); $("#l-error").hidden = true;
    try {
      const r = await api("POST", "/sesion", { usuario: $("#l-usuario").value.trim(), clave: $("#l-clave").value });
      guardarTk(r.token); await arrancar();
    } catch (err) { $("#l-error").textContent = err.message; $("#l-error").hidden = false; }
  }));
  $("#salir").addEventListener("click", atrapar(async () => { await api("DELETE", "/sesion").catch(() => {}); guardarTk(null); mostrarLogin(); }));

  async function arrancar() {
    yo = await GET("/yo");
    $("#login").hidden = true; $("#nav").hidden = false; $("#quien").hidden = false;
    $("#quien-nombre").textContent = yo.nombre + " · " + ({ dueno: "dueño", recepcion: "recepción", mecanico: "mecánico" })[yo.rol];
    for (const a of document.querySelectorAll("[data-rol]")) a.hidden = a.dataset.rol !== yo.rol;
    refrescarContador(); enrutar();
  }
  async function refrescarContador() {
    try {
      const pend = await GET("/avisos?estado=pendiente");
      const n = $("#avisos-n"); n.textContent = pend.length; n.hidden = !pend.length;
    } catch {}
  }

  /* ---------- enrutador ---------- */
  const rutas = [];
  function ruta(patron, fn) { rutas.push({ partes: patron.split("/").filter(Boolean), fn }); }
  async function enrutar() {
    if (!yo) return;
    const partes = (location.hash.slice(1) || "/tablero").split("/").filter(Boolean);
    for (const r of rutas) {
      if (r.partes.length !== partes.length) continue;
      const params = {}; let ok = true;
      r.partes.forEach((p, i) => { if (p.startsWith(":")) params[p.slice(1)] = partes[i]; else if (p !== partes[i]) ok = false; });
      if (!ok) continue;
      document.querySelectorAll(".pestanas a").forEach((a) => a.classList.toggle("activa", a.dataset.v === r.partes[0]));
      $("#vista").innerHTML = "<p class='suave'>Cargando…</p>";
      try { await r.fn(params); } catch (e) { $("#vista").innerHTML = `<p class="error">${esc(e.message)}</p>`; }
      return;
    }
    location.hash = "#/tablero";
  }
  window.addEventListener("hashchange", enrutar);

  /* ---------- tablero ---------- */
  const ESTADOS = [["recibida", "Recibidas"], ["cotizada", "Cotizadas"], ["aprobada", "Aprobadas"], ["lista", "Listas para entrega"]];
  ruta("/tablero", async () => {
    const [ordenes, citas] = await Promise.all([GET("/ordenes"), GET("/citas")]);
    const cols = ESTADOS.map(([clave, titulo]) => {
      const lista = ordenes.filter((o) => o.estado === clave);
      return `<div class="columna"><h2>${titulo}<span class="num">${lista.length}</span></h2>
        ${lista.map((o) => `<a class="ficha" href="#/orden/${o.id}"><b>#${o.consecutivo} · ${esc(o.placa)}</b>
          <small>${esc(o.cliente_nombre)} · ${esc([o.marca, o.modelo].filter(Boolean).join(" "))}</small>
          ${o.mecanico_nombre ? `<small>Mecánico: ${esc(o.mecanico_nombre)}</small>` : ""}</a>`).join("") || `<div class="vacio">Sin órdenes</div>`}
      </div>`;
    }).join("");
    const citasHtml = citas.length ? `<div class="tarjeta"><h2>Citas programadas</h2>${citas.map((c) =>
      `<div class="mensaje"><div class="meta"><b>${esc(c.fecha)} ${esc(c.hora)}</b> · ${esc(c.placa)} · ${esc(c.cliente_nombre)} · ${esc(c.motivo || "")}</div>
       ${yo.rol !== "mecanico" ? `<div class="acciones"><button class="btn chico" data-llego="${c.id}" data-veh="${c.vehiculo_id}">Llegó: abrir orden</button></div>` : ""}</div>`).join("")}</div>` : "";
    $("#vista").innerHTML = `
      <div class="encabezado"><h1>Tablero</h1><div class="acciones-d">
        ${yo.rol !== "mecanico" ? `<a class="btn primario" href="#/nueva-orden">Nueva orden</a>` : ""}
      </div></div>
      ${citasHtml}
      <div class="columnas">${cols}</div>`;
    document.querySelectorAll("[data-llego]").forEach((b) => b.addEventListener("click", atrapar(async () => {
      const km = prompt_("Kilometraje de recepción");
      const o = await POST("/ordenes", { vehiculo_id: b.dataset.veh, cita_id: b.dataset.llego, km_recepcion: km });
      location.hash = "#/orden/" + o.id;
    })));
  });
  function prompt_(etiqueta) { const v = window.prompt ? window.prompt(etiqueta) : null; const n = Number(v); return v && Number.isFinite(n) ? Math.round(n) : null; }

  /* ---------- nueva orden ---------- */
  ruta("/nueva-orden", async () => {
    $("#vista").innerHTML = `
      <div class="encabezado"><h1>Nueva orden</h1></div>
      <div class="tarjeta"><h2>Buscar vehículo</h2>
        <div class="fila"><label>Placa o nombre del cliente<input id="b-q" autofocus></label><button class="btn" id="b-ir">Buscar</button></div>
        <div id="b-res" style="margin-top:10px"></div>
      </div>
      <div class="tarjeta"><h2>¿Cliente nuevo?</h2><p class="suave" style="font-size:.9rem;margin-bottom:8px">Créelo en Clientes y vuelva aquí.</p>
        <a class="btn" href="#/clientes">Ir a Clientes</a></div>`;
    const buscar = atrapar(async () => {
      const q = $("#b-q").value.trim(); if (!q) return;
      const clientes = await GET("/clientes?q=" + encodeURIComponent(q));
      const detalles = await Promise.all(clientes.slice(0, 10).map((c) => GET("/clientes/" + c.id)));
      const vehs = detalles.flatMap((d) => d.vehiculos.map((v) => ({ ...v, cliente: d.nombre })));
      const porPlaca = vehs.filter((v) => v.placa.includes(q.toUpperCase()));
      const lista = (porPlaca.length ? porPlaca : vehs);
      $("#b-res").innerHTML = lista.length ? lista.map((v) =>
        `<div class="mensaje"><div class="meta"><b>${esc(v.placa)}</b> · ${esc([v.marca, v.modelo].filter(Boolean).join(" "))} · ${esc(v.cliente)}</div>
         <div class="acciones"><button class="btn chico primario" data-abrir="${v.id}">Abrir orden</button><a class="btn chico" href="#/vehiculo/${v.id}">Ver vehículo</a></div></div>`).join("")
        : `<div class="vacio">Nada con «${esc(q)}». Si es cliente nuevo, créelo primero.</div>`;
      document.querySelectorAll("[data-abrir]").forEach((b) => b.addEventListener("click", atrapar(async () => {
        const km = prompt_("Kilometraje de recepción");
        const o = await POST("/ordenes", { vehiculo_id: b.dataset.abrir, km_recepcion: km });
        toast("Orden #" + o.consecutivo + " abierta"); location.hash = "#/orden/" + o.id;
      })));
    });
    $("#b-ir").addEventListener("click", buscar);
    $("#b-q").addEventListener("keydown", (e) => { if (e.key === "Enter") buscar(); });
  });

  /* ---------- orden ---------- */
  ruta("/orden/:id", async ({ id }) => {
    const o = await GET("/ordenes/" + id);
    const esMec = yo.rol === "mecanico";
    const cerrada = o.estado === "cerrada";
    const catalogo = esMec ? [] : await GET("/catalogo");
    const usuarios = esMec ? [] : await GET("/usuarios");
    const insp = o.inspecciones.map((i) => `
      <li><span class="insignia ${i.estado}">${i.estado}</span>
        <span>${esc(i.item)}${i.nota ? ` — <span class="suave">${esc(i.nota)}</span>` : ""}</span>
        ${i.foto ? `<a href="/${i.foto}" target="_blank" rel="noopener"><img class="foto-mini" src="/${i.foto}" alt="Foto de ${esc(i.item)}"></a>` : "<span></span>"}</li>`).join("");
    const items = o.items.map((i) => `
      <tr><td>${esc(i.descripcion)}</td><td class="der num">${pesos(i.precio)}</td>
        <td>${i.aprobado === 1 ? `<span class="insignia ok">aprobado</span><br><small class="suave">${fechaHora(i.aprobado_en)} · ${esc(i.aprobado_via || "")}</small>`
          : i.aprobado === 0 ? `<span class="insignia malo">rechazado</span>`
          : `<span class="insignia neutra">pendiente</span>`}</td>
        <td>${!cerrada && !esMec && i.aprobado === null ? `<button class="btn chico" data-apr="${i.id}" data-si="1">Aprobó</button> <button class="btn chico peligro" data-apr="${i.id}" data-si="0">Rechazó</button>` : ""}</td></tr>`).join("");
    const m = o.margen;
    $("#vista").innerHTML = `
      <div class="encabezado">
        <h1>Orden #${o.consecutivo}</h1>
        <span class="insignia neutra">${o.estado}</span>
        <span class="suave">${esc(o.vehiculo.placa)} · ${esc([o.vehiculo.marca, o.vehiculo.modelo].filter(Boolean).join(" "))} · <a href="#/vehiculo/${o.vehiculo.id}">${esc(o.cliente.nombre)}</a>${o.km_recepcion ? ` · <span class="num">${nf.format(o.km_recepcion)} km</span>` : ""}</span>
        <div class="acciones-d">${cerrada || esMec ? "" : `
          ${o.estado !== "lista" ? `<button class="btn" id="o-lista">Marcar lista</button>` : ""}
          <button class="btn primario" id="o-cerrar">Cerrar orden</button>`}</div>
      </div>
      ${!o.cliente.autorizacion_en && !esMec ? `<div class="tarjeta" style="border-color:var(--atencion)"><b>Sin autorización de datos (Ley 1581).</b>
        <p class="suave" style="font-size:.9rem">Para enviar cotización o avisos, regístrela en la ficha del cliente.</p>
        <a class="btn chico" href="#/vehiculo/${o.vehiculo.id}">Abrir ficha</a></div>` : ""}
      <div class="tarjeta"><h2>Checklist de ingreso</h2>
        <ul class="lista-insp">${insp || ""}</ul>
        ${!insp ? `<div class="vacio">Sin hallazgos todavía</div>` : ""}
        ${cerrada ? "" : `<div class="sub"><h3>Nuevo hallazgo</h3>
          <div class="fila"><label>Pieza o punto<input id="i-item" placeholder="Pastillas delanteras"></label>
            <label>Estado<select id="i-estado"><option value="bien">Bien</option><option value="atencion">Atención</option><option value="urgente">Urgente</option></select></label>
            <label>Nota<input id="i-nota" placeholder="Al 10 %"></label>
            <label>Foto<input id="i-foto" type="file" accept="image/*" capture="environment"></label>
            <button class="btn primario" id="i-agregar">Registrar</button></div></div>`}
      </div>
      ${esMec ? "" : `
      <div class="tarjeta"><h2>Trabajos y cotización</h2>
        <div class="tabla-envol"><table class="tabla"><thead><tr><th>Trabajo</th><th class="der">Precio</th><th>Aprobación</th><th></th></tr></thead>
        <tbody>${items || `<tr><td colspan="4"><div class="vacio">Sin trabajos</div></td></tr>`}</tbody></table></div>
        ${cerrada ? "" : `<div class="sub"><h3>Agregar trabajo</h3>
          <div class="fila"><label>Del catálogo<select id="t-cat"><option value="">— libre —</option>${catalogo.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join("")}</select></label>
            <label>Descripción<input id="t-desc"></label><label>Precio<input id="t-precio" type="number" inputmode="numeric"></label>
            <button class="btn" id="t-agregar">Agregar</button>
            <button class="btn primario" id="t-cotizar">Enviar cotización</button></div></div>`}
      </div>
      <div class="tarjeta"><h2>Costos y margen</h2>
        <div class="kpis">
          <div class="kpi"><b class="num">${pesos(m.ingreso)}</b><span>ingreso (aprobado o cobrado)</span></div>
          <div class="kpi"><b class="num">${pesos(m.repuestos)}</b><span>repuestos</span></div>
          <div class="kpi"><b class="num">${pesos(m.mano_obra)}</b><span>mano de obra</span></div>
          <div class="kpi"><b class="num">${pesos(m.margen)}</b><span>margen de la orden</span></div>
        </div>
        <div class="tabla-envol"><table class="tabla"><thead><tr><th>Concepto</th><th class="der">Valor</th></tr></thead><tbody>
          ${o.repuestos.map((r) => `<tr><td>${esc(r.descripcion)} × ${r.cantidad}</td><td class="der num">${pesos(Math.round(r.cantidad * r.costo_unitario))}</td></tr>`).join("")}
          ${o.mano_obra.map((r) => `<tr><td>${esc(r.descripcion)} <small class="suave">mano de obra</small></td><td class="der num">${pesos(r.valor)}</td></tr>`).join("")}
        </tbody></table></div>
        ${cerrada ? "" : `<div class="sub"><h3>Registrar costo</h3>
          <div class="fila"><label>Repuesto<input id="c-rdesc" placeholder="Pastillas Bosch"></label>
            <label>Cant.<input id="c-rcant" type="number" value="1" step="0.5"></label>
            <label>Costo unitario<input id="c-rcosto" type="number" inputmode="numeric"></label>
            <button class="btn" id="c-ragregar">Agregar repuesto</button></div>
          <div class="fila" style="margin-top:8px"><label>Mano de obra<input id="c-mdesc" placeholder="Instalación"></label>
            <label>Valor<input id="c-mvalor" type="number" inputmode="numeric"></label>
            <button class="btn" id="c-magregar">Agregar mano de obra</button></div></div>`}
      </div>
      <div class="tarjeta"><h2>Datos de la orden</h2>
        <div class="fila"><label>Mecánico<select id="o-mec"><option value="">—</option>${usuarios.filter((u) => u.rol === "mecanico").map((u) => `<option value="${u.id}" ${o.mecanico && o.mecanico.id === u.id ? "selected" : ""}>${esc(u.nombre)}</option>`).join("")}</select></label>
          <label>Notas<input id="o-notas" value="${esc(o.notas || "")}"></label>
          <button class="btn" id="o-guardar">Guardar</button></div></div>`}`;

    if (!cerrada) $("#i-agregar")?.addEventListener("click", atrapar(async () => {
      const archivo = $("#i-foto").files[0];
      const foto = archivo ? await reducirFoto(archivo) : "";
      await POST(`/ordenes/${id}/inspecciones`, { item: $("#i-item").value, estado: $("#i-estado").value, nota: $("#i-nota").value, foto_base64: foto });
      toast("Hallazgo registrado"); enrutar();
    }));
    if (!esMec && !cerrada) {
      $("#t-agregar")?.addEventListener("click", atrapar(async () => {
        await POST(`/ordenes/${id}/items`, { catalogo_id: $("#t-cat").value, descripcion: $("#t-desc").value, precio: $("#t-precio").value });
        enrutar();
      }));
      $("#t-cotizar")?.addEventListener("click", atrapar(async () => {
        const r = await POST(`/ordenes/${id}/cotizar`);
        toast(`Cotización a la bandeja: ${r.trabajos} trabajos por ${nf.format(r.total)} $`); refrescarContador(); enrutar();
      }));
      document.querySelectorAll("[data-apr]").forEach((b) => b.addEventListener("click", atrapar(async () => {
        await POST(`/ordenes/${id}/items/${b.dataset.apr}/aprobacion`, { aprobado: b.dataset.si === "1", via: "whatsapp" });
        enrutar();
      })));
      $("#c-ragregar")?.addEventListener("click", atrapar(async () => {
        await POST(`/ordenes/${id}/repuestos`, { descripcion: $("#c-rdesc").value, cantidad: $("#c-rcant").value, costo_unitario: $("#c-rcosto").value });
        enrutar();
      }));
      $("#c-magregar")?.addEventListener("click", atrapar(async () => {
        await POST(`/ordenes/${id}/mano-obra`, { descripcion: $("#c-mdesc").value, valor: $("#c-mvalor").value });
        enrutar();
      }));
      $("#o-guardar")?.addEventListener("click", atrapar(async () => {
        await PUT(`/ordenes/${id}`, { mecanico_id: $("#o-mec").value, notas: $("#o-notas").value });
        toast("Guardado");
      }));
      $("#o-lista")?.addEventListener("click", atrapar(async () => { await POST(`/ordenes/${id}/estado`, { estado: "lista" }); enrutar(); }));
      $("#o-cerrar")?.addEventListener("click", atrapar(async () => {
        const total = prompt_("Total cobrado (vacío: suma de lo aprobado)");
        const r = await POST(`/ordenes/${id}/cerrar`, total == null ? {} : { total_cobrado: total });
        toast("Orden cerrada · margen " + nf.format(r.margen.margen) + " $"); refrescarContador(); enrutar();
      }));
    }
  });

  async function reducirFoto(archivo) {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(archivo); });
    const max = 1280, escala = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(img.src);
    return c.toDataURL("image/jpeg", 0.8);
  }

  /* ---------- clientes ---------- */
  ruta("/clientes", async () => {
    const q = "";
    $("#vista").innerHTML = `
      <div class="encabezado"><h1>Clientes</h1></div>
      <div class="tarjeta"><div class="fila"><label>Buscar<input id="cl-q" placeholder="Nombre o celular"></label><button class="btn" id="cl-ir">Buscar</button></div>
        <div class="tabla-envol" style="margin-top:10px"><table class="tabla"><thead><tr><th>Nombre</th><th>Celular</th><th>Autorización de datos</th><th>Vehículos</th></tr></thead><tbody id="cl-lista"></tbody></table></div></div>
      <div class="tarjeta"><h2>Nuevo cliente</h2>
        <div class="fila"><label>Nombre<input id="n-nombre"></label><label>Celular<input id="n-celular" inputmode="tel"></label>
          <label>Autorización (Ley 1581)<select id="n-aut"><option value="">Aún no</option><option value="orden">Firmó en la orden</option><option value="whatsapp">Confirmó por WhatsApp</option><option value="verbal_registrada">Verbal, registrada</option></select></label>
          <button class="btn primario" id="n-crear">Crear</button></div></div>`;
    const cargar = atrapar(async () => {
      const lista = await GET("/clientes" + ($("#cl-q").value.trim() ? "?q=" + encodeURIComponent($("#cl-q").value.trim()) : ""));
      $("#cl-lista").innerHTML = lista.map((c) => `
        <tr><td><a href="#/cliente/${c.id}">${esc(c.nombre)}</a>${c.demo ? ' <span class="insignia neutra">demo</span>' : ""}</td><td class="num">${esc(c.celular || "—")}</td>
          <td>${c.autorizacion_en ? `<span class="insignia ok">sí · ${esc(c.autorizacion_canal)}</span>` : `<span class="insignia malo">pendiente</span>`}</td>
          <td class="num">${c.vehiculos}</td></tr>`).join("") || `<tr><td colspan="4"><div class="vacio">Sin resultados</div></td></tr>`;
    });
    $("#cl-ir").addEventListener("click", cargar);
    $("#cl-q").addEventListener("keydown", (e) => { if (e.key === "Enter") cargar(); });
    $("#n-crear").addEventListener("click", atrapar(async () => {
      const c = await POST("/clientes", { nombre: $("#n-nombre").value, celular: $("#n-celular").value });
      if ($("#n-aut").value) await POST(`/clientes/${c.id}/autorizacion`, { canal: $("#n-aut").value });
      toast("Cliente creado"); location.hash = "#/cliente/" + c.id;
    }));
    cargar();
  });

  ruta("/cliente/:id", async ({ id }) => {
    const c = await GET("/clientes/" + id);
    $("#vista").innerHTML = `
      <div class="encabezado"><h1>${esc(c.nombre)}</h1><span class="suave num">${esc(c.celular || "sin celular")}</span></div>
      <div class="tarjeta"><h2>Autorización de datos (Ley 1581)</h2>
        ${c.autorizacion_en ? `<p><span class="insignia ok">registrada</span> <span class="suave">${fechaHora(c.autorizacion_en)} · ${esc(c.autorizacion_canal)} · ${esc(c.autorizacion_version)}</span></p>`
        : `<div class="fila"><label>Canal<select id="a-canal"><option value="orden">Firmó en la orden</option><option value="whatsapp">Confirmó por WhatsApp</option><option value="verbal_registrada">Verbal, registrada</option></select></label>
           <button class="btn primario" id="a-reg">Registrar autorización</button></div>
           <p class="suave" style="font-size:.85rem;margin-top:8px">Sin esto no se le envían avisos ni cotizaciones.</p>`}
      </div>
      <div class="tarjeta"><h2>Vehículos</h2>
        ${c.vehiculos.map((v) => `<a class="ficha" href="#/vehiculo/${v.id}"><b>${esc(v.placa)}</b><small>${esc([v.marca, v.modelo, v.anio].filter(Boolean).join(" "))}</small></a>`).join("") || `<div class="vacio">Sin vehículos</div>`}
        <div class="sub"><h3>Nuevo vehículo</h3>
          <div class="fila"><label>Placa<input id="v-placa" style="text-transform:uppercase"></label><label>Marca<input id="v-marca"></label><label>Modelo<input id="v-modelo"></label>
            <label>Año<input id="v-anio" type="number"></label><label>Km actual<input id="v-km" type="number" inputmode="numeric"></label>
            <label>SOAT vence<input id="v-soat" type="date"></label><label>Tecnomecánica vence<input id="v-tecno" type="date"></label>
            <button class="btn primario" id="v-crear">Crear</button></div></div>
      </div>`;
    $("#a-reg")?.addEventListener("click", atrapar(async () => { await POST(`/clientes/${id}/autorizacion`, { canal: $("#a-canal").value }); toast("Autorización registrada"); enrutar(); }));
    $("#v-crear")?.addEventListener("click", atrapar(async () => {
      const v = await POST("/vehiculos", { cliente_id: id, placa: $("#v-placa").value, marca: $("#v-marca").value, modelo: $("#v-modelo").value, anio: $("#v-anio").value, km: $("#v-km").value, soat_vence: $("#v-soat").value, tecno_vence: $("#v-tecno").value });
      toast("Vehículo " + v.placa + " creado"); location.hash = "#/vehiculo/" + v.id;
    }));
  });

  /* ---------- vehículo ---------- */
  ruta("/vehiculo/:id", async ({ id }) => {
    const v = await GET("/vehiculos/" + id);
    $("#vista").innerHTML = `
      <div class="encabezado"><h1>${esc(v.placa)}</h1>
        <span class="suave">${esc([v.marca, v.modelo, v.anio].filter(Boolean).join(" "))} · <a href="#/cliente/${v.cliente.id}">${esc(v.cliente.nombre)}</a></span>
        <div class="acciones-d">${yo.rol !== "mecanico" ? `<button class="btn primario" id="ve-orden">Abrir orden</button>` : ""}</div></div>
      ${!v.cliente.autorizacion_en ? `<div class="tarjeta" style="border-color:var(--atencion)"><b>Cliente sin autorización de datos.</b> <a class="btn chico" href="#/cliente/${v.cliente.id}">Registrarla</a></div>` : ""}
      <div class="tarjeta"><h2>Documentos</h2>
        <div class="fila"><label>SOAT vence<input id="d-soat" type="date" value="${esc(v.soat_vence || "")}"></label>
          <label>Tecnomecánica vence<input id="d-tecno" type="date" value="${esc(v.tecno_vence || "")}"></label>
          ${yo.rol !== "mecanico" ? `<button class="btn" id="d-guardar">Guardar</button>` : ""}</div></div>
      <div class="tarjeta"><h2>Kilometraje</h2>
        <div class="fila"><label>Nueva lectura<input id="k-km" type="number" inputmode="numeric" placeholder="${v.lecturas[0] ? v.lecturas[0].km : ""}"></label>
          <label>Fuente<select id="k-f"><option value="recepcion">Recepción</option><option value="cliente">Reportó el cliente</option></select></label>
          ${yo.rol !== "mecanico" ? `<button class="btn" id="k-guardar">Registrar</button>` : ""}</div>
        <div class="tabla-envol" style="margin-top:10px"><table class="tabla"><thead><tr><th>Km</th><th>Fuente</th><th>Fecha</th></tr></thead>
        <tbody>${v.lecturas.map((l) => `<tr><td class="num">${nf.format(l.km)}</td><td>${esc(l.fuente)}</td><td>${fechaHora(l.leida_en)}</td></tr>`).join("") || ""}</tbody></table></div></div>
      <div class="tarjeta"><h2>Historial</h2>
        ${v.historial.map((h) => `<a class="ficha" href="#/orden/${h.id}"><b>#${h.consecutivo} · ${esc(h.estado)}</b>
          <small>${fecha(h.creada_en)}${h.km_recepcion ? ` · <span class="num">${nf.format(h.km_recepcion)} km</span>` : ""}${h.total_cobrado ? ` · <span class="num">${pesos(h.total_cobrado)}</span>` : ""}</small>
          ${h.trabajos ? `<small>${esc(h.trabajos)}</small>` : ""}</a>`).join("") || `<div class="vacio">Primera visita</div>`}</div>
      <div class="tarjeta"><h2>Avisos recientes</h2>
        ${v.avisos.map((a) => `<div class="mensaje"><div class="meta"><span class="insignia neutra">${esc(a.tipo)}</span><span class="insignia ${a.estado === "respondido" ? "ok" : a.estado === "pendiente" ? "atencion" : "neutra"}">${esc(a.estado)}</span><span>${fechaHora(a.programado_para)}</span></div><p>${esc(a.mensaje)}</p></div>`).join("") || `<div class="vacio">Sin avisos</div>`}</div>
      ${yo.rol !== "mecanico" ? `<div class="tarjeta"><h2>Nueva cita</h2>
        <div class="fila"><label>Fecha<input id="ci-fecha" type="date"></label><label>Hora<input id="ci-hora" type="time"></label>
          <label>Motivo<input id="ci-motivo"></label><button class="btn" id="ci-crear">Agendar</button></div></div>` : ""}`;
    $("#ve-orden")?.addEventListener("click", atrapar(async () => {
      const km = prompt_("Kilometraje de recepción");
      const o = await POST("/ordenes", { vehiculo_id: id, km_recepcion: km });
      location.hash = "#/orden/" + o.id;
    }));
    $("#d-guardar")?.addEventListener("click", atrapar(async () => { await PUT(`/vehiculos/${id}/documentos`, { soat_vence: $("#d-soat").value, tecno_vence: $("#d-tecno").value }); toast("Documentos guardados"); }));
    $("#k-guardar")?.addEventListener("click", atrapar(async () => { await POST(`/vehiculos/${id}/lecturas`, { km: $("#k-km").value, fuente: $("#k-f").value }); toast("Lectura registrada"); enrutar(); }));
    $("#ci-crear")?.addEventListener("click", atrapar(async () => {
      await POST("/citas", { vehiculo_id: id, fecha: $("#ci-fecha").value, hora: $("#ci-hora").value, motivo: $("#ci-motivo").value });
      toast("Cita agendada"); enrutar();
    }));
  });

  /* ---------- bandeja de avisos ---------- */
  ruta("/avisos", async () => {
    const [porEnviar, programados, enviados] = await Promise.all([
      GET("/avisos?estado=pendiente"), GET("/avisos?estado=pendiente&todos=1"), GET("/avisos?estado=enviado")]);
    const futuros = programados.filter((a) => !porEnviar.some((b) => b.id === a.id));
    const bloque = (a, acciones) => `
      <div class="mensaje"><div class="meta">
        <span class="insignia neutra">${esc(a.tipo)}</span><b>${esc(a.placa)}</b><span>${esc(a.cliente_nombre)}</span>
        <span class="num">${esc(a.celular || "sin celular")}</span><span>${fechaHora(a.programado_para)}</span>
        ${a.fuera_de_ventana ? `<span class="insignia atencion">fuera de ventana</span>` : ""}</div>
        <p>${esc(a.mensaje)}</p><div class="acciones">${acciones}</div></div>`;
    $("#vista").innerHTML = `
      <div class="encabezado"><h1>Avisos</h1><div class="acciones-d">
        <button class="btn" id="av-motor">Evaluar condiciones ahora</button></div></div>
      <p class="suave" style="margin-bottom:12px;max-width:70ch">Mientras el número del taller migra a la API de WhatsApp Business, los avisos se envían desde aquí: copie o abra en WhatsApp, envíe, y marque cada paso. Esos pasos alimentan la medición del piloto.</p>
      <div class="tarjeta"><h2>Para enviar ahora (${porEnviar.length})</h2>
        ${porEnviar.map((a) => bloque(a, `
          ${a.celular ? `<a class="btn chico primario" target="_blank" rel="noopener" href="https://wa.me/57${esc((a.celular || "").replace(/\D/g, ""))}?text=${encodeURIComponent(a.mensaje)}">Abrir en WhatsApp</a>` : ""}
          <button class="btn chico" data-copiar="${a.id}">Copiar</button>
          <button class="btn chico" data-estado="${a.id}" data-a="enviado">Marcar enviado</button>
          <button class="btn chico peligro" data-estado="${a.id}" data-a="cancelado">Cancelar</button>`)).join("") || `<div class="vacio">Nada pendiente de enviar</div>`}</div>
      <div class="tarjeta"><h2>Enviados: marcar respuesta (${enviados.length})</h2>
        ${enviados.map((a) => bloque(a, `
          <button class="btn chico" data-estado="${a.id}" data-a="entregado">Entregado</button>
          <button class="btn chico primario" data-estado="${a.id}" data-a="respondido">Respondió</button>`)).join("") || `<div class="vacio">Sin enviados esperando respuesta</div>`}</div>
      <div class="tarjeta"><h2>Programados (${futuros.length})</h2>
        ${futuros.map((a) => bloque(a, `<button class="btn chico peligro" data-estado="${a.id}" data-a="cancelado">Cancelar</button>`)).join("") || `<div class="vacio">Nada programado a futuro</div>`}</div>`;
    const mensajes = Object.fromEntries([...porEnviar, ...futuros, ...enviados].map((a) => [a.id, a.mensaje]));
    document.querySelectorAll("[data-copiar]").forEach((b) => b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(mensajes[b.dataset.copiar]); toast("Mensaje copiado"); }
      catch { toast("No se pudo copiar; selecciónelo manualmente", true); }
    }));
    document.querySelectorAll("[data-estado]").forEach((b) => b.addEventListener("click", atrapar(async () => {
      await POST(`/avisos/${b.dataset.estado}/estado`, { estado: b.dataset.a });
      refrescarContador(); enrutar();
    })));
    $("#av-motor").addEventListener("click", atrapar(async () => {
      const r = await POST("/motor/evaluar");
      toast(r.creados ? r.creados + " avisos nuevos" : "Sin condiciones nuevas por ahora");
      refrescarContador(); enrutar();
    }));
  });

  /* ---------- control (dueño) ---------- */
  ruta("/control", async () => {
    const [embudo, renta, condiciones, catalogo, config] = await Promise.all([
      GET("/kpis/embudo"), GET("/kpis/rentabilidad"), GET("/condiciones"), GET("/catalogo"), GET("/config")]);
    const pasos = Object.fromEntries(embudo.pasos.map((p) => [p.tipo, p.n]));
    const NOMBRES = { km: "Kilometraje cerca del intervalo", docs: "Documento por vencer", pico: "Pico y placa de mañana", lectura: "Sin lectura de kilometraje", cierre: "Orden cerrada", reactivar: "Cliente que no vuelve" };
    $("#vista").innerHTML = `
      <div class="encabezado"><h1>Centro de control</h1></div>
      <div class="tarjeta"><h2>Embudo de avisos (lo que mide el piloto)</h2>
        <div class="kpis">
          <div class="kpi"><b class="num">${embudo.avisos.creados ?? 0}</b><span>avisos creados</span></div>
          <div class="kpi"><b class="num">${pasos.aviso_enviado ?? 0}</b><span>enviados</span></div>
          <div class="kpi"><b class="num">${pasos.aviso_respondido ?? 0}</b><span>respondidos</span></div>
          <div class="kpi"><b class="num">${pasos.cita_creada ?? 0}</b><span>citas creadas</span></div>
          <div class="kpi"><b class="num">${pasos.cita_asistida ?? 0}</b><span>citas asistidas</span></div>
          <div class="kpi"><b class="num">${pasos.orden_cerrada ?? 0}</b><span>órdenes cerradas</span></div>
        </div></div>
      <div class="tarjeta"><h2>Rentabilidad</h2>
        <div class="kpis">
          <div class="kpi"><b class="num">${pesos(renta.total.ingreso)}</b><span>ingreso (órdenes cerradas)</span></div>
          <div class="kpi"><b class="num">${pesos(renta.total.repuestos)}</b><span>repuestos</span></div>
          <div class="kpi"><b class="num">${pesos(renta.total.mano_obra)}</b><span>mano de obra</span></div>
          <div class="kpi"><b class="num">${pesos(renta.total.margen)}</b><span>margen</span></div>
        </div>
        ${renta.total.sin_costos ? `<p class="suave" style="font-size:.85rem;margin-bottom:8px">${renta.total.sin_costos} de ${renta.total.ordenes} órdenes cerradas no tienen costos registrados: su margen aparece igual al ingreso.</p>` : ""}
        <div class="tabla-envol"><table class="tabla"><thead><tr><th>Cliente</th><th class="der">Órdenes</th><th class="der">Ingreso</th><th class="der">Costos</th><th class="der">Margen</th></tr></thead>
        <tbody>${renta.ranking_clientes.map((c) => `<tr><td>${esc(c.cliente)}</td><td class="der num">${c.ordenes}</td><td class="der num">${pesos(c.ingreso)}</td><td class="der num">${pesos(Math.round(c.costos))}</td><td class="der num">${pesos(Math.round(c.margen))}</td></tr>`).join("") || `<tr><td colspan="5"><div class="vacio">Aún sin órdenes cerradas</div></td></tr>`}</tbody></table></div></div>
      <div class="tarjeta"><h2>Condiciones</h2>
        ${condiciones.map((c) => `
          <div class="mensaje"><div class="meta"><label style="display:flex;gap:8px;align-items:center;font-size:.95rem;color:var(--tinta)">
            <input type="checkbox" data-regla="${c.clave}" ${c.activa ? "checked" : ""} style="width:18px;height:18px"> <b>${NOMBRES[c.clave] || c.clave}</b></label>
            <span class="suave">${esc(JSON.stringify(c.params))}</span></div></div>`).join("")}
        <p class="suave" style="font-size:.85rem">Los parámetros finos se ajustan con la revisión de la quincena; aquí se prende y se apaga cada regla.</p></div>
      <div class="tarjeta"><h2>Catálogo</h2>
        <div class="tabla-envol"><table class="tabla"><thead><tr><th>Servicio</th><th class="der">Cada km</th><th class="der">Cada meses</th><th class="der">Precio ref.</th></tr></thead>
        <tbody>${catalogo.map((c) => `<tr><td>${esc(c.nombre)}</td>
          <td class="der"><input class="num" style="width:90px;text-align:right" data-cat="${c.id}" data-campo="intervalo_km" value="${c.intervalo_km ?? ""}"></td>
          <td class="der"><input class="num" style="width:70px;text-align:right" data-cat="${c.id}" data-campo="intervalo_meses" value="${c.intervalo_meses ?? ""}"></td>
          <td class="der"><input class="num" style="width:110px;text-align:right" data-cat="${c.id}" data-campo="precio_ref" value="${c.precio_ref ?? ""}"></td></tr>`).join("")}</tbody></table></div>
        <div class="fila" style="margin-top:10px"><label>Nuevo servicio<input id="cat-nombre"></label><button class="btn" id="cat-crear">Agregar</button></div></div>
      <div class="tarjeta"><h2>Mensajes</h2>
        <div class="fila"><label>Firma<input id="cf-firma" value="${esc(config.firma)}"></label>
          <label>Tono<select id="cf-tono"><option value="usted" ${config.tono === "usted" ? "selected" : ""}>De usted</option><option value="tu" ${config.tono === "tu" ? "selected" : ""}>De tú</option></select></label>
          <label>Ventana desde<input id="cf-desde" type="time" value="${esc(config.ventana_desde)}"></label>
          <label>Hasta<input id="cf-hasta" type="time" value="${esc(config.ventana_hasta)}"></label>
          <button class="btn primario" id="cf-guardar">Guardar</button></div></div>`;
    document.querySelectorAll("[data-regla]").forEach((c) => c.addEventListener("change", atrapar(async () => {
      await PUT(`/condiciones/${c.dataset.regla}`, { activa: c.checked }); toast(c.checked ? "Regla activada" : "Regla apagada");
    })));
    const catalogoPorId = Object.fromEntries(catalogo.map((c) => [c.id, c]));
    document.querySelectorAll("[data-cat]").forEach((inp) => inp.addEventListener("change", atrapar(async () => {
      const c = catalogoPorId[inp.dataset.cat];
      c[inp.dataset.campo] = inp.value === "" ? null : Number(inp.value);
      await PUT(`/catalogo/${c.id}`, c); toast("Catálogo guardado");
    })));
    $("#cat-crear").addEventListener("click", atrapar(async () => { await POST("/catalogo", { nombre: $("#cat-nombre").value }); enrutar(); }));
    $("#cf-guardar").addEventListener("click", atrapar(async () => {
      await PUT("/config", { firma: $("#cf-firma").value, tono: $("#cf-tono").value, ventana_desde: $("#cf-desde").value, ventana_hasta: $("#cf-hasta").value });
      toast("Configuración guardada");
    }));
  });

  /* ---------- arranque ---------- */
  (async () => {
    if (!tk()) return mostrarLogin();
    try { await arrancar(); } catch { mostrarLogin(); }
  })();
})();
