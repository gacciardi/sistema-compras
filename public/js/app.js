let usuarioActual = null;
let masterPasswordActual = '4567';
let fechaImplementacionActual = '';

let listaSectoresGlobal = [
    'Compras',
    'Almacén / Depósito',
    'Calidad',
    'Expedición',
    'Administración'
];

let tablaCondicionPagoPuntos = {
    'Prepago': 10,
    'Contado': 35,
    'Cuenta corriente': 70,
    'Plazos': 95
};

let opcionesCondicionPago = Object.keys(tablaCondicionPagoPuntos);

let permisosPorSector = {
    'Compras': [1, 2, 3, 4, 5, 7],
    'Almacén / Depósito': [1, 5, 7],
    'Calidad': [1, 3, 5, 7],
    'Expedición': [1, 5, 7],
    'Administración': [1, 2, 3, 4, 5, 6, 7]
};

let permisosProveedoresPorUsuario = {};

let requisitos = [];
let proveedores = [];
let estadisticas = [];
let ordenesCompra = [];
let recepciones = [];
let usuarios = [];
let saldosExcedentes = [];

let nombresCriteriosProveedores = [
    "Cumplimiento de Entrega",
    "Calidad Insumos/Servicios",
    "Condicion de Pago",
    "Plazo de Entrega",
    "Atencion",
    "Respuesta a Reclamos"
];

let nombresCriteriosEstadisticas = [
    "Cumplimiento de Entrega (Auto)",
    "Calidad Insumos/Servicios",
    "Condicion de Pago (OC)",
    "Plazo de Entrega (OC)",
    "Atencion",
    "Respuesta a Reclamos"
];

document.addEventListener('DOMContentLoaded', async () => {
    await cargarTodoDesdeServidor();

    const formUsuarios = document.getElementById('form-usuarios');
    if (formUsuarios) {
        formUsuarios.addEventListener('submit', guardarUsuario);
    }
});

function poblarSelectAnios() {
    const select = document.getElementById('select-anio-estadistica');
    if (!select) return;
    
    const valActual = select.value;
    const anioActual = new Date().getFullYear();
    const anioInicio = 2024;
    
    select.innerHTML = '';
    
    for (let anio = anioActual + 1; anio >= anioInicio; anio--) {
        const opt = document.createElement('option');
        opt.value = String(anio);
        opt.innerText = String(anio);
        select.appendChild(opt);
    }

    if (valActual) {
        select.value = valActual;
    } else {
        select.value = String(anioActual);
    }

    select.onchange = cargarCalificacionExistente;
}

async function iniciarSesionUsuario(e) {
    if (e) e.preventDefault();

    const usrInput = document.getElementById('login-user');
    const passInput = document.getElementById('login-pass');
    if (!usrInput || !passInput) return;

    const usrName = usrInput.value.trim();
    const pass = passInput.value.trim();

    if (!usrName || !pass) {
        alert("Por favor ingrese usuario y contraseña.");
        return;
    }

    if (usrName.toLowerCase() === 'admin' && pass === masterPasswordActual) {
        usuarioActual = { nombre: 'admin', sector: 'Administración', estado: 'Activo' };
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        document.getElementById('user-session-info').innerText = `👤 admin (Administración)`;
        aplicarPermisosUsuario('Administración');
        return;
    }

    if (!usuarios || usuarios.length === 0) {
        await cargarTodoDesdeServidor(false);
    }

    const usrObj = usuarios.find(u => 
        u.nombre.toLowerCase() === usrName.toLowerCase() && 
        String(u.pass).trim() === pass
    );

    if (!usrObj) {
        alert("Usuario o contraseña incorrectos.");
        return;
    }

    if (usrObj.estado !== 'Activo') {
        alert("Su usuario está Inactivo. Consulte con el Administrador.");
        return;
    }

    usuarioActual = usrObj;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    document.getElementById('user-session-info').innerText = `👤 ${usrObj.nombre} (${usrObj.sector})`;

    aplicarPermisosUsuario(usrObj.sector);
}

function cerrarSesionUsuario() {
    usuarioActual = null;
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    const formLogin = document.getElementById('form-login');
    if (formLogin) formLogin.reset();
}

function aplicarPermisosUsuario(sectorUsuario) {
    if (!sectorUsuario) return;
    const normalizar = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const sectorBuscadoNorm = normalizar(sectorUsuario);
    let pestañasPermitidas = null;

    for (const secKey of Object.keys(permisosPorSector)) {
        const secKeyNorm = normalizar(secKey);
        if (secKeyNorm === sectorBuscadoNorm || secKeyNorm.includes(sectorBuscadoNorm) || sectorBuscadoNorm.includes(secKeyNorm)) {
            pestañasPermitidas = permisosPorSector[secKey];
            break;
        }
    }

    if (!pestañasPermitidas) pestañasPermitidas = [1];

    const mapaPestañas = {
        1: { id: 'tab-requisitos', btn: 'btn-tab-requisitos' },
        2: { id: 'tab-proveedores', btn: 'btn-tab-proveedores' },
        3: { id: 'tab-estadisticas', btn: 'btn-tab-estadisticas' },
        4: { id: 'tab-compras', btn: 'btn-tab-compras' },
        5: { id: 'tab-recepcion', btn: 'btn-tab-recepcion' },
        6: { id: 'tab-usuarios', btn: 'btn-tab-usuarios' },
        7: { id: 'tab-historial-proveedores', btn: 'btn-tab-historial-proveedores' }
    };

    let primeraDisponible = null;
    for (let num = 1; num <= 7; num++) {
        const p = mapaPestañas[num];
        const btnEl = document.getElementById(p.btn);
        if (pestañasPermitidas.includes(num)) {
            if (btnEl) btnEl.style.display = 'inline-block';
            if (!primeraDisponible) primeraDisponible = p.id;
        } else {
            if (btnEl) btnEl.style.display = 'none';
        }
    }

    if (primeraDisponible) showTab(primeraDisponible);
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const activeSection = document.getElementById(tabId);
    if (activeSection) activeSection.classList.add('active');

    const activeButton = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
        btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId)
    );
    if (activeButton) activeButton.classList.add('active');

    if (tabId === 'tab-proveedores') {
        cargarNombresCriteriosProveedores();
        renderizarListaReglasPagoUI();
    }
    if (tabId === 'tab-estadisticas') {
        actualizarSelectProveedoresEstadisticas();
        renderizarGraficosPestaña3();
    }
    if (tabId === 'tab-compras') actualizarSelectsCompras();
    if (tabId === 'tab-recepcion') actualizarSelectOrdenesPendientes();
    if (tabId === 'tab-usuarios') actualizarSelectSectoresUsuarios();
    if (tabId === 'tab-historial-proveedores') prepararHistorialProveedores();
}

async function guardarNumeroFormularioDirecto(claveConfig, idInput) {
    const el = document.getElementById(idInput);
    if (!el) return;
    const valor = el.value.trim();
    if (!valor) return alert("Ingrese un N° de Formulario.");

    try {
        await fetch('/api/configuraciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clave: claveConfig, valor: valor })
        });
        alert(`✅ N° de Formulario "${valor}" guardado.`);
    } catch (e) {
        console.error(e);
    }
}

async function cargarTodoDesdeServidor(renderCompleto = true) {
    try {
        const [resReq, resProv, resStat, resComp, resRec, resUsr, resConfig, resExcedentes] = await Promise.all([
            fetch('/api/requisitos'),
            fetch('/api/proveedores'),
            fetch('/api/estadisticas'),
            fetch('/api/compras'),
            fetch('/api/recepciones'),
            fetch('/api/usuarios'),
            fetch('/api/configuraciones'),
            fetch('/api/excedentes')
        ]);

        requisitos = await resReq.json();
        proveedores = await resProv.json();
        estadisticas = await resStat.json();
        ordenesCompra = await resComp.json();
        recepciones = await resRec.json();
        usuarios = await resUsr.json();
        const datosExcedentes = await resExcedentes.json();
        saldosExcedentes = Array.isArray(datosExcedentes) ? datosExcedentes : [];

        const config = await resConfig.json();
        const activeEl = document.activeElement;

        if (config.num_form_req && activeEl !== document.getElementById('num-formulario-req')) document.getElementById('num-formulario-req').value = config.num_form_req;
        if (config.num_form_prov && activeEl !== document.getElementById('num-formulario-prov')) document.getElementById('num-formulario-prov').value = config.num_form_prov;
        if (config.num_form_stat && activeEl !== document.getElementById('num-formulario')) document.getElementById('num-formulario').value = config.num_form_stat;
        if (config.num_form_comp && activeEl !== document.getElementById('num-formulario-comp')) document.getElementById('num-formulario-comp').value = config.num_form_comp;
        if (config.num_form_rec && activeEl !== document.getElementById('num-formulario-rec')) document.getElementById('num-formulario-rec').value = config.num_form_rec;

        if (config.master_password) masterPasswordActual = config.master_password;
        if (config.lista_sectores && Array.isArray(config.lista_sectores)) listaSectoresGlobal = config.lista_sectores;
        if (config.tabla_condicion_pago_puntos) {
            tablaCondicionPagoPuntos = config.tabla_condicion_pago_puntos;
            opcionesCondicionPago = Object.keys(tablaCondicionPagoPuntos);
        }
        if (config.permisos_proveedores_usuarios) permisosProveedoresPorUsuario = config.permisos_proveedores_usuarios;
        if (config.crit_prov_labels && Array.isArray(config.crit_prov_labels)) nombresCriteriosProveedores = config.crit_prov_labels;
        if (config.crit_stat_labels && Array.isArray(config.crit_stat_labels)) nombresCriteriosEstadisticas = config.crit_stat_labels;
        if (config.permisos_sectores) permisosPorSector = config.permisos_sectores;

        Object.keys(permisosPorSector).forEach(sector => {
            if (Array.isArray(permisosPorSector[sector]) && !permisosPorSector[sector].includes(7)) {
                permisosPorSector[sector].push(7);
            }
        });

        if (config.sys_title) {
            const hTitle = document.getElementById('header-system-title');
            if (hTitle) hTitle.innerText = config.sys_title;
            const lTitle = document.getElementById('login-title');
            if (lTitle) lTitle.innerText = config.sys_title;
            const pTitle = document.getElementById('page-title');
            if (pTitle) pTitle.innerText = config.sys_title;
            const el4 = document.getElementById('master-system-title');
            if (el4) el4.value = config.sys_title;
        }

        aplicarFechaImplementacion(config.fecha_implementacion_sistema || '');

        if (config.sys_bg_color) cambiarColorBg(config.sys_bg_color, false);
        if (config.sys_logo && config.sys_logo.startsWith('data:image')) {
            cambiarLogo(config.sys_logo, false);
        }

        poblarSelectAnios();

        if (renderCompleto) {
            actualizarSelectSectoresUsuarios();
            cargarNombresCriteriosProveedores();
            cargarNombresCriteriosEstadisticas();
            renderizarListaReglasPagoUI();

            renderizarTablaRequisitos();
            renderizarTablaProveedores();
            renderizarTablaEstadisticas();
            renderizarTablaCompras();
            renderizarTablaRecepciones();
            renderizarTablaUsuarios();
            prepararHistorialProveedores();
            
            renderizarGraficosPestaña3();
        }
    } catch (e) {
        console.error("Error al cargar datos:", e);
    }
}

function actualizarSelectSectoresUsuarios() {
    const selects = [document.getElementById('usr-sector'), document.getElementById('master-usr-sector')];
    const sectoresOrdenados = [...listaSectoresGlobal].sort((a, b) => a.localeCompare(b));

    selects.forEach(select => {
        if (!select) return;
        const valActual = select.value;
        select.innerHTML = '<option value="">-- Seleccione Sector --</option>';
        sectoresOrdenados.forEach(sec => {
            const opt = document.createElement('option');
            opt.value = sec;
            opt.innerText = sec;
            select.appendChild(opt);
        });
        if (valActual && listaSectoresGlobal.includes(valActual)) select.value = valActual;
    });
}

// --- REQUISITOS ---
async function guardarRequisito(e) {
    if (e) e.preventDefault();
    const numFormulario = document.getElementById('num-formulario-req').value.trim();
    const num = document.getElementById('num-requisito').value.trim();
    const nombre = document.getElementById('nombre-requisito').value.trim();
    const fecha = document.getElementById('fecha-requisito').value || new Date().toISOString().split('T')[0];
    const detalle = document.getElementById('detalle-requisito').value.trim();

    await fetch('/api/requisitos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numFormulario, num, nombre, fecha, detalle })
    });

    document.getElementById('form-requisito').reset();
    await cargarTodoDesdeServidor(true);
}

function renderizarTablaRequisitos() {
    const tbody = document.getElementById('tabla-requisitos-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    requisitos.forEach((req) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${req.numFormulario || ''}</strong></td>
            <td><strong>${req.num}</strong></td>
            <td>${req.nombre}</td>
            <td>${req.fecha ? req.fecha.split('T')[0] : ''}</td>
            <td>${req.detalle || ''}</td>
            <td>
                <button class="btn-warning" onclick="editarRequisito('${req.num}')">Editar</button>
                <button class="btn-danger" onclick="eliminarRequisito('${req.num}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarRequisito(num) {
    const req = requisitos.find(r => r.num === num);
    if (!req) return;
    document.getElementById('num-formulario-req').value = req.numFormulario || '';
    document.getElementById('num-requisito').value = req.num;
    document.getElementById('nombre-requisito').value = req.nombre;
    if (req.fecha) document.getElementById('fecha-requisito').value = req.fecha.split('T')[0];
    document.getElementById('detalle-requisito').value = req.detalle || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarRequisito(num) {
    if (!confirm(`¿Eliminar requisito "${num}"?`)) return;
    await fetch(`/api/requisitos/${num}`, { method: 'DELETE' });
    await cargarTodoDesdeServidor(true);
}

// --- PESTAÑA 2: PROVEEDORES ---
async function guardarNombresCriteriosProveedores() {
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`crit-nombre-${i}`);
        if (el && el.value.trim()) nombresCriteriosProveedores[i - 1] = el.value.trim();
    }
    await fetch('/api/configuraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: 'crit_prov_labels', valor: nombresCriteriosProveedores })
    });
}

function cargarNombresCriteriosProveedores() {
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`crit-nombre-${i}`);
        if (el) {
            el.value = nombresCriteriosProveedores[i - 1] || `Criterio ${i}`;
            el.readOnly = false;
        }
    }
}

async function guardarProveedor(e) {
    if (e) e.preventDefault();

    const numFormulario = document.getElementById('num-formulario-prov').value.trim();
    const num = document.getElementById('num-proveedor').value.trim();
    const nombre = document.getElementById('nombre-proveedor').value.trim();
    const fechaAltaInput = document.getElementById('fecha-alta-proveedor');
    const fechaAlta = (fechaAltaInput && fechaAltaInput.value) ? fechaAltaInput.value : new Date().toISOString().split('T')[0];

    if (!numFormulario || !num || !nombre) {
        alert("⚠️ Por favor complete los campos obligatorios: N° de Formulario, N° de Proveedor / CUIT y Razón Social.");
        return;
    }

    await guardarNombresCriteriosProveedores();

    const criterios = [];
    for (let i = 1; i <= 6; i++) {
        let puntos = parseFloat(document.getElementById(`crit-cant-${i}`)?.value);
        if (isNaN(puntos)) puntos = 0;

        criterios.push({
            nombre: document.getElementById(`crit-nombre-${i}`)?.value.trim() || `Criterio ${i}`,
            cantidad: puntos
        });
    }

    await fetch('/api/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numFormulario, num, nombre, fechaAlta, criterios })
    });

    document.getElementById('form-proveedor').reset();
    cargarNombresCriteriosProveedores();
    await cargarTodoDesdeServidor(true);
}

function renderizarTablaProveedores() {
    const tbody = document.getElementById('tabla-proveedores-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    proveedores.forEach((p) => {
        const tr = document.createElement('tr');
        const fAlta = p.fechaAlta ? p.fechaAlta.split('T')[0] : '-';
        tr.innerHTML = `
            <td><strong>${p.numFormulario || ''}</strong></td>
            <td><strong>${p.num}</strong></td>
            <td>${p.nombre}</td>
            <td>${fAlta}</td>
            <td>
                <button class="btn-warning" onclick="editarProveedor('${p.num}')">Editar</button>
                <button class="btn-danger" onclick="eliminarProveedor('${p.num}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarProveedor(num) {
    const p = proveedores.find(prov => prov.num === num);
    if (!p) return;
    document.getElementById('num-formulario-prov').value = p.numFormulario || '';
    document.getElementById('num-proveedor').value = p.num;
    document.getElementById('nombre-proveedor').value = p.nombre;
    const fAltaEl = document.getElementById('fecha-alta-proveedor');
    if (fAltaEl && p.fechaAlta) fAltaEl.value = p.fechaAlta.split('T')[0];

    if (p.criterios && Array.isArray(p.criterios)) {
        p.criterios.forEach((crit, index) => {
            const i = index + 1;
            const lbl = document.getElementById(`crit-nombre-${i}`);
            const val = document.getElementById(`crit-cant-${i}`);
            if (lbl) { lbl.value = crit.nombre; lbl.readOnly = false; }
            if (val) val.value = crit.cantidad;
        });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarProveedor(num) {
    if (!confirm(`¿Eliminar proveedor "${num}"?`)) return;
    await fetch(`/api/proveedores/${num}`, { method: 'DELETE' });
    await cargarTodoDesdeServidor(true);
}

// --- PESTAÑA 3: EVALUACIÓN DE DESEMPEÑO Y VALORACIONES ---
function calcularFechaProximaDesdeDias() {
    const fEvalVal = document.getElementById('fecha-evaluacion')?.value;
    const diasVal = parseInt(document.getElementById('dias-proxima-eval')?.value);
    const badgeFechaCalc = document.getElementById('fecha-calculada-prox');

    if (fEvalVal && !isNaN(diasVal) && diasVal > 0) {
        const fechaBase = new Date(fEvalVal + 'T00:00:00');
        fechaBase.setDate(fechaBase.getDate() + diasVal);
        const dia = String(fechaBase.getDate()).padStart(2, '0');
        const mes = String(fechaBase.getMonth() + 1).padStart(2, '0');
        const anio = fechaBase.getFullYear();
        if (badgeFechaCalc) badgeFechaCalc.innerText = `${dia}/${mes}/${anio}`;
        return `${anio}-${mes}-${dia}`;
    } else {
        if (badgeFechaCalc) badgeFechaCalc.innerText = '-- / -- / ----';
        return '';
    }
}

function calcularPuntajeTiemposReales(provNum, anioTarget) {
    const provObj = proveedores.find(p => p.num === provNum);
    const nombreProv = provObj ? provObj.nombre : '';
    const recepcionesProv = recepciones.filter(r => r.provNombre === nombreProv);
    
    const infoCajaRec = document.getElementById('info-caja-recepciones');
    if (infoCajaRec) {
        if (recepcionesProv.length > 0) {
            infoCajaRec.innerHTML = `📦 <b>Recepciones evaluadas:</b> ${recepcionesProv.length} remito(s) encontrados para${nombreProv}.`;
            infoCajaRec.style.display = 'block';
        } else {
            infoCajaRec.innerHTML = `⚠️ <b>Aviso:</b> No se registran remitos de recepción (Pest. 5) para este proveedor.`;
            infoCajaRec.style.display = 'block';
        }
    }

    if (recepcionesProv.length === 0) return null;

    let sumaPuntajes = 0, contador = 0;
    recepcionesProv.forEach(rec => {
        const orden = ordenesCompra.find(oc => oc.idOrden === rec.idOrden);
        if (orden && orden.fechaReq && rec.fechaRecepcion) {
            const anioOrden = orden.fechaEmision ? orden.fechaEmision.split('-')[0] : '';
            if (anioTarget && anioOrden !== anioTarget) return;

            const fRequerida = new Date(orden.fechaReq.split('T')[0] + 'T00:00:00');
            const fReal = new Date(rec.fechaRecepcion.split('T')[0] + 'T00:00:00');
            const diffDias = Math.ceil((fReal - fRequerida) / (1000 * 60 * 60 * 24));
            
            let puntajeEntrega = 100;
            if (diffDias > 0 && diffDias <= 3) puntajeEntrega = 80;
            else if (diffDias > 3 && diffDias <= 7) puntajeEntrega = 50;
            else if (diffDias > 7) puntajeEntrega = 20;

            sumaPuntajes += puntajeEntrega;
            contador++;
        }
    });
    return contador > 0 ? Math.round(sumaPuntajes / contador) : null;
}

function calcularPromediosPreEvaluacionOC(provNum, anioTarget) {
    const ordenesProv = ordenesCompra.filter(oc => oc.provNum === provNum);
    
    const infoCajaOC = document.getElementById('info-caja-oc');
    if (infoCajaOC) {
        if (ordenesProv.length > 0) {
            infoCajaOC.innerHTML = `📋 <b>Órdenes de Compra evaluadas:</b> ${ordenesProv.length} OC(s) encontradas. Promedios calculados automáticamente.`;
            infoCajaOC.style.display = 'block';
        } else {
            infoCajaOC.innerHTML = `⚠️ <b>Aviso:</b> No se registran Órdenes de Compra (Pest. 4) para este proveedor.`;
            infoCajaOC.style.display = 'block';
        }
    }

    if (ordenesProv.length === 0) return { pago: null, plazo: null };

    let sumaPago = 0, contPago = 0;
    let sumaPlazo = 0, contPlazo = 0;

    ordenesProv.forEach(oc => {
        const anioOrden = oc.fechaEmision ? oc.fechaEmision.split('-')[0] : '';
        if (anioTarget && anioOrden !== anioTarget) return;

        if (oc.pagoEval !== undefined && oc.pagoEval !== null) {
            sumaPago += parseFloat(oc.pagoEval);
            contPago++;
        }
        if (oc.plazoEval !== undefined && oc.plazoEval !== null) {
            sumaPlazo += parseFloat(oc.plazoEval);
            contPlazo++;
        }
    });

    return {
        pago: contPago > 0 ? Math.round(sumaPago / contPago) : null,
        plazo: contPlazo > 0 ? Math.round(sumaPlazo / contPlazo) : null
    };
}

async function guardarNombresCriteriosEstadisticas() {
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`lbl-stat-${i}`);
        if (el && el.value.trim()) nombresCriteriosEstadisticas[i - 1] = el.value.trim();
    }
    await fetch('/api/configuraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: 'crit_stat_labels', valor: nombresCriteriosEstadisticas })
    });
}

function cargarNombresCriteriosEstadisticas() {
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`lbl-stat-${i}`);
        if (el) el.value = nombresCriteriosEstadisticas[i - 1] || `Criterio ${i}`;
    }
}

function actualizarSelectProveedoresEstadisticas() {
    const select = document.getElementById('select-prov-estadistica');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccione un Proveedor --</option>';
    
    select.onchange = cargarCalificacionExistente;

    [...proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.num;
        opt.innerText = `${p.nombre} (${p.num})`;
        select.appendChild(opt);
    });
    cargarNombresCriteriosEstadisticas();
    renderizarTablaEstadisticas();
}

function habilitarCampoManual(inputEl, esAutomatico, valorAuto) {
    if (!inputEl) return;
    if (esAutomatico && valorAuto !== null) {
        inputEl.value = valorAuto;
        inputEl.readOnly = true;
        inputEl.disabled = true;
        inputEl.style.backgroundColor = '#fff8e1';
        inputEl.style.pointerEvents = 'none';
    } else {
        inputEl.readOnly = false;
        inputEl.disabled = false;
        inputEl.removeAttribute('readonly');
        inputEl.removeAttribute('disabled');
        inputEl.style.backgroundColor = '#ffffff';
        inputEl.style.pointerEvents = 'auto';
        inputEl.placeholder = "Puntaje manual (0-100)";
    }
}

function esEvaluacionHistorica() {
    const anioSeleccionado = parseInt(document.getElementById('select-anio-estadistica')?.value, 10);
    const fechaEval = document.getElementById('fecha-evaluacion')?.value;

    if (!isNaN(anioSeleccionado) && anioSeleccionado < 2026) return true;
    if (!isNaN(anioSeleccionado) && anioSeleccionado > 2026) return false;

    return Boolean(fechaEval && fechaEval < '2026-08-01');
}

function actualizarModoCamposAutomaticosPorFecha() {
    const inputEntregaAuto = document.getElementById('stat-val-1');
    const inputPagoAuto = document.getElementById('stat-val-3');
    const inputPlazoAuto = document.getElementById('stat-val-4');
    const avisoModoHistorico = document.getElementById('aviso-modo-historico');

    if (esEvaluacionHistorica()) {
        if (avisoModoHistorico) avisoModoHistorico.style.display = 'block';
        [inputEntregaAuto, inputPagoAuto, inputPlazoAuto].forEach(inputEl => {
            if (!inputEl) return;
            inputEl.readOnly = false;
            inputEl.disabled = false;
            inputEl.removeAttribute('readonly');
            inputEl.removeAttribute('disabled');
            inputEl.style.backgroundColor = '#ffffff';
            inputEl.style.pointerEvents = 'auto';
            inputEl.placeholder = 'Puntaje histórico manual (0-100)';
            inputEl.title = 'Editable por corresponder a una evaluación anterior a agosto de 2026';
        });
        return;
    }

    if (avisoModoHistorico) avisoModoHistorico.style.display = 'none';

    const provNum = document.getElementById('select-prov-estadistica')?.value;
    const anio = document.getElementById('select-anio-estadistica')?.value;

    [inputEntregaAuto, inputPagoAuto, inputPlazoAuto].forEach(inputEl => {
        if (!inputEl) return;
        inputEl.readOnly = true;
        inputEl.disabled = true;
        inputEl.setAttribute('readonly', 'readonly');
        inputEl.setAttribute('disabled', 'disabled');
        inputEl.style.backgroundColor = '#fff8e1';
        inputEl.style.pointerEvents = 'none';
        inputEl.placeholder = 'Puntaje automático';
        inputEl.title = 'Campo automático: se completa desde las pestañas 4 y 5';
    });

    if (!provNum || !anio) return;

    const puntajeEntrega = calcularPuntajeTiemposReales(provNum, anio);
    const promediosOC = calcularPromediosPreEvaluacionOC(provNum, anio);

    if (inputEntregaAuto) inputEntregaAuto.value = puntajeEntrega !== null ? puntajeEntrega : '';
    if (inputPagoAuto) inputPagoAuto.value = promediosOC.pago !== null ? promediosOC.pago : '';
    if (inputPlazoAuto) inputPlazoAuto.value = promediosOC.plazo !== null ? promediosOC.plazo : '';
}

function cargarCalificacionExistente() {
    const provSelect = document.getElementById('select-prov-estadistica');
    const anioSelect = document.getElementById('select-anio-estadistica');
    if (!provSelect || !anioSelect) return;

    const provNum = provSelect.value;
    const anio = anioSelect.value;
    const registro = estadisticas.find(e => e.provNum === provNum && e.anio === anio);

    const inputEntregaAuto = document.getElementById('stat-val-1');
    const inputPagoAuto = document.getElementById('stat-val-3');
    const inputPlazoAuto = document.getElementById('stat-val-4');

    if (registro) {
        if (registro.numFormulario) document.getElementById('num-formulario').value = registro.numFormulario;
        if (registro.fechaEval) document.getElementById('fecha-evaluacion').value = registro.fechaEval.split('T')[0];
        document.getElementById('dias-proxima-eval').value = registro.diasPlazo || '';
        calcularFechaProximaDesdeDias();
        if (registro.puntajes) {
            for (let i = 1; i <= 6; i++) {
                const el = document.getElementById(`stat-val-${i}`);
                if (el) {
                    el.value = registro.puntajes[i - 1] !== undefined ? registro.puntajes[i - 1] : '';
                    el.readOnly = false;
                    el.disabled = false;
                    el.removeAttribute('readonly');
                    el.removeAttribute('disabled');
                    el.style.backgroundColor = '#ffffff';
                    el.style.pointerEvents = 'auto';
                }
            }
        }
    } else {
        document.getElementById('fecha-evaluacion').value = '';
        document.getElementById('dias-proxima-eval').value = '';
        document.getElementById('fecha-calculada-prox').innerText = '-- / -- / ----';
        for (let i = 1; i <= 6; i++) {
            const el = document.getElementById(`stat-val-${i}`);
            if (el) el.value = '';
        }
    }

    if (provNum && !registro) {
        const pc = calcularPuntajeTiemposReales(provNum, anio);
        habilitarCampoManual(inputEntregaAuto, pc !== null, pc);

        const oc = calcularPromediosPreEvaluacionOC(provNum, anio);
        habilitarCampoManual(inputPagoAuto, oc.pago !== null, oc.pago);

        if (oc.plazo !== null) {
            if (inputPlazoAuto) inputPlazoAuto.value = oc.plazo;
        } else if (inputPlazoAuto) {
            inputPlazoAuto.readOnly = false;
            inputPlazoAuto.disabled = false;
            inputPlazoAuto.removeAttribute('readonly');
            inputPlazoAuto.removeAttribute('disabled');
            inputPlazoAuto.style.backgroundColor = '#ffffff';
            inputPlazoAuto.style.pointerEvents = 'auto';
        }
    }

    actualizarModoCamposAutomaticosPorFecha();
    calcularPuntajeClase();
    renderizarGraficosPestaña3();
}

function calcularPuntajeClase() {
    let suma = 0, contador = 0;
    for (let i = 1; i <= 6; i++) {
        const val = parseFloat(document.getElementById(`stat-val-${i}`)?.value);
        if (!isNaN(val)) { suma += val; contador++; }
    }
    const promedio = contador > 0 ? Math.round(suma / contador) : 0;
    const promEl = document.getElementById('stat-promedio');
    if (promEl) promEl.innerText = `${promedio} pts`;

    const badgeClase = document.getElementById('stat-clase');
    let clase = 'Clase D', claseCSS = 'badge-d';
    if (promedio >= 91) { clase = 'Clase A'; claseCSS = 'badge-a'; }
    else if (promedio >= 76) { clase = 'Clase B'; claseCSS = 'badge-b'; }
    else if (promedio >= 61) { clase = 'Clase C'; claseCSS = 'badge-c'; }

    if (badgeClase) { badgeClase.innerText = clase; badgeClase.className = `clase-badge ${claseCSS}`; }
    
    actualizarGraficoRadar();
    return { promedio, clase, claseCSS };
}

async function calcularEstadistica(e) {
    if (e) e.preventDefault();

    const provNum = document.getElementById('select-prov-estadistica').value;
    const anio = document.getElementById('select-anio-estadistica').value;
    const fechaEval = document.getElementById('fecha-evaluacion').value;
    const numFormulario = document.getElementById('num-formulario').value.trim();

    if (!numFormulario || !provNum || !anio || !fechaEval) {
        alert("⚠️ Por favor complete los campos obligatorios: N° de Formulario, Proveedor, Año de Evaluación y Fecha de Evaluación Real.");
        return;
    }

    await guardarNombresCriteriosEstadisticas();
    const proveedor = proveedores.find(p => p.num === provNum);
    const { promedio, clase, claseCSS } = calcularPuntajeClase();
    const diasPlazo = parseInt(document.getElementById('dias-proxima-eval').value) || 0;
    const fechaProx = calcularFechaProximaDesdeDias();

    const puntajes = [];
    for (let i = 1; i <= 6; i++) {
        let val = parseFloat(document.getElementById(`stat-val-${i}`)?.value);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        if (val > 100) val = 100;
        puntajes.push(val);
    }

    await fetch('/api/estadisticas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            numFormulario, version: '', provNum, provNombre: proveedor ? proveedor.nombre : 'Desconocido',
            anio, fechaEval, diasPlazo, fechaProx, promedio, clase, claseCSS, puntajes
        })
    });

    document.getElementById('form-estadisticas').reset();
    
    poblarSelectAnios();
    document.getElementById('fecha-calculada-prox').innerText = '-- / -- / ----';
    cargarNombresCriteriosEstadisticas();
    document.getElementById('stat-promedio').innerText = '0 pts';
    document.getElementById('stat-clase').innerText = 'Clase D';
    document.getElementById('stat-clase').className = 'clase-badge badge-d';

    await cargarTodoDesdeServidor(true);
}

function renderizarTablaEstadisticas() {
    const tbody = document.getElementById('tabla-estadisticas-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    [...estadisticas].sort((a, b) => b.anio.localeCompare(a.anio)).forEach((s) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.numFormulario || ''}</strong></td>
            <td><strong>${s.anio}</strong></td>
            <td>${s.provNum}</td>
            <td>${s.provNombre}</td>
            <td>${s.fechaEval ? s.fechaEval.split('T')[0] : ''}</td>
            <td><strong>${s.diasPlazo || 0} días</strong></td>
            <td><strong>${s.fechaProx ? s.fechaProx.split('T')[0] : ''}</strong></td>
            <td>${s.promedio} pts</td>
            <td><span class="clase-badge ${s.claseCSS}">${s.clase}</span></td>
            <td><button class="btn-warning" onclick="editarEstadistica('${s.provNum}', '${s.anio}')">Editar</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function editarEstadistica(provNum, anio) {
    document.getElementById('select-prov-estadistica').value = provNum;
    document.getElementById('select-anio-estadistica').value = anio;
    cargarCalificacionExistente();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- PESTAÑA 4: ÓRDENES DE COMPRA & TABLA DINÁMICA DE PAGOS ---
function obtenerSaldoExcedenteSeleccionado() {
    const provNum = document.getElementById('select-compra-prov')?.value;
    const reqNum = document.getElementById('select-compra-req')?.value;
    const saldo = saldosExcedentes.find(s => s.provNum === provNum && s.reqNum === reqNum);
    return saldo ? (parseFloat(saldo.cantidadDisponible) || 0) : 0;
}

function actualizarSaldoExcedenteCompra() {
    const caja = document.getElementById('saldo-excedente-compra');
    const textoDisponible = document.getElementById('compra-saldo-disponible');
    const inputAplicar = document.getElementById('compra-saldo-aplicar');
    if (!caja || !textoDisponible || !inputAplicar) {
        calcularTotalCompra();
        return;
    }

    const disponible = obtenerSaldoExcedenteSeleccionado();
    textoDisponible.innerText = disponible;
    caja.style.display = disponible > 0 ? 'block' : 'none';
    inputAplicar.max = disponible;
    if (disponible <= 0) inputAplicar.value = 0;
    if ((parseFloat(inputAplicar.value) || 0) > disponible) inputAplicar.value = disponible;
    actualizarCantidadFinalCompra();
}

function actualizarCantidadFinalCompra() {
    const necesidad = parseFloat(document.getElementById('compra-cantidad')?.value) || 0;
    const disponible = obtenerSaldoExcedenteSeleccionado();
    const inputAplicar = document.getElementById('compra-saldo-aplicar');
    const inputFinal = document.getElementById('compra-cantidad-final');
    let aplicar = parseFloat(inputAplicar?.value) || 0;
    aplicar = Math.max(0, Math.min(aplicar, disponible, necesidad));
    if (inputAplicar) inputAplicar.value = aplicar;
    if (inputFinal) inputFinal.value = Math.max(0, necesidad - aplicar);
    calcularTotalCompra();
}

function calcularTotalCompra() {
    const cantidadFinal = document.getElementById('compra-cantidad-final');
    const cantidad = cantidadFinal && cantidadFinal.value !== ''
        ? parseFloat(cantidadFinal.value)
        : parseFloat(document.getElementById('compra-cantidad')?.value);
    const valorUnitario = parseFloat(document.getElementById('compra-valor-unitario')?.value);
    const inputTotal = document.getElementById('compra-valor-total');
    if (!inputTotal) return 0;

    if (!isNaN(cantidad) && !isNaN(valorUnitario)) {
        const total = Math.round((cantidad * valorUnitario + Number.EPSILON) * 100) / 100;
        inputTotal.value = total.toFixed(2);
        return total;
    }

    inputTotal.value = '';
    return 0;
}

function formatearImporteCompra(valor) {
    if (valor === null || valor === undefined || valor === '') return '-';
    const numero = Number(valor);
    if (isNaN(numero)) return '-';
    return numero.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function actualizarSelectsCompras() {
    const selectProv = document.getElementById('select-compra-prov');
    if (selectProv) {
        selectProv.innerHTML = '<option value="">-- Seleccione Proveedor --</option>';
        let proveedoresPermitidos = proveedores;
        if (usuarioActual && usuarioActual.nombre !== 'admin') {
            const provsAsignados = permisosProveedoresPorUsuario[usuarioActual.nombre];
            if (Array.isArray(provsAsignados) && provsAsignados.length > 0) {
                proveedoresPermitidos = proveedores.filter(p => provsAsignados.includes(p.num));
            }
        }
        [...proveedoresPermitidos].sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.num;
            opt.innerText = `${p.nombre} (${p.num})`;
            selectProv.appendChild(opt);
        });
    }

    const selectReq = document.getElementById('select-compra-req');
    if (selectReq) {
        selectReq.innerHTML = '<option value="">-- Seleccione Requisito --</option>';
        [...requisitos].sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.num;
            opt.innerText = `${r.nombre} [${r.num}]`;
            selectReq.appendChild(opt);
        });
    }

    const selectCondPago = document.getElementById('select-compra-condicion-pago');
    if (selectCondPago) {
        selectCondPago.innerHTML = '<option value="">-- Seleccione Condición --</option>';
        [...opcionesCondicionPago].sort((a, b) => a.localeCompare(b)).forEach(optVal => {
            const opt = document.createElement('option');
            opt.value = optVal;
            opt.innerText = optVal;
            selectCondPago.appendChild(opt);
        });
    }

    renderizarListaReglasPagoUI();
}

function autoCompletarPuntajePago() {
    const condEl = document.getElementById('select-compra-condicion-pago');
    const inputPagoEval = document.getElementById('compra-pago-eval');
    if (condEl && inputPagoEval) {
        const condicionSelect = condEl.value;
        if (condicionSelect && tablaCondicionPagoPuntos[condicionSelect] !== undefined) {
            inputPagoEval.value = tablaCondicionPagoPuntos[condicionSelect];
        } else {
            inputPagoEval.value = '';
        }
    }
}

function autoCompletarPuntajePlazo() {
    const selectPlazo = document.getElementById('select-compra-plazo-valoracion');
    const inputPlazoEval = document.getElementById('compra-plazo-eval');
    if (!selectPlazo || !inputPlazoEval) return;
    inputPlazoEval.value = selectPlazo.value;
}

function renderizarListaReglasPagoUI() {
    const ul = document.getElementById('lista-reglas-pago-ui');
    if (!ul) return;
    ul.innerHTML = '';
    Object.keys(tablaCondicionPagoPuntos).forEach(cond => {
        const pts = tablaCondicionPagoPuntos[cond];
        const li = document.createElement('li');
        li.innerHTML = `<strong>${cond}:</strong>${pts} Puntos`;
        ul.appendChild(li);
    });
}

function abrirModalGestionPago() {
    document.getElementById('modal-gestion-pago').style.display = 'flex';
    renderizarTablaModalGestionPago();
}

function cerrarModalGestionPago() {
    document.getElementById('modal-gestion-pago').style.display = 'none';
}

function renderizarTablaModalGestionPago() {
    const container = document.getElementById('tabla-gestion-pago-container');
    if (!container) return;

    let html = `<table>
        <thead>
            <tr>
                <th>Nombre Condición de Pago</th>
                <th>Puntaje (0-100 pts)</th>
                <th>Acción</th>
            </tr>
        </thead>
        <tbody>`;

    Object.keys(tablaCondicionPagoPuntos).forEach((cond, idx) => {
        const pts = tablaCondicionPagoPuntos[cond];
        html += `<tr>
            <td><input type="text" id="modal-cond-nombre-${idx}" value="${cond}" style="width: 100%; padding: 4px;"></td>
            <td><input type="number" min="0" max="100" id="modal-cond-pts-${idx}" value="${pts}" style="width: 80px; padding: 4px;"> pts</td>
            <td><button class="btn-danger" onclick="eliminarCondicionPagoModal('${cond}')">Eliminar</button></td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function eliminarCondicionPagoModal(cond) {
    if (Object.keys(tablaCondicionPagoPuntos).length <= 1) {
        alert("Debe quedar al menos una condición de pago registrada.");
        return;
    }
    delete tablaCondicionPagoPuntos[cond];
    renderizarTablaModalGestionPago();
}

function agregarNuevaCondicionDirecta() {
    const nombreInput = document.getElementById('nuevo-pago-nombre');
    const puntosInput = document.getElementById('nuevo-pago-puntos');

    const nombre = nombreInput.value.trim();
    const puntos = parseInt(puntosInput.value);

    if (!nombre) {
        alert("Por favor ingresa un nombre para la nueva condición.");
        return;
    }
    if (isNaN(puntos) || puntos < 0 || puntos > 100) {
        alert("Por favor ingresa un puntaje válido entre 0 y 100.");
        return;
    }

    tablaCondicionPagoPuntos[nombre] = puntos;
    nombreInput.value = '';
    puntosInput.value = '';

    renderizarTablaModalGestionPago();
}

async function guardarCambiosModalPago() {
    const nuevaTabla = {};
    const keysOriginales = Object.keys(tablaCondicionPagoPuntos);

    for (let i = 0; i < keysOriginales.length; i++) {
        const inputNombre = document.getElementById(`modal-cond-nombre-${i}`);
        const inputPts = document.getElementById(`modal-cond-pts-${i}`);

        if (inputNombre && inputPts) {
            const nombreVal = inputNombre.value.trim();
            const ptsVal = parseInt(inputPts.value);

            if (nombreVal && !isNaN(ptsVal)) {
                nuevaTabla[nombreVal] = Math.min(100, Math.max(0, ptsVal));
            }
        }
    }

    if (Object.keys(nuevaTabla).length === 0) {
        alert("La tabla no puede estar vacía.");
        return;
    }

    tablaCondicionPagoPuntos = nuevaTabla;
    opcionesCondicionPago = Object.keys(tablaCondicionPagoPuntos);

    await fetch('/api/configuraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: 'tabla_condicion_pago_puntos', valor: tablaCondicionPagoPuntos })
    });

    actualizarSelectsCompras();
    renderizarListaReglasPagoUI();
    autoCompletarPuntajePago();
    cerrarModalGestionPago();

    alert("✅ Escala de valoración y condiciones de pago actualizadas correctamente.");
}

async function iniciarCompra(e) {
    if (e) e.preventDefault();
    const editIdInput = document.getElementById('compra-edit-id');
    const editId = editIdInput ? editIdInput.value.trim() : '';

    const numFormulario = document.getElementById('num-formulario-comp').value.trim();
    const tipoOrden = document.getElementById('select-compra-tipo')?.value || 'Normal';
    const provNum = document.getElementById('select-compra-prov').value;
    const reqNum = document.getElementById('select-compra-req').value;
    const cantidadNecesaria = parseFloat(document.getElementById('compra-cantidad').value) || 0;
    let saldoAplicado = parseFloat(document.getElementById('compra-saldo-aplicar')?.value) || 0;
    if (editId) {
        const ordenExistente = ordenesCompra.find(o => o.idOrden === editId);
        saldoAplicado = parseFloat(ordenExistente?.saldoAplicado) || 0;
    }
    const cantidad = Math.max(0, cantidadNecesaria - saldoAplicado);
    const valorUnitario = parseFloat(document.getElementById('compra-valor-unitario').value);
    const valorTotal = calcularTotalCompra();
    const fechaEmision = document.getElementById('compra-fecha-emision').value || new Date().toISOString().split('T')[0];
    const fechaReq = document.getElementById('compra-fecha-req').value;
    const condicionPago = document.getElementById('select-compra-condicion-pago').value;
    const observaciones = document.getElementById('compra-observaciones').value.trim();
    const pagoEval = parseInt(document.getElementById('compra-pago-eval').value) || 0;
    const plazoSeleccionado = document.getElementById('select-compra-plazo-valoracion')?.value ?? '';
    if (plazoSeleccionado === '') {
        alert('⚠️ Seleccione la valoración de conveniencia del plazo ofrecido.');
        return;
    }
    const plazoEval = parseInt(plazoSeleccionado, 10);

    if (isNaN(valorUnitario) || valorUnitario < 0) {
        alert('⚠️ Ingrese un valor unitario válido.');
        return;
    }
    if (cantidadNecesaria <= 0) return alert('⚠️ Ingrese una necesidad total válida.');
    if (!editId && (saldoAplicado > obtenerSaldoExcedenteSeleccionado() || saldoAplicado > cantidadNecesaria)) {
        return alert('⚠️ El saldo a aplicar no es válido. Recargue los datos e intente nuevamente.');
    }
    if (cantidad <= 0) {
        return alert('ℹ️ La necesidad queda totalmente cubierta por el saldo a favor. No es necesario emitir una nueva orden de compra.');
    }

    const provObj = proveedores.find(p => p.num === provNum);
    const reqObj = requisitos.find(r => r.num === reqNum);

    let idOrden = editId;
    if (!idOrden || idOrden === '') {
        let nuevoNumero = 1001;
        if (ordenesCompra.length > 0) {
            const numerosExistentes = ordenesCompra.map(o => {
                const num = parseInt(o.idOrden.replace('OC-', ''));
                return isNaN(num) ? 0 : num;
            });
            nuevoNumero = Math.max(...numerosExistentes) + 1;
        }
        idOrden = `OC-${nuevoNumero}`;
    }

    const ordenGuardar = {
        idOrden,
        tipoOrden,
        numFormulario,
        provNum,
        provNombre: provObj ? provObj.nombre : provNum,
        reqNum,
        reqNombre: reqObj ? reqObj.nombre : reqNum,
        reqDetalle: reqObj ? reqObj.detalle : '',
        cantidad,
        cantidadNecesaria,
        saldoAplicado,
        valorUnitario,
        valorTotal,
        fechaEmision,
        fechaReq,
        condicionPago,
        observaciones,
        pagoEval,
        plazoEval,
        estado: 'Pendiente'
    };

    const respuestaCompra = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ordenGuardar)
    });

    if (!respuestaCompra.ok) {
        const error = await respuestaCompra.json().catch(() => ({}));
        return alert(`❌ No se pudo guardar la orden: ${error.error || 'Error desconocido'}`);
    }

    if (!editId && saldoAplicado > 0) {
        const respuestaSaldo = await fetch('/api/excedentes/aplicar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idOrden, provNum, reqNum, cantidad: saldoAplicado })
        });
        if (!respuestaSaldo.ok) {
            const error = await respuestaSaldo.json().catch(() => ({}));
            alert(`⚠️ La orden se guardó, pero no se pudo aplicar el saldo: ${error.error || 'Error desconocido'}`);
        }
    }

    generarPDFOrden(ordenGuardar);
    cancelarEdicionCompra();
    await cargarTodoDesdeServidor(true);
}

function renderizarTablaCompras() {
    const tbody = document.getElementById('tabla-compras-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    ordenesCompra.forEach(oc => {
        const tr = document.createElement('tr');
        const badgeClass = oc.estado === 'Pendiente' ? 'status-badge-pending' : 'status-badge-received';
        const tipoText = oc.tipoOrden === 'Abierta' 
            ? '<span style="background:#e8f5e9; color:#2e7d32; border: 1px solid #a5d6a7; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.85em;">📂 Abierta</span>' 
            : '<span style="background:#f5f5f5; color:#616161; border: 1px solid #e0e0e0; padding: 2px 6px; border-radius: 4px; font-size: 0.85em;">📌 Normal</span>';

        const botonesAcciones = oc.estado === 'Pendiente' 
            ? `<button class="btn-warning" onclick="editarOrdenCompra('${oc.idOrden}')">Editar</button>
               <button class="btn-danger" onclick="eliminarOrdenCompra('${oc.idOrden}')">Eliminar</button>` 
            : `<small style="color:#777;">No editable</small>`;

        tr.innerHTML = `
            <td><strong>${oc.numFormulario || ''}</strong></td>
            <td><strong>${oc.idOrden}</strong></td>
            <td>${tipoText}</td>
            <td>${oc.provNombre}</td>
            <td>${oc.reqNombre}</td>
            <td>${oc.cantidadNecesaria || oc.cantidad}</td>
            <td>${oc.saldoAplicado || 0}</td>
            <td>${oc.cantidad}</td>
            <td>${formatearImporteCompra(oc.valorUnitario)}</td>
            <td><strong>${formatearImporteCompra(oc.valorTotal)}</strong></td>
            <td><strong>${oc.condicionPago || '-'}</strong></td>
            <td>${oc.fechaEmision ? oc.fechaEmision.split('T')[0] : ''}</td>
            <td>${oc.fechaReq ? oc.fechaReq.split('T')[0] : ''}</td>
            <td><span class="${badgeClass}">${oc.estado}</span></td>
            <td>${botonesAcciones}</td>
        `;
        tbody.appendChild(tr);
    });
}

function prepararHistorialProveedores() {
    const selectProveedor = document.getElementById('historial-filtro-proveedor');
    const selectProducto = document.getElementById('historial-filtro-producto');
    const selectEstado = document.getElementById('historial-filtro-estado');
    if (!selectProveedor || !selectProducto || !selectEstado) return;

    const proveedorActual = selectProveedor.value;
    const productoActual = selectProducto.value;
    const estadoActual = selectEstado.value;

    const proveedoresConCompras = new Map();
    const productosConCompras = new Map();
    const estadosConCompras = new Set();

    ordenesCompra.forEach(oc => {
        if (oc.provNum) proveedoresConCompras.set(String(oc.provNum), oc.provNombre || oc.provNum);
        const claveProducto = String(oc.reqNum || oc.reqNombre || '');
        if (claveProducto) productosConCompras.set(claveProducto, oc.reqNombre || oc.reqNum);
        if (oc.estado) estadosConCompras.add(String(oc.estado));
    });

    selectProveedor.innerHTML = '<option value="">Todos los proveedores</option>';
    [...proveedoresConCompras.entries()]
        .sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'es'))
        .forEach(([numero, nombre]) => {
            const option = document.createElement('option');
            option.value = numero;
            option.textContent = `${nombre} (${numero})`;
            selectProveedor.appendChild(option);
        });

    selectProducto.innerHTML = '<option value="">Todos los productos</option>';
    [...productosConCompras.entries()]
        .sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'es'))
        .forEach(([codigo, nombre]) => {
            const option = document.createElement('option');
            option.value = codigo;
            option.textContent = nombre;
            selectProducto.appendChild(option);
        });

    selectEstado.innerHTML = '<option value="">Todos los estados</option>';
    [...estadosConCompras]
        .sort((a, b) => a.localeCompare(b, 'es'))
        .forEach(estado => {
            const option = document.createElement('option');
            option.value = estado;
            option.textContent = estado;
            selectEstado.appendChild(option);
        });

    if ([...selectProveedor.options].some(opt => opt.value === proveedorActual)) selectProveedor.value = proveedorActual;
    if ([...selectProducto.options].some(opt => opt.value === productoActual)) selectProducto.value = productoActual;
    if ([...selectEstado.options].some(opt => opt.value === estadoActual)) selectEstado.value = estadoActual;

    renderizarHistorialProveedores();
}

function obtenerComprasFiltradasHistorial() {
    const proveedor = document.getElementById('historial-filtro-proveedor')?.value || '';
    const desde = document.getElementById('historial-filtro-desde')?.value || '';
    const hasta = document.getElementById('historial-filtro-hasta')?.value || '';
    const producto = document.getElementById('historial-filtro-producto')?.value || '';
    const estado = document.getElementById('historial-filtro-estado')?.value || '';

    return ordenesCompra
        .filter(oc => {
            const fecha = oc.fechaEmision ? String(oc.fechaEmision).split('T')[0] : '';
            const claveProducto = String(oc.reqNum || oc.reqNombre || '');
            if (proveedor && String(oc.provNum) !== proveedor) return false;
            if (desde && (!fecha || fecha < desde)) return false;
            if (hasta && (!fecha || fecha > hasta)) return false;
            if (producto && claveProducto !== producto) return false;
            if (estado && String(oc.estado || '') !== estado) return false;
            return true;
        })
        .sort((a, b) => {
            const fechaA = a.fechaEmision ? String(a.fechaEmision).split('T')[0] : '';
            const fechaB = b.fechaEmision ? String(b.fechaEmision).split('T')[0] : '';
            return fechaB.localeCompare(fechaA) || String(b.idOrden || '').localeCompare(String(a.idOrden || ''));
        });
}

function escaparHtmlHistorial(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatearCantidadHistorial(valor) {
    const numero = Number(valor) || 0;
    return numero.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

function renderizarHistorialProveedores() {
    const tbody = document.getElementById('tabla-historial-proveedores-body');
    if (!tbody) return;

    const compras = obtenerComprasFiltradasHistorial();
    tbody.innerHTML = '';

    let totalUnidades = 0;
    let totalImporte = 0;

    compras.forEach(oc => {
        const cantidad = Number(oc.cantidad) || 0;
        const valorUnitario = Number(oc.valorUnitario) || 0;
        const valorTotal = Number(oc.valorTotal) || (cantidad * valorUnitario);
        totalUnidades += cantidad;
        totalImporte += valorTotal;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escaparHtmlHistorial(oc.fechaEmision ? String(oc.fechaEmision).split('T')[0] : '')}</td>
            <td><strong>${escaparHtmlHistorial(oc.idOrden || '')}</strong></td>
            <td>${escaparHtmlHistorial(oc.provNombre || oc.provNum || '')}</td>
            <td>${escaparHtmlHistorial(oc.reqNombre || oc.reqNum || '')}</td>
            <td style="text-align:right;">${formatearCantidadHistorial(cantidad)}</td>
            <td style="text-align:right;">${formatearImporteCompra(valorUnitario)}</td>
            <td style="text-align:right;"><strong>${formatearImporteCompra(valorTotal)}</strong></td>
            <td>${escaparHtmlHistorial(oc.condicionPago || '-')}</td>
            <td>${escaparHtmlHistorial(oc.fechaReq ? String(oc.fechaReq).split('T')[0] : '')}</td>
            <td>${escaparHtmlHistorial(oc.estado || '-')}</td>
        `;
        tbody.appendChild(tr);
    });

    const totalOrdenesEl = document.getElementById('historial-total-ordenes');
    const totalUnidadesEl = document.getElementById('historial-total-unidades');
    const totalImporteEl = document.getElementById('historial-total-importe');
    const sinResultadosEl = document.getElementById('historial-sin-resultados');
    if (totalOrdenesEl) totalOrdenesEl.textContent = compras.length.toLocaleString('es-AR');
    if (totalUnidadesEl) totalUnidadesEl.textContent = formatearCantidadHistorial(totalUnidades);
    if (totalImporteEl) totalImporteEl.textContent = formatearImporteCompra(totalImporte);
    if (sinResultadosEl) sinResultadosEl.style.display = compras.length === 0 ? 'block' : 'none';
}

function limpiarFiltrosHistorialProveedores() {
    ['historial-filtro-proveedor', 'historial-filtro-desde', 'historial-filtro-hasta', 'historial-filtro-producto', 'historial-filtro-estado']
        .forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.value = '';
        });
    renderizarHistorialProveedores();
}

function obtenerFilasExportacionHistorial() {
    return obtenerComprasFiltradasHistorial().map(oc => {
        const cantidad = Number(oc.cantidad) || 0;
        const valorUnitario = Number(oc.valorUnitario) || 0;
        const valorTotal = Number(oc.valorTotal) || (cantidad * valorUnitario);
        return {
            'Fecha de emisión': oc.fechaEmision ? String(oc.fechaEmision).split('T')[0] : '',
            'N° Orden': oc.idOrden || '',
            'N° Proveedor': oc.provNum || '',
            'Proveedor': oc.provNombre || '',
            'Código producto': oc.reqNum || '',
            'Producto / Requisito': oc.reqNombre || '',
            'Cantidad': cantidad,
            'Valor unitario': valorUnitario,
            'Valor total': valorTotal,
            'Condición de pago': oc.condicionPago || '',
            'Fecha requerida': oc.fechaReq ? String(oc.fechaReq).split('T')[0] : '',
            'Estado': oc.estado || ''
        };
    });
}

function exportarHistorialProveedoresExcel() {
    const filas = obtenerFilasExportacionHistorial();
    if (filas.length === 0) {
        alert('⚠️ No hay compras para exportar con los filtros seleccionados.');
        return;
    }

    const nombreArchivo = `Historial_Proveedores_${new Date().toISOString().split('T')[0]}.xlsx`;
    if (typeof XLSX !== 'undefined') {
        const hoja = XLSX.utils.json_to_sheet(filas);
        hoja['!cols'] = [
            { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 28 },
            { wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 16 },
            { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 14 }
        ];
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, 'Historial de compras');
        XLSX.writeFile(libro, nombreArchivo);
        return;
    }

    const encabezados = Object.keys(filas[0]);
    const escaparCsv = valor => `"${String(valor ?? '').replace(/"/g, '""')}"`;
    const contenido = [encabezados.map(escaparCsv).join(';')]
        .concat(filas.map(fila => encabezados.map(campo => escaparCsv(fila[campo])).join(';')))
        .join('\r\n');
    const blob = new Blob(['\ufeff' + contenido], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombreArchivo.replace('.xlsx', '.csv');
    enlace.click();
    URL.revokeObjectURL(enlace.href);
}

function editarOrdenCompra(idOrden) {
    const oc = ordenesCompra.find(o => o.idOrden === idOrden);
    if (!oc) return;

    document.getElementById('compra-edit-id').value = oc.idOrden;
    document.getElementById('num-formulario-comp').value = oc.numFormulario || '';
    document.getElementById('select-compra-tipo').value = oc.tipoOrden || 'Normal';
    document.getElementById('select-compra-prov').value = oc.provNum || '';
    document.getElementById('select-compra-req').value = oc.reqNum || '';
    document.getElementById('compra-cantidad').value = oc.cantidadNecesaria || oc.cantidad || '';
    actualizarSaldoExcedenteCompra();
    const inputSaldoAplicar = document.getElementById('compra-saldo-aplicar');
    if (inputSaldoAplicar) {
        inputSaldoAplicar.value = oc.saldoAplicado || 0;
        inputSaldoAplicar.disabled = true;
    }
    actualizarCantidadFinalCompra();
    document.getElementById('compra-valor-unitario').value = oc.valorUnitario ?? '';
    calcularTotalCompra();
    
    if (oc.fechaEmision) document.getElementById('compra-fecha-emision').value = oc.fechaEmision.split('T')[0];
    if (oc.fechaReq) document.getElementById('compra-fecha-req').value = oc.fechaReq.split('T')[0];

    document.getElementById('select-compra-condicion-pago').value = oc.condicionPago || '';
    document.getElementById('compra-pago-eval').value = oc.pagoEval || '';
    document.getElementById('compra-plazo-eval').value = oc.plazoEval ?? '';
    const selectPlazo = document.getElementById('select-compra-plazo-valoracion');
    if (selectPlazo) selectPlazo.value = oc.plazoEval ?? '';
    document.getElementById('compra-observaciones').value = oc.observaciones || '';

    document.getElementById('btn-submit-compras').innerText = `💾 Confirmar Corrección (${oc.idOrden})`;
    document.getElementById('btn-cancel-edit-compras').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicionCompra() {
    document.getElementById('compra-edit-id').value = '';
    document.getElementById('form-compras').reset();
    document.getElementById('compra-valor-total').value = '';
    const selectPlazo = document.getElementById('select-compra-plazo-valoracion');
    if (selectPlazo) selectPlazo.value = '';
    const inputSaldoAplicar = document.getElementById('compra-saldo-aplicar');
    if (inputSaldoAplicar) {
        inputSaldoAplicar.disabled = false;
        inputSaldoAplicar.value = 0;
    }
    actualizarSaldoExcedenteCompra();
    document.getElementById('btn-submit-compras').innerText = '📄 Emitir y Generar PDF Orden de Compra';
    document.getElementById('btn-cancel-edit-compras').style.display = 'none';
}

async function eliminarOrdenCompra(idOrden) {
    if (!confirm(`¿Eliminar Orden de Compra "${idOrden}"?`)) return;
    try {
        const res = await fetch(`/api/compras/${idOrden}`, { method: 'DELETE' });
        if (res.ok) {
            await cargarTodoDesdeServidor(true);
        } else {
            alert("Error al intentar eliminar la Orden.");
        }
    } catch (e) {
        console.error(e);
    }
}

function agregarLogoEmpresaAlPDF(doc) {
    const logo = document.getElementById('app-logo') || document.getElementById('login-logo');
    if (!logo || !logo.complete || !logo.naturalWidth || !logo.naturalHeight) return false;

    try {
        const canvas = document.createElement('canvas');
        canvas.width = logo.naturalWidth;
        canvas.height = logo.naturalHeight;
        const contexto = canvas.getContext('2d');
        if (!contexto) return false;

        contexto.drawImage(logo, 0, 0);
        const imagenPng = canvas.toDataURL('image/png');

        const anchoMaximo = 38;
        const altoMaximo = 18;
        const escala = Math.min(anchoMaximo / logo.naturalWidth, altoMaximo / logo.naturalHeight);
        const anchoLogo = logo.naturalWidth * escala;
        const altoLogo = logo.naturalHeight * escala;

        doc.addImage(imagenPng, 'PNG', 20, 8, anchoLogo, altoLogo, undefined, 'FAST');
        return true;
    } catch (error) {
        console.warn('No se pudo incorporar el logo al PDF:', error);
        return false;
    }
}

function generarPDFOrden(orden) {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const esAbierta = orden.tipoOrden === 'Abierta';
    agregarLogoEmpresaAlPDF(doc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(216, 27, 96);
    doc.text(esAbierta ? "ORDEN DE COMPRA ABIERTA" : "ORDEN DE COMPRA", 105, 20, null, null, "center");

    doc.setFontSize(12);
    doc.setTextColor(51, 51, 51);
    doc.text(`N° Formulario: ${orden.numFormulario || ''}`, 20, 32);
    doc.text(`N° Orden: ${orden.idOrden}`, 20, 40);
    doc.text(`Modalidad: ${orden.tipoOrden || 'Normal'}`, 20, 48);
    doc.text(`Fecha Emisión: ${orden.fechaEmision || new Date
