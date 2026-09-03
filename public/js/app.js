let usuarioActual = null;
let masterPasswordActual = '1234';

// Lista dinámica de Sectores / Áreas de la empresa
let listaSectoresGlobal = [
    'Compras',
    'Almacén / Depósito',
    'Calidad',
    'Expedición',
    'Administración'
];

// Matriz dinámica de Condición de Pago -> Puntaje Asignado (0 a 100)
let tablaCondicionPagoPuntos = {
    'Prepago': 10,
    'Contado': 35,
    'Cuenta corriente': 70,
    'Plazos': 95
};

let opcionesCondicionPago = Object.keys(tablaCondicionPagoPuntos);

let permisosPorSector = {
    'Compras': [1, 2, 3, 4, 5],
    'Almacén / Depósito': [1, 5],
    'Calidad': [1, 3, 5],
    'Expedición': [1, 5],
    'Administración': [1, 2, 3, 4, 5, 6]
};

// Permisos individuales de Proveedores por Usuario
let permisosProveedoresPorUsuario = {};

document.addEventListener('DOMContentLoaded', async () => {
    await cargarTodoDesdeServidor();

    const formUsuarios = document.getElementById('form-usuarios');
    if (formUsuarios) {
        formUsuarios.addEventListener('submit', guardarUsuario);
    }

    setInterval(async () => {
        await cargarTodoDesdeServidor(false);
    }, 5000);
});

// LOGIN Y CONTROL DE ACCESO
async function iniciarSesionUsuario(e) {
    if (e) e.preventDefault();
    const usrInput = document.getElementById('login-user');
    const passInput = document.getElementById('login-pass');

    if (!usrInput || !passInput) return;

    const usrName = usrInput.value.trim();
    const pass = passInput.value;

    if (usrName.toLowerCase() === 'admin' && pass === masterPasswordActual) {
        usuarioActual = { nombre: 'admin', sector: 'Administración', estado: 'Activo' };
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        document.getElementById('user-session-info').innerText = `👤 admin (Administración)`;
        aplicarPermisosUsuario('Administración');
        return;
    }

    const usrObj = usuarios.find(u => u.nombre.toLowerCase() === usrName.toLowerCase() && u.pass === pass);

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

// CORRECCIÓN DE APLICACIÓN DE PERMISOS FLEXIBLE Y TOLERANTE A TILDES / NOMBRES LARGOS
function aplicarPermisosUsuario(sectorUsuario) {
    if (!sectorUsuario) return;

    // Normalizar texto (quitar tildes, espacios extras y pasar a minúsculas)
    const normalizar = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

    const sectorBuscadoNorm = normalizar(sectorUsuario);
    let pestañasPermitidas = null;

    // Buscar coincidencia exacta o parcial en las claves de permisosPorSector
    for (const secKey of Object.keys(permisosPorSector)) {
        const secKeyNorm = normalizar(secKey);
        if (secKeyNorm === sectorBuscadoNorm || secKeyNorm.includes(sectorBuscadoNorm) || sectorBuscadoNorm.includes(secKeyNorm)) {
            pestañasPermitidas = permisosPorSector[secKey];
            break;
        }
    }

    // Si no encuentra coincidencia, asigna por defecto la pestaña 1
    if (!pestañasPermitidas) {
        pestañasPermitidas = [1];
    }

    const mapaPestañas = {
        1: { id: 'tab-requisitos', btn: 'btn-tab-requisitos' },
        2: { id: 'tab-proveedores', btn: 'btn-tab-proveedores' },
        3: { id: 'tab-estadisticas', btn: 'btn-tab-estadisticas' },
        4: { id: 'tab-compras', btn: 'btn-tab-compras' },
        5: { id: 'tab-recepcion', btn: 'btn-tab-recepcion' },
        6: { id: 'tab-usuarios', btn: 'btn-tab-usuarios' }
    };

    let primeraDisponible = null;

    for (let num = 1; num <= 6; num++) {
        const p = mapaPestañas[num];
        const btnEl = document.getElementById(p.btn);
        
        if (pestañasPermitidas.includes(num)) {
            if (btnEl) btnEl.style.display = 'inline-block';
            if (!primeraDisponible) primeraDisponible = p.id;
        } else {
            if (btnEl) btnEl.style.display = 'none';
        }
    }

    if (primeraDisponible) {
        showTab(primeraDisponible);
    }
}

function showTab(tabId) {
    const sections = document.querySelectorAll('.tab-content');
    sections.forEach(section => section.classList.remove('active'));

    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(button => button.classList.remove('active'));

    const activeSection = document.getElementById(tabId);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    const activeButton = Array.from(buttons).find(btn => 
        btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId)
    );
    if (activeButton) {
        activeButton.classList.add('active');
    }

    if (tabId === 'tab-proveedores') {
        cargarNombresCriteriosProveedores();
    }
    if (tabId === 'tab-estadisticas') {
        actualizarSelectProveedoresEstadisticas();
    }
    if (tabId === 'tab-compras') {
        actualizarSelectsCompras();
    }
    if (tabId === 'tab-recepcion') {
        actualizarSelectOrdenesPendientes();
    }
    if (tabId === 'tab-usuarios') {
        actualizarSelectSectoresUsuarios();
    }
}

async function guardarNumeroFormularioDirecto(claveConfig, idInput) {
    const el = document.getElementById(idInput);
    if (!el) return;
    const valor = el.value.trim();
    if (!valor) {
        alert("Por favor ingrese un N° de Formulario para guardar.");
        return;
    }

    try {
        const res = await fetch('/api/configuraciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clave: claveConfig, valor: valor })
        });

        if (res.ok) {
            alert(`✅ N° de Formulario "${valor}" guardado correctamente.`);
        } else {
            alert("❌ Ocurrió un error al guardar en la base de datos.");
        }
    } catch (e) {
        console.error(e);
        alert("❌ Error de conexión al servidor.");
    }
}

async function cargarTodoDesdeServidor(renderCompleto = true) {
    try {
        const [resReq, resProv, resStat, resComp, resRec, resUsr, resConfig] = await Promise.all([
            fetch('/api/requisitos'),
            fetch('/api/proveedores'),
            fetch('/api/estadisticas'),
            fetch('/api/compras'),
            fetch('/api/recepciones'),
            fetch('/api/usuarios'),
            fetch('/api/configuraciones')
        ]);

        requisitos = await resReq.json();
        proveedores = await resProv.json();
        estadisticas = await resStat.json();
        ordenesCompra = await resComp.json();
        recepciones = await resRec.json();
        usuarios = await resUsr.json();

        const config = await resConfig.json();
        const activeEl = document.activeElement;

        if (config.num_form_req && activeEl !== document.getElementById('num-formulario-req')) {
            const el = document.getElementById('num-formulario-req');
            if (el) el.value = config.num_form_req;
        }
        if (config.num_form_prov && activeEl !== document.getElementById('num-formulario-prov')) {
            const el = document.getElementById('num-formulario-prov');
            if (el) el.value = config.num_form_prov;
        }
        if (config.num_form_stat && activeEl !== document.getElementById('num-formulario')) {
            const el = document.getElementById('num-formulario');
            if (el) el.value = config.num_form_stat;
        }
        if (config.num_form_comp && activeEl !== document.getElementById('num-formulario-comp')) {
            const el = document.getElementById('num-formulario-comp');
            if (el) el.value = config.num_form_comp;
        }
        if (config.num_form_rec && activeEl !== document.getElementById('num-formulario-rec')) {
            const el = document.getElementById('num-formulario-rec');
            if (el) el.value = config.num_form_rec;
        }

        if (config.master_password) masterPasswordActual = config.master_password;

        if (config.lista_sectores && Array.isArray(config.lista_sectores)) {
            listaSectoresGlobal = config.lista_sectores;
        }

        if (config.tabla_condicion_pago_puntos) {
            tablaCondicionPagoPuntos = config.tabla_condicion_pago_puntos;
            opcionesCondicionPago = Object.keys(tablaCondicionPagoPuntos);
        }

        if (config.permisos_proveedores_usuarios) {
            permisosProveedoresPorUsuario = config.permisos_proveedores_usuarios;
        }

        if (config.crit_prov_labels && Array.isArray(config.crit_prov_labels)) {
            nombresCriteriosProveedores = config.crit_prov_labels;
        }
        if (config.crit_stat_labels && Array.isArray(config.crit_stat_labels)) {
            nombresCriteriosEstadisticas = config.crit_stat_labels;
        }
        if (config.permisos_sectores) {
            permisosPorSector = config.permisos_sectores;
        }

        if (config.sys_title) {
            const el1 = document.getElementById('header-system-title');
            const el2 = document.getElementById('login-title');
            const el3 = document.getElementById('page-title');
            const el4 = document.getElementById('master-system-title');

            if (el1) el1.innerText = config.sys_title;
            if (el2) el2.innerText = config.sys_title;
            if (el3) el3.innerText = config.sys_title;
            if (el4) el4.value = config.sys_title;
        }

        if (config.sys_bg_color) cambiarColorBg(config.sys_bg_color, false);
        if (config.sys_logo) cambiarLogo(config.sys_logo, false);

        if (renderCompleto) {
            actualizarSelectSectoresUsuarios();
            cargarNombresCriteriosProveedores();
            cargarNombresCriteriosEstadisticas();

            renderizarTablaRequisitos();
            renderizarTablaProveedores();
            renderizarTablaEstadisticas();
            renderizarTablaCompras();
            renderizarTablaRecepciones();
            renderizarTablaUsuarios();
        }
    } catch (e) {
        console.error("Error al cargar datos:", e);
    }
}

function actualizarSelectSectoresUsuarios() {
    const selects = [
        document.getElementById('usr-sector'),
        document.getElementById('master-usr-sector')
    ];

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
        if (valActual && listaSectoresGlobal.includes(valActual)) {
            select.value = valActual;
        }
    });
}

// --- PESTAÑA 1 ---
let requisitos = [];

async function guardarRequisito(e) {
    if (e) e.preventDefault();
    const numFormulario = document.getElementById('num-formulario-req').value.trim();
    const num = document.getElementById('num-requisito').value.trim();
    const nombre = document.getElementById('nombre-requisito').value.trim();
    const fechaEl = document.getElementById('fecha-requisito');
    const fecha = fechaEl && fechaEl.value ? fechaEl.value : new Date().toISOString().split('T')[0];
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
        const fReq = req.fecha ? req.fecha.split('T')[0] : '';
        tr.innerHTML = `
            <td><strong>${req.numFormulario || ''}</strong></td>
            <td><strong>${req.num}</strong></td>
            <td>${req.nombre}</td>
            <td>${fReq}</td>
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
    if (req.fecha) {
        document.getElementById('fecha-requisito').value = req.fecha.split('T')[0];
    }
    document.getElementById('detalle-requisito').value = req.detalle || '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarRequisito(num) {
    if (!confirm(`¿Estás seguro de eliminar el requisito "${num}"?`)) return;
    await fetch(`/api/requisitos/${num}`, { method: 'DELETE' });
    await cargarTodoDesdeServidor(true);
}


// --- PESTAÑA 2 ---
let proveedores = [];
let nombresCriteriosProveedores = [
    "Cumplimiento de Entrega",
    "Calidad Insumos/Servicios",
    "Condicion de Pago",
    "Plazo de Entrega",
    "Atencion",
    "Respuesta a Reclamos"
];

async function guardarNombresCriteriosProveedores() {
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`crit-nombre-${i}`);
        if (el && el.value.trim()) {
            nombresCriteriosProveedores[i - 1] = el.value.trim();
        }
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
        if (el) el.value = nombresCriteriosProveedores[i - 1] || `Criterio ${i}`;
    }
}

async function guardarProveedor(e) {
    if (e) e.preventDefault();

    await guardarNombresCriteriosProveedores();

    const numFormulario = document.getElementById('num-formulario-prov').value.trim();
    const num = document.getElementById('num-proveedor').value.trim();
    const nombre = document.getElementById('nombre-proveedor').value.trim();

    const criterios = [];
    for (let i = 1; i <= 6; i++) {
        criterios.push({
            nombre: document.getElementById(`crit-nombre-${i}`)?.value.trim() || `Criterio ${i}`,
            cantidad: parseFloat(document.getElementById(`crit-cant-${i}`)?.value) || 0
        });
    }

    await fetch('/api/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numFormulario, num, nombre, criterios })
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

    if (p.criterios && Array.isArray(p.criterios)) {
        p.criterios.forEach((crit, index) => {
            const i = index + 1;
            const lbl = document.getElementById(`crit-nombre-${i}`);
            const val = document.getElementById(`crit-cant-${i}`);
            if (lbl) lbl.value = crit.nombre;
            if (val) val.value = crit.cantidad;
        });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarProveedor(num) {
    await fetch(`/api/proveedores/${num}`, { method: 'DELETE' });
    await cargarTodoDesdeServidor(true);
}


// --- PESTAÑA 3 ---
let estadisticas = [];
let nombresCriteriosEstadisticas = [
    "Cumplimiento de Entrega (Auto)",
    "Calidad Insumos/Servicios",
    "Condicion de Pago (OC)",
    "Plazo de Entrega (OC)",
    "Atencion",
    "Respuesta a Reclamos"
];
let chartEvolucionInstance = null;
let chartTortaInstance = null;
let chartPerfProvInstance = null;

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

        const fechaFormateada = `${dia}/${mes}/${anio}`;
        if (badgeFechaCalc) badgeFechaCalc.innerText = fechaFormateada;
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
    if (recepcionesProv.length === 0) return null;

    let sumaPuntajes = 0;
    let contador = 0;

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
        if (el && el.value.trim()) {
            nombresCriteriosEstadisticas[i - 1] = el.value.trim();
        }
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

    const provsOrdenados = [...proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre));

    provsOrdenados.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.num;
        opt.innerText = `${p.nombre} (${p.num})`;
        select.appendChild(opt);
    });

    cargarNombresCriteriosEstadisticas();
    renderizarTablaEstadisticas();
}

function cargarCalificacionExistente() {
    const provSelect = document.getElementById('select-prov-estadistica');
    const anioSelect = document.getElementById('select-anio-estadistica');
    if (!provSelect || !anioSelect) return;

    const provNum = provSelect.value;
    const anio = anioSelect.value;
    
    const registro = estadisticas.find(e => e.provNum === provNum && e.anio === anio);

    if (registro) {
        if (registro.numFormulario) {
            document.getElementById('num-formulario').value = registro.numFormulario;
        }

        if (registro.fechaEval) {
            document.getElementById('fecha-evaluacion').value = registro.fechaEval.split('T')[0];
        }
        document.getElementById('dias-proxima-eval').value = registro.diasPlazo || '';
        calcularFechaProximaDesdeDias();

        if (registro.puntajes) {
            for (let i = 1; i <= 6; i++) {
                document.getElementById(`stat-val-${i}`).value = registro.puntajes[i - 1] || '';
            }
        }
    } else {
        document.getElementById('fecha-evaluacion').value = '';
        document.getElementById('dias-proxima-eval').value = '';
        document.getElementById('fecha-calculada-prox').innerText = '-- / -- / ----';

        for (let i = 1; i <= 6; i++) {
            document.getElementById(`stat-val-${i}`).value = '';
        }
    }

    if (provNum) {
        const puntajeCumplimiento = calcularPuntajeTiemposReales(provNum, anio);
        if (puntajeCumplimiento !== null) {
            document.getElementById('stat-val-1').value = puntajeCumplimiento;
        }

        const promediosOC = calcularPromediosPreEvaluacionOC(provNum, anio);
        if (promediosOC.pago !== null) {
            document.getElementById('stat-val-3').value = promediosOC.pago;
        }
        if (promediosOC.plazo !== null) {
            document.getElementById('stat-val-4').value = promediosOC.plazo;
        }
    }

    calcularPuntajeClase();
}

function calcularPuntajeClase() {
    let suma = 0;
    let contador = 0;

    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`stat-val-${i}`);
        if (el) {
            const val = parseFloat(el.value);
            if (!isNaN(val)) {
                suma += val;
                contador++;
            }
        }
    }

    const promedio = contador > 0 ? Math.round(suma / contador) : 0;
    const promEl = document.getElementById('stat-promedio');
    if (promEl) promEl.innerText = `${promedio} pts`;

    const badgeClase = document.getElementById('stat-clase');
    let clase = 'Clase D';
    let claseCSS = 'badge-d';

    if (promedio >= 91) {
        clase = 'Clase A';
        claseCSS = 'badge-a';
    } else if (promedio >= 76) {
        clase = 'Clase B';
        claseCSS = 'badge-b';
    } else if (promedio >= 61) {
        clase = 'Clase C';
        claseCSS = 'badge-c';
    }

    if (badgeClase) {
        badgeClase.innerText = clase;
        badgeClase.className = `clase-badge ${claseCSS}`;
    }

    return { promedio, clase, claseCSS };
}

async function calcularEstadistica(e) {
    if (e) e.preventDefault();

    const provNum = document.getElementById('select-prov-estadistica').value;
    const anio = document.getElementById('select-anio-estadistica').value;
    if (!provNum || !anio) return;

    await guardarNombresCriteriosEstadisticas();

    const numFormulario = document.getElementById('num-formulario').value.trim();
    const proveedor = proveedores.find(p => p.num === provNum);
    const { promedio, clase, claseCSS } = calcularPuntajeClase();

    const fechaEval = document.getElementById('fecha-evaluacion').value;
    const diasPlazo = parseInt(document.getElementById('dias-proxima-eval').value) || 0;
    const fechaProx = calcularFechaProximaDesdeDias();

    const puntajes = [];
    for (let i = 1; i <= 6; i++) {
        puntajes.push(parseFloat(document.getElementById(`stat-val-${i}`).value) || 0);
    }

    const registro = {
        numFormulario,
        version: '',
        provNum,
        provNombre: proveedor ? proveedor.nombre : 'Desconocido',
        anio,
        fechaEval,
        diasPlazo,
        fechaProx,
        promedio,
        clase,
        claseCSS,
        puntajes
    };

    await fetch('/api/estadisticas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registro)
    });

    document.getElementById('form-estadisticas').reset();
    document.getElementById('select-anio-estadistica').value = "2026";
    document.getElementById('fecha-calculada-prox').innerText = '-- / -- / ----';
    cargarNombresCriteriosEstadisticas();
    document.getElementById('stat-promedio').innerText = '0 pts';
    document.getElementById('stat-clase').innerText = 'Clase D';
    document.getElementById('stat-clase').className = 'clase-badge badge-d';

    await cargarTodoDesdeServidor(true);
}

function renderizarTablaEstadisticas() {
    const tbody = document.getElementById('tabla-estadisticas-body');
    const filtroAnio = document.getElementById('filtro-tabla-anio')?.value || 'TODOS';
    if (!tbody) return;
    tbody.innerHTML = '';

    let lista = estadisticas;
    if (filtroAnio !== 'TODOS') {
        lista = estadisticas.filter(s => s.anio === filtroAnio);
    }

    lista.sort((a, b) => b.anio.localeCompare(a.anio));

    lista.forEach((s) => {
        const tr = document.createElement('tr');
        const fEval = s.fechaEval ? s.fechaEval.split('T')[0] : '';
        const fProx = s.fechaProx ? s.fechaProx.split('T')[0] : '';

        tr.innerHTML = `
            <td><strong>${s.numFormulario || ''}</strong></td>
            <td><strong>${s.anio}</strong></td>
            <td>${s.provNum}</td>
            <td>${s.provNombre}</td>
            <td>${fEval}</td>
            <td><strong>${s.diasPlazo || 0} días</strong></td>
            <td><strong>${fProx}</strong></td>
            <td>${s.promedio} pts</td>
            <td><span class="clase-badge ${s.claseCSS}">${s.clase}</span></td>
            <td>
                <button class="btn-warning" onclick="editarEstadistica('${s.provNum}', '${s.anio}')">Editar</button>
            </td>
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


// --- PESTAÑA 4 ---
let ordenesCompra = [];

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

        const provsOrdenados = [...proveedoresPermitidos].sort((a, b) => a.nombre.localeCompare(b.nombre));

        provsOrdenados.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.num;
            opt.innerText = `${p.nombre} (${p.num})`;
            selectProv.appendChild(opt);
        });
    }

    const selectReq = document.getElementById('select-compra-req');
    if (selectReq) {
        selectReq.innerHTML = '<option value="">-- Seleccione Requisito --</option>';

        const reqsOrdenados = [...requisitos].sort((a, b) => a.nombre.localeCompare(b.nombre));

        reqsOrdenados.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.num;
            opt.innerText = `${r.nombre} [${r.num}]`;
            selectReq.appendChild(opt);
        });
    }

    const selectCondPago = document.getElementById('select-compra-condicion-pago');
    if (selectCondPago) {
        selectCondPago.innerHTML = '<option value="">-- Seleccione Condición --</option>';

        const opcionesOrdenadas = [...opcionesCondicionPago].sort((a, b) => a.localeCompare(b));

        opcionesOrdenadas.forEach(optVal => {
            const opt = document.createElement('option');
            opt.value = optVal;
            opt.innerText = optVal;
            selectCondPago.appendChild(opt);
        });
    }

    renderizarReglasPagoUI();
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

function renderizarReglasPagoUI() {
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
    autoCompletarPuntajePago();
    cerrarModalGestionPago();

    alert("✅ Escala de valoración y condiciones de pago actualizadas correctamente.");
}

async function iniciarCompra(e) {
    if (e) e.preventDefault();

    const numFormulario = document.getElementById('num-formulario-comp').value.trim();
    const provNum = document.getElementById('select-compra-prov').value;
    const reqNum = document.getElementById('select-compra-req').value;
    const cantidad = document.getElementById('compra-cantidad').value;
    const fechaEmisionEl = document.getElementById('compra-fecha-emision');
    const fechaEmision = fechaEmisionEl && fechaEmisionEl.value ? fechaEmisionEl.value : new Date().toISOString().split('T')[0];
    const fechaReq = document.getElementById('compra-fecha-req').value;
    const condicionPago = document.getElementById('select-compra-condicion-pago').value;
    const observaciones = document.getElementById('compra-observaciones').value.trim();

    const pagoEval = parseInt(document.getElementById('compra-pago-eval').value) || 0;
    const plazoEval = parseInt(document.getElementById('compra-plazo-eval').value) || 0;

    const provObj = proveedores.find(p => p.num === provNum);
    const reqObj = requisitos.find(r => r.num === reqNum);

    let nuevoNumero = 1001;
    if (ordenesCompra.length > 0) {
        const numerosExistentes = ordenesCompra.map(o => {
            const num = parseInt(o.idOrden.replace('OC-', ''));
            return isNaN(num) ? 0 : num;
        });
        nuevoNumero = Math.max(...numerosExistentes) + 1;
    }

    const idOrden = `OC-${nuevoNumero}`;

    const nuevaOrden = {
        idOrden,
        numFormulario,
        provNum,
        provNombre: provObj ? provObj.nombre : provNum,
        reqNum,
        reqNombre: reqObj ? reqObj.nombre : reqNum,
        reqDetalle: reqObj ? reqObj.detalle : '',
        cantidad,
        fechaEmision,
        fechaReq,
        condicionPago,
        observaciones,
        pagoEval,
        plazoEval,
        estado: 'Pendiente'
    };

    await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaOrden)
    });

    generarPDFOrden(nuevaOrden);
    document.getElementById('form-compras').reset();
    await cargarTodoDesdeServidor(true);
}

function renderizarTablaCompras() {
    const tbody = document.getElementById('tabla-compras-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    ordenesCompra.forEach(oc => {
        const tr = document.createElement('tr');
        const badgeClass = oc.estado === 'Pendiente' ? 'status-badge-pending' : 'status-badge-received';
        const fEmis = oc.fechaEmision ? oc.fechaEmision.split('T')[0] : '';
        const fReq = oc.fechaReq ? oc.fechaReq.split('T')[0] : '';

        tr.innerHTML = `
            <td><strong>${oc.numFormulario || ''}</strong></td>
            <td><strong>${oc.idOrden}</strong></td>
            <td>${oc.provNombre}</td>
            <td>${oc.reqNombre}</td>
            <td>${oc.cantidad}</td>
            <td><strong>${oc.condicionPago || '-'}</strong></td>
            <td>${fEmis}</td>
            <td>${fReq}</td>
            <td><span class="${badgeClass}">${oc.estado}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function generarPDFOrden(orden) {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(216, 27, 96);
    doc.text("ORDEN DE COMPRA", 105, 20, null, null, "center");

    doc.setFontSize(12);
    doc.setTextColor(51, 51, 51);
    doc.text(`N° Formulario: ${orden.numFormulario || ''}`, 20, 32);
    doc.text(`N° Orden: ${orden.idOrden}`, 20, 40);
    doc.text(`Fecha Emisión: ${orden.fechaEmision || new Date().toLocaleDateString()}`, 20, 48);

    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL PROVEEDOR:", 20, 62);
    doc.setFont("helvetica", "normal");
    doc.text(`Proveedor: ${orden.provNombre} (${orden.provNum})`, 20, 70);

    doc.setFont("helvetica", "bold");
    doc.text("DETALLE DEL PEDIDO:", 20, 85);
    doc.setFont("helvetica", "normal");
    
    let currentY = 93;
    
    doc.text(`Producto/Requisito: ${orden.reqNombre} (${orden.reqNum})`, 20, currentY);
    currentY += 8;
    
    doc.text(`Cantidad Solicitada: ${orden.cantidad}`, 20, currentY);
    currentY += 8;
    
    doc.text(`Condición de Pago: ${orden.condicionPago || 'No especificada'}`, 20, currentY);
    currentY += 8;

    doc.text(`Fecha Requerida de Entrega: ${orden.fechaReq}`, 20, currentY);
    currentY += 10;

    if (orden.reqDetalle) {
        const textoReq = `Especificaciones Técnicas: ${orden.reqDetalle}`;
        const lineasReq = doc.splitTextToSize(textoReq, 170);
        doc.text(lineasReq, 20, currentY);
        currentY += (lineasReq.length * 6) + 4;
    }

    if (orden.observaciones) {
        const textoObs = `Observaciones: ${orden.observaciones}`;
        const lineasObs = doc.splitTextToSize(textoObs, 170);
        doc.text(lineasObs, 20, currentY);
        currentY += (lineasObs.length * 6) + 4;
    }

    currentY += 5;
    doc.setDrawColor(216, 27, 96);
    doc.line(20, currentY, 190, currentY);

    currentY += 10;
    doc.setFontSize(10);
    doc.text("Favor de confirmar la recepción de la presente orden de compra.", 105, currentY, null, null, "center");

    doc.save(`Orden_Compra_${orden.idOrden}.pdf`);
}


// --- PESTAÑA 5 ---
let recepciones = [];

function actualizarSelectOrdenesPendientes() {
    const select = document.getElementById('select-recepcion-orden');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccione Orden Pendiente --</option>';

    const pendientes = ordenesCompra.filter(oc => oc.estado === 'Pendiente');
    pendientes.sort((a, b) => a.provNombre.localeCompare(b.provNombre));

    pendientes.forEach(oc => {
        const opt = document.createElement('option');
        opt.value = oc.idOrden;
        opt.innerText = `${oc.provNombre} - ${oc.reqNombre} (${oc.idOrden})`;
        select.appendChild(opt);
    });
}

function cargarDetalleOrdenPendiente() {
    const idOrden = document.getElementById('select-recepcion-orden').value;
    const orden = ordenesCompra.find(oc => oc.idOrden === idOrden);

    if (orden) {
        document.getElementById('rec-campo-2').value = orden.cantidad;
    }
}

async function guardarRecepcion(e) {
    if (e) e.preventDefault();

    const idOrden = document.getElementById('select-recepcion-orden').value;
    if (!idOrden) return;

    const numFormulario = document.getElementById('num-formulario-rec').value.trim();
    const remito = document.getElementById('rec-campo-1').value.trim();
    const cantRecibida = document.getElementById('rec-campo-2').value;
    const empaque = document.getElementById('rec-campo-3').value;
    const tiempo = '';
    const calidad = document.getElementById('rec-campo-5').value;
    const obs = document.getElementById('rec-campo-6').value.trim();
    const fechaEl = document.getElementById('rec-fecha');
    const fechaRecepcion = fechaEl && fechaEl.value ? fechaEl.value : new Date().toISOString().split('T')[0];

    const orden = ordenesCompra.find(oc => oc.idOrden === idOrden);

    const nuevaRec = {
        numFormulario,
        idOrden,
        provNombre: orden ? orden.provNombre : '',
        remito,
        cantRecibida,
        empaque,
        tiempo,
        calidad,
        obs,
        fechaRecepcion
    };

    await fetch('/api/recepciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaRec)
    });

    document.getElementById('form-recepcion').reset();
    await cargarTodoDesdeServidor(true);
    actualizarSelectOrdenesPendientes();
}

function renderizarTablaRecepciones() {
    const tbody = document.getElementById('tabla-recepcion-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    recepciones.forEach(r => {
        const tr = document.createElement('tr');
        const fRec = r.fechaRecepcion ? r.fechaRecepcion.split('T')[0] : '';
        tr.innerHTML = `
            <td><strong>${r.numFormulario || ''}</strong></td>
            <td><strong>${r.idOrden}</strong></td>
            <td>${r.provNombre}</td>
            <td>${r.remito}</td>
            <td>${r.cantRecibida}</td>
            <td>${r.calidad}</td>
            <td>${fRec}</td>
            <td>${r.obs || '-'}</td>
            <td><span class="status-badge-received">Recibido</span></td>
        `;
        tbody.appendChild(tr);
    });
}


// --- PESTAÑA 6 ---
let usuarios = [];

async function guardarUsuario(e) {
    if (e) e.preventDefault();

    const nombre = document.getElementById('usr-nombre').value.trim();
    const pass = document.getElementById('usr-pass').value;
    const sector = document.getElementById('usr-sector').value;
    const estado = document.getElementById('usr-estado').value;

    if (!nombre) {
        alert("Por favor ingrese el nombre del usuario.");
        return;
    }

    await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, pass, sector, estado })
    });

    document.getElementById('form-usuarios').reset();
    await cargarTodoDesdeServidor(true);
    if (typeof renderizarTablaMasterUsuarios === 'function') {
        renderizarTablaMasterUsuarios();
    }
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
    if (!confirm(`¿Estás seguro de eliminar al usuario "${nombre}"?`)) return;

    await fetch(`/api/usuarios/${encodeURIComponent(nombre)}`, { method: 'DELETE' });
    await cargarTodoDesdeServidor(true);
    if (typeof renderizarTablaMasterUsuarios === 'function') {
        renderizarTablaMasterUsuarios();
    }
}


// --- MODAL Y CONFIGURACIÓN MASTER ---
function abrirModalMaster() {
    document.getElementById('modal-master').style.display = 'flex';
}

function cerrarModalMaster() {
    document.getElementById('modal-master').style.display = 'none';
}

function autenticarMaster() {
    const usr = document.getElementById('master-user').value;
    const pass = document.getElementById('master-pass').value;

    if (usr === 'admin' && pass === masterPasswordActual) {
        document.getElementById('master-auth').style.display = 'none';
        document.getElementById('master-panel').style.display = 'block';
        renderizarTablaCorreccionVencimientosMaster();
        renderizarTablaSectoresMaster();
        renderizarTablaConfigPagoPuntos();
        renderizarMatrizPermisos();
        renderizarMatrizPermisosProveedores();
        renderizarTablaMasterUsuarios();
    } else {
        alert('Credenciales de Administrador Master incorrectas.');
    }
}

function renderizarTablaCorreccionVencimientosMaster() {
    const container = document.getElementById('tabla-correccion-vencimientos-container');
    if (!container) return;

    if (!estadisticas || estadisticas.length === 0) {
        container.innerHTML = '<p style="color:#777;">No hay evaluaciones registradas para modificar vencimientos.</p>';
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Año Eval.</th>
                <th>Proveedor</th>
                <th>Fecha Eval. Real</th>
                <th>Fecha Próxima Calculada / Actual</th>
                <th>Nueva Fecha Próx. Eval.</th>
                <th>Acción</th>
            </tr>
        </thead>
        <tbody>`;

    estadisticas.forEach((est, idx) => {
        const fEval = est.fechaEval ? est.fechaEval.split('T')[0] : '-';
        const fProxActual = est.fechaProx ? est.fechaProx.split('T')[0] : '-';

        html += `<tr>
            <td><strong>${est.anio}</strong></td>
            <td>${est.provNombre} (${est.provNum})</td>
            <td>${fEval}</td>
            <td><strong style="color: #c62828;">${fProxActual}</strong></td>
            <td><input type="date" id="input-master-fprox-${idx}" value="${fProxActual}" style="padding: 4px;"></td>
            <td>
                <button class="btn-primary" onclick="guardarNuevaFechaProxMaster(${idx})">💾 Actualizar Vencimiento</button>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

async function guardarNuevaFechaProxMaster(index) {
    const inputFecha = document.getElementById(`input-master-fprox-${index}`);
    if (!inputFecha || !inputFecha.value) {
        alert("Por favor selecciona una fecha válida.");
        return;
    }

    const estTarget = estadisticas[index];
    estTarget.fechaProx = inputFecha.value;

    await fetch('/api/estadisticas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estTarget)
    });

    await cargarTodoDesdeServidor(true);
    renderizarTablaCorreccionVencimientosMaster();
    alert(`✅ Fecha de Próxima Evaluación actualizada a ${inputFecha.value} para ${estTarget.provNombre}.`);
}

function renderizarTablaSectoresMaster() {
    const container = document.getElementById('lista-sectores-master-container');
    if (!container) return;

    let html = `<table>
        <thead>
            <tr>
                <th>Nombre del Sector / Área</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>`;

    listaSectoresGlobal.forEach((sec, idx) => {
        html += `<tr>
            <td><input type="text" id="input-sector-name-${idx}" value="${sec}" style="width: 100%; padding: 4px;"></td>
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

    if (!val) {
        alert("Ingresa un nombre de sector válido.");
        return;
    }

    if (listaSectoresGlobal.includes(val)) {
        alert("Ese sector ya existe.");
        return;
    }

    listaSectoresGlobal.push(val);
    if (!permisosPorSector[val]) {
        permisosPorSector[val] = [1];
    }

    await guardarSectoresBaseDatos();
    input.value = '';
    renderizarTablaSectoresMaster();
    renderizarMatrizPermisos();
    actualizarSelectSectoresUsuarios();
}

async function guardarNombreSectorMaster(index) {
    const input = document.getElementById(`input-sector-name-${index}`);
    if (!input) return;

    const nuevoNombre = input.value.trim();
    const viejoNombre = listaSectoresGlobal[index];

    if (!nuevoNombre) {
        alert("El nombre del sector no puede estar vacío.");
        return;
    }

    listaSectoresGlobal[index] = nuevoNombre;

    if (permisosPorSector[viejoNombre]) {
        permisosPorSector[nuevoNombre] = permisosPorSector[viejoNombre];
        delete permisosPorSector[viejoNombre];
    }

    usuarios.forEach(async u => {
        if (u.sector === viejoNombre) {
            u.sector = nuevoNombre;
            await fetch('/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(u)
            });
        }
    });

    await guardarSectoresBaseDatos();
    renderizarTablaSectoresMaster();
    renderizarMatrizPermisos();
    actualizarSelectSectoresUsuarios();
    alert(`✅ Sector renombrado a "${nuevoNombre}".`);
}

async function eliminarSectorMaster(index) {
    if (listaSectoresGlobal.length <= 1) {
        alert("Debe existir al menos un sector registrado.");
        return;
    }

    const sec = listaSectoresGlobal[index];
    if (!confirm(`¿Estás seguro de eliminar el sector "${sec}"?`)) return;

    listaSectoresGlobal.splice(index, 1);
    delete permisosPorSector[sec];

    await guardarSectoresBaseDatos();
    renderizarTablaSectoresMaster();
    renderizarMatrizPermisos();
    actualizarSelectSectoresUsuarios();
}

async function guardarSectoresBaseDatos() {
    await fetch('/api/configuraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: 'lista_sectores', valor: listaSectoresGlobal })
    });
    await fetch('/api/configuraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: 'permisos_sectores', valor: permisosPorSector })
    });
}

function renderizarMatrizPermisosProveedores() {
    const container = document.getElementById('matriz-permisos-proveedores-container');
    if (!container) return;

    if (!usuarios || usuarios.length === 0 || !proveedores || proveedores.length === 0) {
        container.innerHTML = '<p style="color:#777;">Debe registrar usuarios y proveedores para configurar los permisos.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Usuario</th>';
    proveedores.forEach(p => { 
        html += `<th style="text-align:center;">${p.nombre}<br><small style="color:#666;">(${p.num})</small></th>`; 
    });
    html += '</tr></thead><tbody>';

    usuarios.forEach(u => {
        html += `<tr><td><strong>${u.nombre}</strong> <small>(${u.sector})</small></td>`;
        const asignados = permisosProveedoresPorUsuario[u.nombre] || [];

        proveedores.forEach(p => {
            const checked = asignados.includes(p.num) ? 'checked' : '';
            html += `<td style="text-align:center;"><input type="checkbox" data-usuario-prov="${u.nombre}" data-prov-num="${p.num}" ${checked}></td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

async function guardarPermisosProveedoresMaster() {
    const checkboxes = document.querySelectorAll('#matriz-permisos-proveedores-container input[type="checkbox"]');
    const nuevosPermisos = {};

    checkboxes.forEach(chk => {
        const usrName = chk.getAttribute('data-usuario-prov');
        const provNum = chk.getAttribute('data-prov-num');
        if (chk.checked) {
            if (!nuevosPermisos[usrName]) nuevosPermisos[usrName] = [];
            nuevosPermisos[usrName].push(provNum);
        }
    });

    permisosProveedoresPorUsuario = nuevosPermisos;

    await fetch('/api/configuraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: 'permisos_proveedores_usuarios', valor: permisosProveedoresPorUsuario })
    });

    actualizarSelectsCompras();
    alert("✅ Permisos de proveedores por usuario guardados correctamente.");
}

function renderizarTablaConfigPagoPuntos() {
    const container = document.getElementById('config-pago-puntos-container');
    if (!container) return;

    let html = `<table>
        <thead>
            <tr>
                <th>Condición de Pago</th>
                <th>Puntaje Asignado (0-100)</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>`;

    Object.keys(tablaCondicionPagoPuntos).forEach(cond => {
        html += `<tr>
            <td><strong>${cond}</strong></td>
            <td><input type="number" min="0" max="100" id="master-pts-${cond}" value="${tablaCondicionPagoPuntos[cond]}" style="width: 80px; padding: 4px;"> pts</td>
            <td><button class="btn-danger" onclick="eliminarCondicionPagoMaster('${cond}')">Eliminar</button></td>
        </tr>`;
    });

    html += `</tbody></table>
    <button class="btn-primary" onclick="guardarCambiosPuntajesPagoMaster()" style="margin-top: 10px;">💾 Guardar Escala de Puntos</button>`;

    container.innerHTML = html;
}

async function guardarCambiosPuntajesPagoMaster() {
    Object.keys(tablaCondicionPagoPuntos).forEach(cond => {
        const input = document.getElementById(`master-pts-${cond}`);
        if (input) {
            tablaCondicionPagoPuntos[cond] = parseInt(input.value) || 0;
        }
    });

    await fetch('/api/configuraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: 'tabla_condicion_pago_puntos', valor: tablaCondicionPagoPuntos })
    });

    actualizarSelectsCompras();
    alert("✅ Escala de puntos por Condición de Pago guardada correctamente.");
}

async function eliminarCondicionPagoMaster(cond) {
    if (!confirm(`¿Desea eliminar la condición de pago "${cond}"?`)) return;

    delete tablaCondicionPagoPuntos[cond];
    opcionesCondicionPago = Object.keys(tablaCondicionPagoPuntos);

    await fetch('/api/configuraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: 'tabla_condicion_pago_puntos', valor: tablaCondicionPagoPuntos })
    });

    renderizarTablaConfigPagoPuntos();
    actualizarSelectsCompras();
}

async function guardarNuevaPasswordMaster() {
    const nuevaPass = document.getElementById('master-new-pass').value.trim();
    if (!nuevaPass) {
        alert("Por favor ingrese una contraseña válida.");
        return;
    }

    await fetch('/api/configuraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: 'master_password', valor: nuevaPass })
    });

    masterPasswordActual = nuevaPass;
    document.getElementById('master-new-pass').value = '';
    alert("🔐 Contraseña del Panel Master actualizada y guardada correctamente.");
}

async function limpiarBaseDeDatosMaster() {
    const confirmacion1 = confirm("⚠️ ¿Estás SEGURO de que deseas eliminar las Evaluaciones, Órdenes y Recepciones?");
    if (!confirmacion1) return;

    const confirmacion2 = confirm("🚨 ¡Esta acción NO se puede deshacer! ¿Confirmas el borrado?");
    if (!confirmacion2) return;

    try {
        const res = await fetch('/api/master/limpiar-bd', { method: 'POST' });
        const data = await res.json();

        if (res.ok) {
            alert("✅ " + data.message);
            await cargarTodoDesdeServidor(true);
        } else {
            alert("❌ " + (data.error || "Ocurrió un error al limpiar la base de datos."));
        }
    } catch (e) {
        console.error(e);
        alert("❌ Error de conexión al servidor.");
    }
}

function renderizarMatrizPermisos() {
    const container = document.getElementById('matriz-permisos-container');
    if (!container) return;

    const pestañas = [
        { id: 1, nombre: 'P1: Requisitos' },
        { id: 2, nombre: 'P2: Proveedores' },
        { id: 3, nombre: 'P3: Evaluación' },
        { id: 4, nombre: 'P4: Órdenes Compra' },
        { id: 5, nombre: 'P5: Recepción' },
        { id: 6, nombre: 'P6: Usuarios' }
    ];

    let html = '<table><thead><tr><th>Sector</th>';
    pestañas.forEach(p => { html += `<th style="text-align:center;">${p.nombre}</th>`; });
    html += '</tr></thead><tbody>';

    listaSectoresGlobal.forEach(sec => {
        html += `<tr><td><strong>${sec}</strong></td>`;
        const permitidas = permisosPorSector[sec] || [];

        pestañas.forEach(p => {
            const checked = permitidas.includes(p.id) ? 'checked' : '';
            html += `<td style="text-align:center;"><input type="checkbox" data-sector="${sec}" data-pestaña="${p.id}" ${checked}></td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

async function guardarPermisosSectores() {
    const checkboxes = document.querySelectorAll('#matriz-permisos-container input[type="checkbox"]');
    const nuevosPermisos = {};

    listaSectoresGlobal.forEach(s => { nuevosPermisos[s] = []; });

    checkboxes.forEach(chk => {
        const sec = chk.dataset.sector || chk.getAttribute('data-sector');
        const pId = parseInt(chk.dataset.pestaña || chk.getAttribute('data-pestaña'));

        if (chk.checked && sec && !isNaN(pId)) {
            if (!nuevosPermisos[sec]) {
                nuevosPermisos[sec] = [];
            }
            if (!nuevosPermisos[sec].includes(pId)) {
                nuevosPermisos[sec].push(pId);
            }
        }
    });

    permisosPorSector = nuevosPermisos;

    try {
        const res = await fetch('/api/configuraciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clave: 'permisos_sectores', valor: permisosPorSector })
        });

        if (res.ok) {
            alert("✅ Matriz de permisos actualizada correctamente en la Base de Datos.");
            if (usuarioActual) {
                aplicarPermisosUsuario(usuarioActual.sector);
            }
        } else {
            alert("❌ Error al guardar los permisos en la base de datos.");
        }
    } catch (e) {
        console.error("Error al guardar permisos:", e);
        alert("❌ Error de conexión al guardar los permisos.");
    }
}

async function guardarTituloSistema() {
    const titulo = document.getElementById('master-system-title').value.trim();
    if (!titulo) return;

    await fetch('/api/configuraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: 'sys_title', valor: titulo })
    });

    document.getElementById('header-system-title').innerText = titulo;
    document.getElementById('login-title').innerText = titulo;
    document.getElementById('page-title').innerText = titulo;

    alert("✅ Título del sistema actualizado.");
}

async function guardarUsuarioMaster(e) {
    if (e) e.preventDefault();
    const nombre = document.getElementById('master-usr-nombre').value.trim();
    const pass = document.getElementById('master-usr-pass').value;
    const sector = document.getElementById('master-usr-sector').value;
    const estado = document.getElementById('master-usr-estado').value;

    if (!nombre) return;

    await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, pass, sector, estado })
    });

    document.getElementById('form-master-usuario').reset();
    await cargarTodoDesdeServidor(true);
    renderizarTablaMasterUsuarios();
    renderizarMatrizPermisosProveedores();
    alert(`✅ Usuario "${nombre}" guardado correctamente.`);
}

function renderizarTablaMasterUsuarios() {
    const tbody = document.getElementById('tabla-master-usuarios-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay usuarios registrados</td></tr>';
        return;
    }

    usuarios.forEach((u, idx) => {
        const tr = document.createElement('tr');
        const btnAccion = u.estado === 'Activo' 
            ? `<button class="btn-warning" onclick="alternarEstadoUsuario('${u.nombre}')">Deshabilitar</button>`
            : `<button class="btn-success" onclick="alternarEstadoUsuario('${u.nombre}')">Habilitar</button>`;

        tr.innerHTML = `
            <td><strong>${u.nombre}</strong></td>
            <td>
                <span id="pass-text-${idx}" style="font-family: monospace;">••••••••</span>
                <button type="button" class="btn-info" style="padding: 2px 6px; margin-left: 6px; font-size: 0.8em;" onclick="toggleMostrarPasswordMaster(${idx}, '${u.pass || ''}')">👁️</button>
            </td>
            <td>${u.sector}</td>
            <td>${u.estado}</td>
            <td>
                ${btnAccion}
                <button class="btn-warning" onclick="editarUsuarioMaster('${u.nombre}')">Editar</button>
                <button class="btn-danger" onclick="eliminarUsuario('${u.nombre}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function toggleMostrarPasswordMaster(index, password) {
    const el = document.getElementById(`pass-text-${index}`);
    if (!el) return;

    if (el.innerText === '••••••••') {
        el.innerText = password || '(Sin clave)';
        el.style.fontWeight = 'bold';
        el.style.color = '#d81b60';
    } else {
        el.innerText = '••••••••';
        el.style.fontWeight = 'normal';
        el.style.color = 'inherit';
    }
}

function editarUsuarioMaster(nombre) {
    const u = usuarios.find(usr => usr.nombre === nombre);
    if (!u) return;

    document.getElementById('master-usr-nombre').value = u.nombre;
    document.getElementById('master-usr-pass').value = u.pass || '';
    document.getElementById('master-usr-sector').value = u.sector;
    document.getElementById('master-usr-estado').value = u.estado;
}

async function alternarEstadoUsuario(nombre) {
    const u = usuarios.find(usr => usr.nombre === nombre);
    if (u) {
        u.estado = u.estado === 'Activo' ? 'Inactivo' : 'Activo';
        await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(u)
        });
        await cargarTodoDesdeServidor(true);
        renderizarTablaMasterUsuarios();
    }
}

async function cambiarColorBg(color, guardar = true) {
    document.documentElement.style.setProperty('--bg-primary', color);
    if (guardar) {
        await fetch('/api/configuraciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clave: 'sys_bg_color', valor: color })
        });
    }
}

function subirLogoDesdePC(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Image = e.target.result;
            cambiarLogo(base64Image, true);
        };
        reader.readAsDataURL(file);
    }
}

async function cambiarLogo(srcImagen, guardar = true) {
    if (srcImagen) {
        const logoImg = document.getElementById('app-logo');
        const loginLogo = document.getElementById('login-logo');
        if (logoImg) logoImg.src = srcImagen;
        if (loginLogo) loginLogo.src = srcImagen;

        if (guardar) {
            await fetch('/api/configuraciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clave: 'sys_logo', valor: srcImagen })
            });
            alert("✅ Logo actualizado y guardado correctamente en la Base de Datos PostgreSQL.");
        }
    }
}
