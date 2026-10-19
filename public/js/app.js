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

// INICIO DE SESIÓN DIRECTO (SIN REQUERIR CONTRASEÑA)
async function iniciarSesionUsuario(e) {
    if (e) e.preventDefault();

    const usrInput = document.getElementById('login-user');
    if (!usrInput) return;

    const usrName = usrInput.value.trim();

    if (!usrName) {
        alert("Por favor ingrese o seleccione un nombre de usuario.");
        return;
    }

    // 1. Acceso directo como Admin
    if (usrName.toLowerCase() === 'admin') {
        usuarioActual = { nombre: 'admin', sector: 'Administración', estado: 'Activo' };
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        document.getElementById('user-session-info').innerText = `👤 admin (Administración)`;
        aplicarPermisosUsuario('Administración');
        return;
    }

    // 2. Cargar lista de usuarios si no está en memoria
    if (!usuarios || usuarios.length === 0) {
        await cargarTodoDesdeServidor(false);
    }

    // 3. Buscar usuario solo por nombre (sin validar clave)
    const usrObj = usuarios.find(u => u.nombre.trim().toLowerCase() === usrName.toLowerCase());

    if (!usrObj) {
        alert(`El usuario "${usrName}" no existe en el sistema.`);
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
            infoCajaOC.innerHTML = `📋 <b>Órdenes
