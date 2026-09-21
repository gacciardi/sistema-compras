let usuarioActual = null;
let masterPasswordActual = '1234';
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
    'Almacén / Depósito': [1, 5],
    'Calidad': [1, 3, 5],
    'Expedición': [1, 5],
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

    // Vincular evento de cambio para que ejecute la carga automáticamente al cambiar el año
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

        // Habilitar inicialmente la nueva P7 para Compras y Administración.
        // Luego puede administrarse normalmente desde la matriz del Master Panel.
        Object.keys(permisosPorSector).forEach(sector => {
            const sectorNormalizado = sector.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            if ((sectorNormalizado.includes('compras') || sectorNormalizado.includes('administracion')) && !permisosPorSector[sector].includes(7)) {
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
    const fechaAlta = document.getElementById('fecha-alta-proveedor').value;

    if (!numFormulario || !num || !nombre || !fechaAlta) {
        alert("⚠️ Por favor complete los campos obligatorios: N° de Formulario, N° de Proveedor / CUIT, Razón Social y Fecha de Alta.");
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
        tr.innerHTML = `
            <td><strong>${p.numFormulario || ''}</strong></td>
            <td><strong>${p.num}</strong></td>
            <td>${p.nombre}</td>
            <td>${p.fechaAlta ? p.fechaAlta.split('T')[0] : 'Sin fecha'}</td>
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
    document.getElementById('fecha-alta-proveedor').value = p.fechaAlta ? p.fechaAlta.split('T')[0] : '';

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
            infoCajaRec.innerHTML = `📦 <b>Recepciones evaluadas:</b> ${recepcionesProv.length} remito(s) encontrados para ${nombreProv}.`;
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
    
    // Asignar función al evento onchange del selector de proveedores
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

// Las evaluaciones anteriores a agosto de 2026 son registros históricos.
// En esos casos, los puntajes automáticos de las pestañas 4 y 5 son editables.
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

    // El bloqueo se aplica antes de buscar datos para que los campos tampoco
    // puedan editarse mientras aún no se seleccionó un proveedor.
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

    // Desde el 01/08/2026 se reemplaza cualquier valor guardado por el valor
    // vigente calculado desde las pestañas 4 y 5.
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

    // Debe ejecutarse al final para que el modo histórico prevalezca sobre
    // cualquier bloqueo automático aplicado durante la carga.
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
        li.innerHTML = `<strong>${cond}:</strong> ${pts} Puntos`;
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

    // Respaldo compatible con Excel si la biblioteca externa no estuviera disponible.
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

function generarPDFOrden(orden) {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const esAbierta = orden.tipoOrden === 'Abierta';
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(216, 27, 96);
    doc.text(esAbierta ? "ORDEN DE COMPRA ABIERTA" : "ORDEN DE COMPRA", 105, 20, null, null, "center");

    doc.setFontSize(12);
    doc.setTextColor(51, 51, 51);
    doc.text(`N° Formulario: ${orden.numFormulario || ''}`, 20, 32);
    doc.text(`N° Orden: ${orden.idOrden}`, 20, 40);
    doc.text(`Modalidad: ${orden.tipoOrden || 'Normal'}`, 20, 48);
    doc.text(`Fecha Emisión: ${orden.fechaEmision || new Date().toLocaleDateString()}`, 20, 56);

    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL PROVEEDOR:", 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text(`Proveedor: ${orden.provNombre} (${orden.provNum})`, 20, 78);

    doc.setFont("helvetica", "bold");
    doc.text("DETALLE DEL PEDIDO:", 20, 93);
    doc.setFont("helvetica", "normal");
    
    let currentY = 101;
    doc.text(`Producto/Requisito: ${orden.reqNombre} (${orden.reqNum})`, 20, currentY); currentY += 8;
    doc.text(`Cantidad ${esAbierta ? 'Estimada' : 'Solicitada'}: ${orden.cantidad}`, 20, currentY); currentY += 8;
    doc.text(`Valor Unitario: ${formatearImporteCompra(orden.valorUnitario)}`, 20, currentY); currentY += 8;
    doc.text(`Valor Total: ${formatearImporteCompra(orden.valorTotal)}`, 20, currentY); currentY += 8;
    doc.text(`Condición de Pago: ${orden.condicionPago || 'No especificada'}`, 20, currentY); currentY += 8;
    doc.text(`Fecha ${esAbierta ? 'Límite de Vigencia' : 'Requerida de Entrega'}: ${orden.fechaReq}`, 20, currentY); currentY += 10;

    if (orden.reqDetalle) {
        const lineasReq = doc.splitTextToSize(`Especificaciones Técnicas: ${orden.reqDetalle}`, 170);
        doc.text(lineasReq, 20, currentY);
        currentY += (lineasReq.length * 6) + 4;
    }
    if (orden.observaciones) {
        const lineasObs = doc.splitTextToSize(`Observaciones: ${orden.observaciones}`, 170);
        doc.text(lineasObs, 20, currentY);
        currentY += (lineasObs.length * 6) + 4;
    }

    doc.setDrawColor(216, 27, 96);
    doc.line(20, currentY + 5, 190, currentY + 5);
    doc.save(`Orden_Compra_${orden.idOrden}.pdf`);
}

// --- PESTAÑA 5: RECEPCIÓN ---
function actualizarSelectOrdenesPendientes() {
    const select = document.getElementById('select-recepcion-orden');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccione Orden Pendiente o Parcial --</option>';

    const entregasPorOrden = {};
    if (Array.isArray(recepciones)) {
        recepciones.forEach(r => {
            const aplicada = r.cantAplicada !== undefined ? r.cantAplicada : r.cantRecibida;
            entregasPorOrden[r.idOrden] = (entregasPorOrden[r.idOrden] || 0) + (parseFloat(aplicada) || 0);
        });
    }

    ordenesCompra.filter(oc => {
        const totalSolicitado = parseFloat(oc.cantidad) || 0;
        const totalEntregado = entregasPorOrden[oc.idOrden] || 0;
        return !String(oc.estado || '').startsWith('Recibido') && totalEntregado < totalSolicitado;
    }).sort((a, b) => a.provNombre.localeCompare(b.provNombre)).forEach(oc => {
        const saldo = (parseFloat(oc.cantidad) || 0) - (entregasPorOrden[oc.idOrden] || 0);
        const opt = document.createElement('option');
        opt.value = oc.idOrden;
        opt.innerText = `${oc.tipoOrden === 'Abierta' ? '[ABIERTA]' : '[NORMAL]'} ${oc.provNombre} - ${oc.reqNombre} (${oc.idOrden}) [Saldo: ${saldo}]`;
        select.appendChild(opt);
    });
}

function cargarDetalleOrdenPendiente() {
    const idOrden = document.getElementById('select-recepcion-orden').value;
    const orden = ordenesCompra.find(oc => oc.idOrden === idOrden);
    if (orden) {
        const entregasPrevias = recepciones.filter(r => r.idOrden === idOrden).reduce((acc, curr) => acc + (parseFloat(curr.cantAplicada ?? curr.cantRecibida) || 0), 0);
        const saldoRestante = Math.max(0, (parseFloat(orden.cantidad) || 0) - entregasPrevias);
        const campoCant = document.getElementById('rec-campo-2');
        if (campoCant) campoCant.value = saldoRestante;
    }
    actualizarAvisoCantidadRecepcion();
}

function actualizarAvisoCantidadRecepcion() {
    const aviso = document.getElementById('aviso-cantidad-recepcion');
    const selectOrden = document.getElementById('select-recepcion-orden');
    const campoCantidad = document.getElementById('rec-campo-2');
    const campoAplicada = document.getElementById('rec-cantidad-aplicada');
    const campoExcedente = document.getElementById('rec-cantidad-excedente');
    const grupoTratamiento = document.getElementById('grupo-tratamiento-excedente');
    if (!aviso || !selectOrden || !campoCantidad) return;

    const orden = ordenesCompra.find(oc => oc.idOrden === selectOrden.value);
    const cantidadRemito = parseFloat(campoCantidad.value);
    if (!orden || !Number.isFinite(cantidadRemito) || cantidadRemito <= 0) {
        aviso.style.display = 'none';
        aviso.innerHTML = '';
        if (campoAplicada) campoAplicada.value = '';
        if (campoExcedente) campoExcedente.value = '';
        if (grupoTratamiento) grupoTratamiento.style.display = 'none';
        return;
    }

    const solicitada = parseFloat(orden.cantidad) || 0;
    const recibidaAnteriormente = recepciones
        .filter(r => r.idOrden === orden.idOrden)
        .reduce((total, r) => total + (parseFloat(r.cantAplicada ?? r.cantRecibida) || 0), 0);
    const pendiente = Math.max(0, solicitada - recibidaAnteriormente);
    const aplicada = Math.min(cantidadRemito, pendiente);
    const excedente = Math.max(0, cantidadRemito - aplicada);
    const acumuladaAplicada = recibidaAnteriormente + aplicada;

    if (campoAplicada) campoAplicada.value = aplicada;
    if (campoExcedente) campoExcedente.value = excedente;
    if (grupoTratamiento) grupoTratamiento.style.display = excedente > 0 ? 'block' : 'none';

    aviso.style.display = 'block';
    if (excedente > 0) {
        aviso.style.background = '#f8d7da';
        aviso.style.color = '#842029';
        aviso.style.border = '1px solid #f5c2c7';
        aviso.innerHTML = `⚠️ Se aplicarán <strong>${aplicada}</strong> unidad(es) a la orden y <strong>${excedente}</strong> quedarán como excedente. Seleccione su tratamiento.`;
    } else if (acumuladaAplicada < solicitada) {
        aviso.style.background = '#cff4fc';
        aviso.style.color = '#055160';
        aviso.style.border = '1px solid #b6effb';
        aviso.innerHTML = `ℹ️ Recepción parcial. Aplicada a la orden: ${aplicada} · Acumulada: ${acumuladaAplicada} · Pendiente: ${solicitada - acumuladaAplicada}.`;
    } else {
        aviso.style.background = '#d1e7dd';
        aviso.style.color = '#0f5132';
        aviso.style.border = '1px solid #badbcc';
        aviso.innerHTML = `✅ Cantidad exacta. Se aplicarán ${aplicada} unidad(es) y la orden quedará completa.`;
    }
}

async function guardarRecepcion(e) {
    if (e) e.preventDefault();
    const idOrden = document.getElementById('select-recepcion-orden').value;
    if (!idOrden) return;

    const numFormulario = document.getElementById('num-formulario-rec').value.trim();
    const remito = document.getElementById('rec-campo-1').value.trim();
    const cantRecibida = parseFloat(document.getElementById('rec-campo-2').value) || 0;
    const empaque = document.getElementById('rec-campo-3').value;
    const calidad = document.getElementById('rec-campo-5').value;
    const obs = document.getElementById('rec-campo-6').value.trim();
    const tratamientoExcedente = document.getElementById('rec-tratamiento-excedente')?.value || 'Saldo a favor';
    const fechaRecepcion = document.getElementById('rec-fecha').value || new Date().toISOString().split('T')[0];
    
    const usuarioNombre = usuarioActual ? usuarioActual.nombre : 'admin';
    const orden = ordenesCompra.find(oc => oc.idOrden === idOrden);

    if (!orden) return alert('No se encontró la Orden de Compra seleccionada.');
    if (cantRecibida <= 0) return alert('La cantidad recibida debe ser mayor que cero.');

    const cantidadSolicitada = parseFloat(orden.cantidad) || 0;
    const entregasAnteriores = recepciones
        .filter(r => r.idOrden === idOrden)
        .reduce((acc, curr) => acc + (parseFloat(curr.cantAplicada ?? curr.cantRecibida) || 0), 0);
    const pendiente = Math.max(0, cantidadSolicitada - entregasAnteriores);
    const cantidadAplicada = Math.min(cantRecibida, pendiente);
    const excedente = Math.max(0, cantRecibida - cantidadAplicada);

    if (excedente > 0) {
        const continuar = confirm(
            `⚠️ Esta recepción contiene ${excedente} unidad(es) excedentes.\n\n` +
            `Aplicadas a la orden: ${cantidadAplicada}\n` +
            `Excedentes: ${excedente}\n` +
            `Tratamiento: ${tratamientoExcedente}\n\n` +
            '¿Desea registrar la recepción?'
        );
        if (!continuar) return;
    }

    const respuestaRecepcion = await fetch('/api/recepciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numFormulario, idOrden, remito, cantRecibida, tratamientoExcedente, empaque, tiempo: '', calidad, obs, fechaRecepcion, usuario: usuarioNombre })
    });

    if (!respuestaRecepcion.ok) {
        const error = await respuestaRecepcion.json().catch(() => ({}));
        return alert(`❌ No se pudo registrar la recepción: ${error.error || 'Error desconocido'}`);
    }

    document.getElementById('form-recepcion').reset();
    actualizarAvisoCantidadRecepcion();
    await cargarTodoDesdeServidor(true);
    actualizarSelectOrdenesPendientes();
}

function renderizarTablaRecepciones() {
    const tbody = document.getElementById('tabla-recepcion-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    recepciones.forEach(r => {
        const orden = ordenesCompra.find(oc => oc.idOrden === r.idOrden);
        const aplicada = parseFloat(r.cantAplicada ?? r.cantRecibida) || 0;
        const excedente = parseFloat(r.cantExcedente) || 0;
        const tratamiento = r.tratamientoExcedente || (excedente > 0 ? 'Sin definir' : 'Sin excedente');
        const estadoOrden = orden?.estado || (excedente > 0 ? 'Recibido con excedente' : 'Recibido');
        const estadoCantidad = excedente > 0
            ? '<span style="display:inline-block;background:#fff3cd;color:#856404;padding:4px 8px;border-radius:12px;font-weight:bold;">Excedente</span>'
            : `<span class="status-badge-received">${estadoOrden === 'Parcial' ? 'Parcial' : 'Exacto'}</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${r.numFormulario || ''}</strong></td>
            <td><strong>${r.idOrden}</strong></td>
            <td>${r.provNombre}</td>
            <td>${r.remito}</td>
            <td>${r.cantRecibida}</td>
            <td>${aplicada}</td>
            <td><strong>${excedente}</strong></td>
            <td>${tratamiento}</td>
            <td>${r.calidad}</td>
            <td>${r.fechaRecepcion ? r.fechaRecepcion.split('T')[0] : ''}</td>
            <td><strong>👤 ${r.usuario || 'admin'}</strong></td>
            <td>${r.obs || '-'}</td>
            <td>${estadoCantidad}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- PESTAÑA 6: USUARIOS ---
async function guardarUsuario(e) {
    if (e) e.preventDefault();
    const nombre = document.getElementById('usr-nombre').value.trim();
    const pass = document.getElementById('usr-pass').value;
    const sector = document.getElementById('usr-sector').value;
    const estado = document.getElementById('usr-estado').value;

    if (!nombre) return alert("Ingrese el nombre de usuario.");

    await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, pass, sector, estado })
    });

    document.getElementById('form-usuarios').reset();
    await cargarTodoDesdeServidor(true);
}

function renderizarTablaUsuarios() {
    const tbody = document.getElementById('tabla-usuarios-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay usuarios registrados</td></tr>';
        return;
    }
    usuarios.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${u.nombre}</strong></td>
            <td>${u.sector}</td>
            <td>${u.estado}</td>
            <td>
                <button class="btn-warning" onclick="editarUsuario('${u.nombre}')">Editar</button>
                <button class="btn-danger" onclick="eliminarUsuario('${u.nombre}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarUsuario(nombre) {
    const u = usuarios.find(usr => usr.nombre === nombre);
    if (!u) return;
    document.getElementById('usr-nombre').value = u.nombre;
    document.getElementById('usr-pass').value = u.pass || '';
    document.getElementById('usr-sector').value = u.sector;
    document.getElementById('usr-estado').value = u.estado;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarUsuario(nombre) {
    if (!confirm(`¿Eliminar usuario "${nombre}"?`)) return;
    await fetch(`/api/usuarios/${encodeURIComponent(nombre)}`, { method: 'DELETE' });
    await cargarTodoDesdeServidor(true);
}

// --- MASTER PANEL ---
function abrirModalMaster() { document.getElementById('modal-master').style.display = 'flex'; }
function cerrarModalMaster() { document.getElementById('modal-master').style.display = 'none'; }

function autenticarMaster() {
    const usr = document.getElementById('master-user').value;
    const pass = document.getElementById('master-pass').value;
    if (usr === 'admin' && pass === masterPasswordActual) {
        document.getElementById('master-auth').style.display = 'none';
        document.getElementById('master-panel').style.display = 'block';
        renderizarTablaSectoresMaster();
        renderizarMatrizPermisos();
        renderizarMatrizPermisosProveedores();
    } else {
        alert('Credenciales Master incorrectas.');
    }
}

function renderizarTablaSectoresMaster() {
    const container = document.getElementById('lista-sectores-master-container');
    if (!container) return;
    let html = `<table><thead><tr><th>Sector</th><th>Acciones</th></tr></thead><tbody>`;
    listaSectoresGlobal.forEach((sec, idx) => {
        html += `<tr>
            <td><input type="text" id="input-sector-name-${idx}" value="${sec}" style="width:100%; padding:4px;"></td>
            <td>
                <button class="btn-warning" onclick="guardarNombreSectorMaster(${idx})">Guardar</button>
                <button class="btn-danger" onclick="eliminarSectorMaster(${idx})">Eliminar</button>
            </td>
        </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

async function agregarNuevoSectorMaster() {
    const input = document.getElementById('nuevo-sector-nombre');
    const val = input.value.trim();
    if (!val || listaSectoresGlobal.includes(val)) return alert("Nombre inválido o ya existente.");
    listaSectoresGlobal.push(val);
    if (!permisosPorSector[val]) permisosPorSector[val] = [1];
    await guardarSectoresBaseDatos();
    input.value = '';
    renderizarTablaSectoresMaster();
    renderizarMatrizPermisos();
    actualizarSelectSectoresUsuarios();
}

async function guardarNombreSectorMaster(index) {
    const input = document.getElementById(`input-sector-name-${index}`);
    const nuevo = input.value.trim();
    const viejo = listaSectoresGlobal[index];
    if (!nuevo) return;
    listaSectoresGlobal[index] = nuevo;
    if (permisosPorSector[viejo]) {
        permisosPorSector[nuevo] = permisosPorSector[viejo];
        delete permisosPorSector[viejo];
    }
    await guardarSectoresBaseDatos();
    renderizarTablaSectoresMaster();
    renderizarMatrizPermisos();
    actualizarSelectSectoresUsuarios();
}

async function eliminarSectorMaster(index) {
    if (listaSectoresGlobal.length <= 1) return alert("Debe haber al menos un sector.");
    const sec = listaSectoresGlobal[index];
    if (!confirm(`¿Eliminar sector "${sec}"?`)) return;
    listaSectoresGlobal.splice(index, 1);
    delete permisosPorSector[sec];
    await guardarSectoresBaseDatos();
    renderizarTablaSectoresMaster();
    renderizarMatrizPermisos();
    actualizarSelectSectoresUsuarios();
}

async function guardarSectoresBaseDatos() {
    await fetch('/api/configuraciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: 'lista_sectores', valor: listaSectoresGlobal }) });
    await fetch('/api/configuraciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: 'permisos_sectores', valor: permisosPorSector }) });
}

function renderizarMatrizPermisosProveedores() {
    const container = document.getElementById('matriz-permisos-proveedores-container');
    if (!container) return;
    if (!usuarios.length || !proveedores.length) {
        container.innerHTML = '<p style="color:#777;">Registre usuarios y proveedores primero.</p>';
        return;
    }
    let html = `<table>
        <thead>
            <tr>
                <th>Usuario</th>
                <th>Contraseña</th>
                <th>Acción</th>`;
    
    proveedores.forEach(p => html += `<th>${p.nombre}<br><small>(${p.num})</small></th>`);
    html += '</tr></thead><tbody>';

    usuarios.forEach((u, idx) => {
        html += `<tr>
            <td><strong>${u.nombre}</strong></td>
            <td>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <input type="password" id="master-pass-input-${idx}" value="${u.pass || ''}" style="width: 100px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
                    <button type="button" class="btn-warning" onclick="togglePasswordMaster(${idx})" style="padding: 2px 6px; font-size: 0.85em;" title="Mostrar/Ocultar">👁️</button>
                </div>
            </td>
            <td>
                <button type="button" class="btn-warning" onclick="guardarPasswordUsuarioMaster('${u.nombre}', ${idx})" style="padding: 2px 6px; font-size: 0.85em;">💾 Guardar</button>
            </td>`;
        
        const asignados = permisosProveedoresPorUsuario[u.nombre] || [];
        proveedores.forEach(p => {
            html += `<td style="text-align:center;"><input type="checkbox" data-usuario-prov="${u.nombre}" data-prov-num="${p.num}" ${asignados.includes(p.num) ? 'checked' : ''}></td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function togglePasswordMaster(index) {
    const input = document.getElementById(`master-pass-input-${index}`);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
}

async function guardarPasswordUsuarioMaster(nombreUsuario, index) {
    const input = document.getElementById(`master-pass-input-${index}`);
    if (!input) return;
    
    const nuevaPass = input.value.trim();
    const usrObj = usuarios.find(u => u.nombre === nombreUsuario);
    
    if (!usrObj) return alert("Usuario no encontrado.");
    if (!nuevaPass) return alert("La contraseña no puede estar vacía.");

    usrObj.pass = nuevaPass;

    try {
        await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(usrObj)
        });
        alert(`🔐 Contraseña de "${nombreUsuario}" actualizada con éxito.`);
        await cargarTodoDesdeServidor(true);
    } catch (e) {
        console.error("Error al actualizar la contraseña:", e);
        alert("⚠️ Hubo un error al guardar la contraseña.");
    }
}

async function guardarPermisosProveedoresMaster() {
    const nuevos = {};
    document.querySelectorAll('#matriz-permisos-proveedores-container input[type="checkbox"]').forEach(chk => {
        if (chk.checked) {
            const usr = chk.dataset.usuarioProv;
            const prov = chk.dataset.provNum;
            if (!nuevos[usr]) nuevos[usr] = [];
            nuevos[usr].push(prov);
        }
    });
    permisosProveedoresPorUsuario = nuevos;
    await fetch('/api/configuraciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: 'permisos_proveedores_usuarios', valor: permisosProveedoresPorUsuario }) });
    actualizarSelectsCompras();
    alert("✅ Permisos guardados.");
}

function renderizarMatrizPermisos() {
    const container = document.getElementById('matriz-permisos-container');
    if (!container) return;
    const pestañas = [{ id: 1, nombre: 'P1' }, { id: 2, nombre: 'P2' }, { id: 3, nombre: 'P3' }, { id: 4, nombre: 'P4' }, { id: 5, nombre: 'P5' }, { id: 6, nombre: 'P6' }, { id: 7, nombre: 'P7' }];
    let html = '<table><thead><tr><th>Sector</th>';
    pestañas.forEach(p => html += `<th>${p.nombre}</th>`);
    html += '</tr></thead><tbody>';
    listaSectoresGlobal.forEach(sec => {
        html += `<tr><td><strong>${sec}</strong></td>`;
        const permitidas = permisosPorSector[sec] || [];
        pestañas.forEach(p => {
            html += `<td style="text-align:center;"><input type="checkbox" data-sector="${sec}" data-pestaña="${p.id}" ${permitidas.includes(p.id) ? 'checked' : ''}></td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function guardarPermisosSectores() {
    const nuevos = {};
    listaSectoresGlobal.forEach(s => nuevos[s] = []);
    document.querySelectorAll('#matriz-permisos-container input[type="checkbox"]').forEach(chk => {
        if (chk.checked) {
            const sec = chk.dataset.sector;
            const pId = parseInt(chk.dataset.pestaña);
            if (sec && !isNaN(pId)) {
                if (!nuevos[sec].includes(pId)) nuevos[sec].push(pId);
            }
        }
    });
    permisosPorSector = nuevos;
    await guardarSectoresBaseDatos();
    if (usuarioActual) aplicarPermisosUsuario(usuarioActual.sector);
    alert("✅ Permisos actualizados.");
}

async function guardarNuevaPasswordMaster() {
    const np = document.getElementById('master-new-pass').value.trim();
    if (!np) return;
    await fetch('/api/configuraciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: 'master_password', valor: np }) });
    masterPasswordActual = np;
    document.getElementById('master-new-pass').value = '';
    alert("🔐 Contraseña Master cambiada.");
}

async function guardarTituloSistema() {
    const titulo = document.getElementById('master-system-title').value.trim();
    if (!titulo) return;
    await fetch('/api/configuraciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: 'sys_title', valor: titulo }) });
    document.getElementById('header-system-title').innerText = titulo;
    document.getElementById('login-title').innerText = titulo;
    document.getElementById('page-title').innerText = titulo;
}

async function cambiarColorBg(color, guardar = true) {
    document.documentElement.style.setProperty('--bg-primary', color);
    document.body.style.backgroundColor = color;
    if (guardar) {
        await fetch('/api/configuraciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: 'sys_bg_color', valor: color }) });
    }
}

function subirLogoDesdePC(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => cambiarLogo(e.target.result, true);
        reader.readAsDataURL(file);
    }
}

async function cambiarLogo(src, guardar = true) {
    if (!src) return;
    const l1 = document.getElementById('app-logo'), l2 = document.getElementById('login-logo');
    if (l1) { l1.src = src; l1.style.display = 'block'; }
    if (l2) { l2.src = src; l2.style.display = 'inline-block'; }
    if (guardar) {
        await fetch('/api/configuraciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: 'sys_logo', valor: src }) });
    }
}

async function limpiarBaseDeDatosMaster() {
    if (!confirm("⚠️ ¿Vaciar Evaluaciones, Órdenes y Recepciones?")) return;
    try {
        const res = await fetch('/api/master/limpiar-bd', { method: 'POST' });
        if (res.ok) {
            alert("✅ Base de datos limpia.");
            await cargarTodoDesdeServidor(true);
        }
    } catch (e) {
        console.error(e);
    }
}

// ==========================================
// FUNCIONES DE GRÁFICOS PARA PESTAÑA 3
// ==========================================
let radarChartInstance = null;
let pieChartInstance = null;

function renderizarGraficosPestaña3() {
    renderizarGraficoRadar();
    renderizarGraficoPie();
}

// 1. Gráfico combinado: seis criterios por año + tendencia del promedio general
function renderizarGraficoRadar() {
    const ctx = document.getElementById('chart-radar-proveedor');
    if (!ctx) return;

    if (radarChartInstance) radarChartInstance.destroy();

    const provNum = document.getElementById('select-prov-estadistica')?.value;
    const provObj = proveedores.find(p => String(p.num) === String(provNum));
    const resumen = document.getElementById('resumen-tendencia-proveedor');

    let historial = estadisticas
        .filter(e => String(e.provNum) === String(provNum))
        .map(e => ({ ...e, anio: String(e.anio) }));

    // Incorporar al gráfico la evaluación visible en el formulario, aunque
    // todavía no se haya guardado, y reemplazar con ella el mismo año histórico.
    const anioFormulario = document.getElementById('select-anio-estadistica')?.value;
    const puntajesFormulario = [];
    let hayPuntajesFormulario = false;

    for (let i = 1; i <= 6; i++) {
        const valorTexto = document.getElementById(`stat-val-${i}`)?.value;
        if (valorTexto !== '' && valorTexto !== undefined) {
            const valorNumero = Number(valorTexto);
            puntajesFormulario.push(Number.isNaN(valorNumero) ? null : valorNumero);
            if (!Number.isNaN(valorNumero)) hayPuntajesFormulario = true;
        } else {
            puntajesFormulario.push(null);
        }
    }

    if (provNum && anioFormulario && hayPuntajesFormulario) {
        const valoresValidos = puntajesFormulario.filter(v => v !== null);
        const promedioFormulario = valoresValidos.length
            ? Math.round(valoresValidos.reduce((suma, valor) => suma + valor, 0) / valoresValidos.length)
            : 0;

        const evaluacionFormulario = {
            provNum: String(provNum),
            anio: String(anioFormulario),
            puntajes: puntajesFormulario,
            promedio: promedioFormulario
        };

        const indiceMismoAnio = historial.findIndex(e => String(e.anio) === String(anioFormulario));
        if (indiceMismoAnio >= 0) historial[indiceMismoAnio] = evaluacionFormulario;
        else historial.push(evaluacionFormulario);
    }

    historial.sort((a, b) => Number(a.anio) - Number(b.anio));

    const anios = historial.map(e => e.anio);
    const promedios = historial.map(e => Number(e.promedio) || 0);
    const criterios = [
        { nombre: 'Cumplimiento Entrega', indice: 0, color: '#1565C0' },
        { nombre: 'Calidad', indice: 1, color: '#43A047' },
        { nombre: 'Condición Pago', indice: 2, color: '#FB8C00' },
        { nombre: 'Plazo Entrega', indice: 3, color: '#8E24AA' },
        { nombre: 'Atención', indice: 4, color: '#00ACC1' },
        { nombre: 'Respuesta Reclamos', indice: 5, color: '#E53935' }
    ];

    const datasetsCriterios = criterios.map(criterio => ({
        type: 'bar',
        label: criterio.nombre,
        data: historial.map(e => {
            const valor = e.puntajes?.[criterio.indice];
            return valor === null || valor === undefined || valor === '' ? null : Number(valor);
        }),
        backgroundColor: criterio.color,
        borderColor: criterio.color,
        borderWidth: 1,
        borderRadius: 3,
        order: 2
    }));

    const datasetPromedio = {
        type: 'line',
        label: 'Promedio general',
        data: promedios,
        borderColor: '#212121',
        backgroundColor: '#212121',
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#212121',
        pointBorderWidth: 2,
        pointRadius: 5,
        borderWidth: 3,
        tension: 0.25,
        fill: false,
        order: 1
    };

    if (resumen) {
        if (!provNum) {
            resumen.innerText = 'Seleccione un proveedor para visualizar su evolución histórica.';
            resumen.style.color = '#374151';
        } else if (historial.length === 0) {
            resumen.innerText = `${provObj?.nombre || provNum}: todavía no tiene evaluaciones guardadas.`;
            resumen.style.color = '#374151';
        } else if (historial.length === 1) {
            resumen.innerText = `${provObj?.nombre || provNum}: se necesita más de un año para calcular una tendencia.`;
            resumen.style.color = '#1976D2';
        } else {
            const variacion = promedios[promedios.length - 1] - promedios[0];
            const signo = variacion > 0 ? '+' : '';
            const tendencia = variacion > 0 ? '↗ Crecimiento' : variacion < 0 ? '↘ Decrecimiento' : '→ Sin variación';
            resumen.innerText = `${tendencia}: ${signo}${variacion} puntos entre ${anios[0]} y ${anios[anios.length - 1]}.`;
            resumen.style.color = variacion > 0 ? '#2E7D32' : variacion < 0 ? '#C62828' : '#E65100';
        }
    }

    radarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: anios,
            datasets: [...datasetsCriterios, datasetPromedio]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { boxWidth: 14, padding: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: context => `${context.dataset.label}: ${context.parsed.y} puntos`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Promedio (0-100)' }
                },
                x: { title: { display: true, text: 'Año de evaluación' } }
            }
        }
    });
}

function actualizarGraficoRadar() {
    renderizarGraficoRadar();
}

// 2. Gráfico Donut de Clasificación % (A, B, C, D)
function renderizarGraficoPie() {
    const ctx = document.getElementById('chart-pie-clasificacion');
    if (!ctx) return;

    if (pieChartInstance) pieChartInstance.destroy();

    let ca = 0, cb = 0, cc = 0, cd = 0;

    if (Array.isArray(estadisticas)) {
        estadisticas.forEach(e => {
            if (e.clase === 'Clase A') ca++;
            else if (e.clase === 'Clase B') cb++;
            else if (e.clase === 'Clase C') cc++;
            else cd++;
        });
    }

    const total = (ca + cb + cc + cd) || 1;

    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Clase A', 'Clase B', 'Clase C', 'Clase D'],
            datasets: [{
                data: [
                    Math.round((ca / total) * 100),
                    Math.round((cb / total) * 100),
                    Math.round((cc / total) * 100),
                    Math.round((cd / total) * 100)
                ],
                backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#F44336']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '55%'
        }
    });
}

function formatearFechaImplementacion(fecha) {
    if (!fecha) return 'No definida';
    const partes = String(fecha).split('T')[0].split('-');
    if (partes.length !== 3) return fecha;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function aplicarFechaImplementacion(fecha) {
    fechaImplementacionActual = fecha ? String(fecha).split('T')[0] : '';

    const visual = document.getElementById('implementation-date-display');
    if (visual) visual.innerText = formatearFechaImplementacion(fechaImplementacionActual);

    const input = document.getElementById('master-implementation-date');
    const botonGuardar = document.getElementById('btn-save-implementation-date');
    const botonEditar = document.getElementById('btn-edit-implementation-date');
    const hayFecha = Boolean(fechaImplementacionActual);

    if (input) {
        input.value = fechaImplementacionActual;
        input.disabled = hayFecha;
    }
    if (botonGuardar) botonGuardar.style.display = hayFecha ? 'none' : 'inline-block';
    if (botonEditar) botonEditar.style.display = hayFecha ? 'inline-block' : 'none';
}

function habilitarEdicionFechaImplementacion() {
    if (!confirm('La fecha de implementación normalmente no debe modificarse. ¿Desea habilitar su edición?')) return;
    const input = document.getElementById('master-implementation-date');
    const botonGuardar = document.getElementById('btn-save-implementation-date');
    const botonEditar = document.getElementById('btn-edit-implementation-date');
    if (input) {
        input.disabled = false;
        input.focus();
    }
    if (botonGuardar) botonGuardar.style.display = 'inline-block';
    if (botonEditar) botonEditar.style.display = 'none';
}

async function guardarFechaImplementacion() {
    const input = document.getElementById('master-implementation-date');
    const fecha = input ? input.value : '';
    if (!fecha) return alert('Seleccione la Fecha de implementación.');

    try {
        const respuesta = await fetch('/api/configuraciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clave: 'fecha_implementacion_sistema', valor: fecha })
        });
        if (!respuesta.ok) throw new Error('No se pudo guardar la fecha de implementación.');
        aplicarFechaImplementacion(fecha);
        alert('✅ Fecha de implementación guardada y bloqueada.');
    } catch (error) {
        console.error(error);
        alert('❌ No se pudo guardar la Fecha de implementación.');
    }
}
