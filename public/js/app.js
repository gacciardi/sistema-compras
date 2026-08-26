// Navegación entre pestañas
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
}

// --- PESTAÑA 1: REQUISITOS TÉCNICOS ---
let requisitos = [];

function guardarRequisito(e) {
    e.preventDefault();
    
    const num = document.getElementById('num-requisito').value.trim();
    const nombre = document.getElementById('nombre-requisito').value.trim();
    const detalle = document.getElementById('detalle-requisito').value.trim();

    const index = requisitos.findIndex(r => r.num === num);
    if (index !== -1) {
        requisitos[index] = { num, nombre, detalle };
    } else {
        requisitos.push({ num, nombre, detalle });
    }

    document.getElementById('form-requisito').reset();
    renderizarTablaRequisitos();
}

function renderizarTablaRequisitos() {
    const tbody = document.getElementById('tabla-requisitos-body');
    tbody.innerHTML = '';

    requisitos.forEach((req) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${req.num}</strong></td>
            <td>${req.nombre}</td>
            <td>${req.detalle}</td>
            <td>
                <button class="btn-danger" onclick="eliminarRequisito('${req.num}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function eliminarRequisito(num) {
    requisitos = requisitos.filter(r => r.num !== num);
    renderizarTablaRequisitos();
}


// --- PESTAÑA 2: EVALUACIÓN DE PROVEEDORES ---
let proveedores = [];
let nombresCriteriosProveedores = [
    "Calidad de Entrega",
    "Tiempo de Respuesta",
    "Precios y Pagos",
    "Soporte Técnico",
    "Garantía",
    "Cumplimiento Normativo"
];

function guardarNombresCriteriosProveedores() {
    for (let i = 1; i <= 6; i++) {
        const val = document.getElementById(`crit-nombre-${i}`).value.trim();
        if (val) {
            nombresCriteriosProveedores[i - 1] = val;
        }
    }
}

function cargarNombresCriteriosProveedores() {
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`crit-nombre-${i}`).value = nombresCriteriosProveedores[i - 1];
    }
}

function calcularDiasDiferencia() {
    const fEval = document.getElementById('fecha-evaluacion').value;
    const fProx = document.getElementById('proxima-evaluacion').value;
    const cajaBadge = document.getElementById('caja-dias-restantes');

    if (fEval && fProx) {
        const fechaIni = new Date(fEval);
        const fechaFin = new Date(fProx);
        const diffTiempo = fechaFin - fechaIni;
        const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

        cajaBadge.innerText = diffDias >= 0 ? diffDias : 'Error';
        cajaBadge.style.color = diffDias < 0 ? '#d32f2f' : '#d81b60';
        return diffDias;
    }
    cajaBadge.innerText = '0';
    return 0;
}

function guardarProveedor(e) {
    e.preventDefault();

    guardarNombresCriteriosProveedores();

    const num = document.getElementById('num-proveedor').value.trim();
    const nombre = document.getElementById('nombre-proveedor').value.trim();
    const fechaEval = document.getElementById('fecha-evaluacion').value;
    const fechaProx = document.getElementById('proxima-evaluacion').value;
    const diasRestantes = calcularDiasDiferencia();

    const criterios = [];
    for (let i = 1; i <= 6; i++) {
        criterios.push({
            nombre: document.getElementById(`crit-nombre-${i}`).value.trim(),
            cantidad: parseFloat(document.getElementById(`crit-cant-${i}`).value) || 0
        });
    }

    const index = proveedores.findIndex(p => p.num === num);
    if (index !== -1) {
        proveedores[index] = { num, nombre, fechaEval, fechaProx, diasRestantes, criterios };
    } else {
        proveedores.push({ num, nombre, fechaEval, fechaProx, diasRestantes, criterios });
    }

    document.getElementById('form-proveedor').reset();
    cargarNombresCriteriosProveedores();
    document.getElementById('caja-dias-restantes').innerText = '0';
    renderizarTablaProveedores();
}

function renderizarTablaProveedores() {
    const tbody = document.getElementById('tabla-proveedores-body');
    tbody.innerHTML = '';

    proveedores.forEach((p) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.num}</strong></td>
            <td>${p.nombre}</td>
            <td>${p.fechaEval}</td>
            <td>${p.fechaProx}</td>
            <td><strong>${p.diasRestantes} días</strong></td>
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

    document.getElementById('num-proveedor').value = p.num;
    document.getElementById('nombre-proveedor').value = p.nombre;
    document.getElementById('fecha-evaluacion').value = p.fechaEval;
    document.getElementById('proxima-evaluacion').value = p.fechaProx;

    p.criterios.forEach((crit, index) => {
        const i = index + 1;
        document.getElementById(`crit-nombre-${i}`).value = crit.nombre;
        document.getElementById(`crit-cant-${i}`).value = crit.cantidad;
    });

    calcularDiasDiferencia();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function eliminarProveedor(num) {
    proveedores = proveedores.filter(p => p.num !== num);
    renderizarTablaProveedores();
}


// --- PESTAÑA 3: ESTADÍSTICAS Y CLASIFICACIÓN ---
let estadisticas = [];
let nombresCriteriosEstadisticas = [
    "Calidad General",
    "Tiempos de Entrega",
    "Precios competitivos",
    "Atención al Cliente",
    "Garantías y Cambios",
    "Condiciones de Pago"
];

function guardarNombresCriteriosEstadisticas() {
    for (let i = 1; i <= 6; i++) {
        const val = document.getElementById(`lbl-stat-${i}`).value.trim();
        if (val) {
            nombresCriteriosEstadisticas[i - 1] = val;
        }
    }
}

function cargarNombresCriteriosEstadisticas() {
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`lbl-stat-${i}`).value = nombresCriteriosEstadisticas[i - 1];
    }
}

function actualizarSelectProveedoresEstadisticas() {
    const select = document.getElementById('select-prov-estadistica');
    select.innerHTML = '<option value="">-- Seleccione un Proveedor --</option>';

    proveedores.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.num;
        opt.innerText = `${p.num} - ${p.nombre}`;
        select.appendChild(opt);
    });

    cargarNombresCriteriosEstadisticas();
}

function cargarCalificacionExistente() {
    const provNum = document.getElementById('select-prov-estadistica').value;
    const registro = estadisticas.find(e => e.provNum === provNum);

    if (registro && registro.puntajes) {
        for (let i = 1; i <= 6; i++) {
            document.getElementById(`stat-val-${i}`).value = registro.puntajes[i - 1] || '';
        }
        calcularPuntajeClase();
    } else {
        for (let i = 1; i <= 6; i++) {
            document.getElementById(`stat-val-${i}`).value = '';
        }
        document.getElementById('stat-promedio').innerText = '0 pts';
        document.getElementById('stat-clase').innerText = 'Clase D';
        document.getElementById('stat-clase').className = 'clase-badge badge-d';
    }
}

function calcularPuntajeClase() {
    let suma = 0;
    let contador = 0;

    for (let i = 1; i <= 6; i++) {
        const val = parseFloat(document.getElementById(`stat-val-${i}`).value);
        if (!isNaN(val)) {
            suma += val;
            contador++;
        }
    }

    const promedio = contador > 0 ? Math.round(suma / contador) : 0;
    document.getElementById('stat-promedio').innerText = `${promedio} pts`;

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

    badgeClase.innerText = clase;
    badgeClase.className = `clase-badge ${claseCSS}`;

    return { promedio, clase, claseCSS };
}

function calcularEstadistica(e) {
    e.preventDefault();

    const provNum = document.getElementById('select-prov-estadistica').value;
    if (!provNum) return;

    guardarNombresCriteriosEstadisticas();

    const proveedor = proveedores.find(p => p.num === provNum);
    const { promedio, clase, claseCSS } = calcularPuntajeClase();

    const puntajes = [];
    for (let i = 1; i <= 6; i++) {
        puntajes.push(parseFloat(document.getElementById(`stat-val-${i}`).value) || 0);
    }

    const index = estadisticas.findIndex(e => e.provNum === provNum);
    const registro = {
        provNum,
        provNombre: proveedor ? proveedor.nombre : 'Desconocido',
        promedio,
        clase,
        claseCSS,
        puntajes
    };

    if (index !== -1) {
        estadisticas[index] = registro;
    } else {
        estadisticas.push(registro);
    }

    document.getElementById('form-estadisticas').reset();
    cargarNombresCriteriosEstadisticas();
    document.getElementById('stat-promedio').innerText = '0 pts';
    document.getElementById('stat-clase').innerText = 'Clase D';
    document.getElementById('stat-clase').className = 'clase-badge badge-d';

    renderizarTablaEstadisticas();
}

function renderizarTablaEstadisticas() {
    const tbody = document.getElementById('tabla-estadisticas-body');
    tbody.innerHTML = '';

    estadisticas.forEach((s) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.provNum}</strong></td>
            <td>${s.provNombre}</td>
            <td>${s.promedio} pts</td>
            <td><span class="clase-badge ${s.claseCSS}">${s.clase}</span></td>
            <td>
                <button class="btn-warning" onclick="editarEstadistica('${s.provNum}')">Editar</button>
                <button class="btn-danger" onclick="eliminarEstadistica('${s.provNum}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarEstadistica(provNum) {
    document.getElementById('select-prov-estadistica').value = provNum;
    cargarCalificacionExistente();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function eliminarEstadistica(provNum) {
    estadisticas = estadisticas.filter(s => s.provNum !== provNum);
    renderizarTablaEstadisticas();
}


// --- PESTAÑA 4: COMPRAS Y EMISIÓN DE PDF ---
let ordenesCompra = [];
let contadorOrdenes = 1001;

function actualizarSelectsCompras() {
    const selectProv = document.getElementById('select-compra-prov');
    selectProv.innerHTML = '<option value="">-- Seleccione Proveedor --</option>';
    proveedores.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.num;
        opt.innerText = `${p.num} - ${p.nombre}`;
        selectProv.appendChild(opt);
    });

    const selectReq = document.getElementById('select-compra-req');
    selectReq.innerHTML = '<option value="">-- Seleccione Requisito --</option>';
    requisitos.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.num;
        opt.innerText = `${r.num} - ${r.nombre}`;
        selectReq.appendChild(opt);
    });
}

function iniciarCompra(e) {
    e.preventDefault();

    const provNum = document.getElementById('select-compra-prov').value;
    const reqNum = document.getElementById('select-compra-req').value;
    const cantidad = document.getElementById('compra-cantidad').value;
    const fechaReq = document.getElementById('compra-fecha-req').value;
    const observaciones = document.getElementById('compra-observaciones').value.trim();

    const provObj = proveedores.find(p => p.num === provNum);
    const reqObj = requisitos.find(r => r.num === reqNum);

    const nuevaOrden = {
        idOrden: `OC-${contadorOrdenes++}`,
        provNum,
        provNombre: provObj ? provObj.nombre : provNum,
        reqNum,
        reqNombre: reqObj ? reqObj.nombre : reqNum,
        reqDetalle: reqObj ? reqObj.detalle : '',
        cantidad,
        fechaReq,
        observaciones,
        estado: 'Pendiente'
    };

    ordenesCompra.push(nuevaOrden);
    renderizarTablaCompras();
    generarPDFOrden(nuevaOrden);

    document.getElementById('form-compras').reset();
}

function renderizarTablaCompras() {
    const tbody = document.getElementById('tabla-compras-body');
    tbody.innerHTML = '';

    ordenesCompra.forEach(oc => {
        const tr = document.createElement('tr');
        const badgeClass = oc.estado === 'Pendiente' ? 'status-badge-pending' : 'status-badge-received';
        tr.innerHTML = `
            <td><strong>${oc.idOrden}</strong></td>
            <td>${oc.provNombre}</td>
            <td>${oc.reqNombre}</td>
            <td>${oc.cantidad}</td>
            <td>${oc.fechaReq}</td>
            <td><span class="${badgeClass}">${oc.estado}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function generarPDFOrden(orden) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(216, 27, 96);
    doc.text("ORDEN DE COMPRA", 105, 20, null, null, "center");

    doc.setFontSize(12);
    doc.setTextColor(51, 51, 51);
    doc.text(`N° Orden: ${orden.idOrden}`, 20, 40);
    doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, 20, 48);

    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL PROVEEDOR:", 20, 62);
    doc.setFont("helvetica", "normal");
    doc.text(`Proveedor: ${orden.provNombre} (${orden.provNum})`, 20, 70);

    doc.setFont("helvetica", "bold");
    doc.text("DETALLE DEL PEDIDO:", 20, 85);
    doc.setFont("helvetica", "normal");
    doc.text(`Producto/Requisito: ${orden.reqNombre} (${orden.reqNum})`, 20, 93);
    doc.text(`Cantidad Solicitada: ${orden.cantidad}`, 20, 101);
    doc.text(`Fecha Requerida de Entrega: ${orden.fechaReq}`, 20, 109);

    if (orden.reqDetalle) {
        doc.text(`Especificaciones Técnicas: ${orden.reqDetalle}`, 20, 117);
    }

    if (orden.observaciones) {
        doc.text(`Observaciones: ${orden.observaciones}`, 20, 127);
    }

    doc.setDrawColor(216, 27, 96);
    doc.line(20, 140, 190, 140);

    doc.setFontSize(10);
    doc.text("Favor de confirmar la recepción de la presente orden de compra.", 105, 150, null, null, "center");

    doc.save(`Orden_Compra_${orden.idOrden}.pdf`);
}


// --- PESTAÑA 5: RECEPCIÓN DE MERCADERÍA ---
let recepciones = [];

function actualizarSelectOrdenesPendientes() {
    const select = document.getElementById('select-recepcion-orden');
    select.innerHTML = '<option value="">-- Seleccione Orden Pendiente --</option>';

    const pendientes = ordenesCompra.filter(oc => oc.estado === 'Pendiente');
    pendientes.forEach(oc => {
        const opt = document.createElement('option');
        opt.value = oc.idOrden;
        opt.innerText = `${oc.idOrden} - ${oc.provNombre} (${oc.reqNombre})`;
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

function guardarRecepcion(e) {
    e.preventDefault();

    const idOrden = document.getElementById('select-recepcion-orden').value;
    if (!idOrden) return;

    const remito = document.getElementById('rec-campo-1').value.trim();
    const cantRecibida = document.getElementById('rec-campo-2').value;
    const empaque = document.getElementById('rec-campo-3').value;
    const tiempo = document.getElementById('rec-campo-4').value;
    const calidad = document.getElementById('rec-campo-5').value;
    const obs = document.getElementById('rec-campo-6').value.trim();

    const orden = ordenesCompra.find(oc => oc.idOrden === idOrden);
    if (orden) {
        orden.estado = 'Recibido';
    }

    recepciones.push({
        idOrden,
        provNombre: orden ? orden.provNombre : '',
        remito,
        cantRecibida,
        empaque,
        tiempo,
        calidad,
        obs,
        fechaRecepcion: new Date().toLocaleDateString()
    });

    document.getElementById('form-recepcion').reset();
    renderizarTablaCompras();
    renderizarTablaRecepciones();
    actualizarSelectOrdenesPendientes();
}

function renderizarTablaRecepciones() {
    const tbody = document.getElementById('tabla-recepcion-body');
    tbody.innerHTML = '';

    recepciones.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${r.idOrden}</strong></td>
            <td>${r.provNombre}</td>
            <td>${r.remito}</td>
            <td>${r.cantRecibida}</td>
            <td>${r.calidad}</td>
            <td>${r.fechaRecepcion}</td>
            <td><span class="status-badge-received">Recibido</span></td>
        `;
        tbody.appendChild(tr);
    });
}


// --- PESTAÑA 6: GESTIÓN DE USUARIOS ---
let usuarios = [];

function guardarUsuario(e) {
    e.preventDefault();

    const nombre = document.getElementById('usr-nombre').value.trim();
    const pass = document.getElementById('usr-pass').value;
    const sector = document.getElementById('usr-sector').value;
    const estado = document.getElementById('usr-estado').value;

    const index = usuarios.findIndex(u => u.nombre === nombre);
    if (index !== -1) {
        usuarios[index] = { nombre, pass, sector, estado };
    } else {
        usuarios.push({ nombre, pass, sector, estado });
    }

    document.getElementById('form-usuarios').reset();
    renderizarTablaUsuarios();
    renderizarTablaMasterUsuarios();
}

function renderizarTablaUsuarios() {
    const tbody = document.getElementById('tabla-usuarios-body');
    tbody.innerHTML = '';

    usuarios.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${u.nombre}</strong></td>
            <td>${u.sector}</td>
            <td>${u.estado}</td>
            <td>
                <button class="btn-danger" onclick="eliminarUsuario('${u.nombre}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function eliminarUsuario(nombre) {
    usuarios = usuarios.filter(u => u.nombre !== nombre);
    renderizarTablaUsuarios();
    renderizarTablaMasterUsuarios();
}


// --- MODAL DE ADMINISTRADOR MASTER Y CONTROL DE USUARIOS ---
function abrirModalMaster() {
    document.getElementById('modal-master').style.display = 'flex';
}

function cerrarModalMaster() {
    document.getElementById('modal-master').style.display = 'none';
}

function autenticarMaster() {
    const usr = document.getElementById('master-user').value;
    const pass = document.getElementById('master-pass').value;

    if (usr === 'admin' && pass === '1234') {
        document.getElementById('master-auth').style.display = 'none';
        document.getElementById('master-panel').style.display = 'block';
        renderizarTablaMasterUsuarios();
    } else {
        alert('Credenciales de Administrador Master incorrectas.');
    }
}

function renderizarTablaMasterUsuarios() {
    const tbody = document.getElementById('tabla-master-usuarios-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay usuarios registrados</td></tr>';
        return;
    }

    usuarios.forEach(u => {
        const tr = document.createElement('tr');
        const btnAccion = u.estado === 'Activo' 
            ? `<button class="btn-warning" onclick="alternarEstadoUsuario('${u.nombre}')">Deshabilitar</button>`
            : `<button class="btn-success" onclick="alternarEstadoUsuario('${u.nombre}')">Habilitar</button>`;

        tr.innerHTML = `
            <td><strong>${u.nombre}</strong></td>
            <td>${u.sector}</td>
            <td>${u.estado}</td>
            <td>${btnAccion}</td>
        `;
        tbody.appendChild(tr);
    });
}

function alternarEstadoUsuario(nombre) {
    const usuario = usuarios.find(u => u.nombre === nombre);
    if (usuario) {
        usuario.estado = usuario.estado === 'Activo' ? 'Inactivo' : 'Activo';
        renderizarTablaUsuarios();
        renderizarTablaMasterUsuarios();
    }
}

function cambiarColorBg(color) {
    document.documentElement.style.setProperty('--bg-primary', color);
}

function cambiarLogo(nombreArchivo) {
    if (nombreArchivo) {
        document.getElementById('app-logo').src = nombreArchivo;
    }
}