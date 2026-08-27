document.addEventListener('DOMContentLoaded', async () => {
    await cargarTodoDesdeServidor();

    const formUsuarios = document.getElementById('form-usuarios');
    if (formUsuarios) {
        formUsuarios.addEventListener('submit', guardarUsuario);
    }

    // Sincronización automática de fondo cada 5 segundos
    setInterval(async () => {
        await cargarTodoDesdeServidor(false);
    }, 5000);
});

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

// Cargar todo desde el Servidor / Base de Datos
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
        if (config.crit_prov_labels && Array.isArray(config.crit_prov_labels)) {
            nombresCriteriosProveedores = config.crit_prov_labels;
        }
        if (config.crit_stat_labels && Array.isArray(config.crit_stat_labels)) {
            nombresCriteriosEstadisticas = config.crit_stat_labels;
        }
        if (config.sys_bg_color) cambiarColorBg(config.sys_bg_color, false);
        if (config.sys_logo) cambiarLogo(config.sys_logo, false);

        if (renderCompleto) {
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

// --- PESTAÑA 1: REQUISITOS TÉCNICOS ---
let requisitos = [];

async function guardarRequisito(e) {
    e.preventDefault();
    const num = document.getElementById('num-requisito').value.trim();
    const nombre = document.getElementById('nombre-requisito').value.trim();
    const fecha = document.getElementById('fecha-requisito')?.value || new Date().toISOString().split('T')[0];
    const detalle = document.getElementById('detalle-requisito').value.trim();

    await fetch('/api/requisitos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num, nombre, fecha, detalle })
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
            <td><strong>${req.num}</strong></td>
            <td>${req.nombre}</td>
            <td>${fReq}</td>
            <td>${req.detalle || ''}</td>
            <td>
                <button class="btn-danger" onclick="eliminarRequisito('${req.num}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function eliminarRequisito(num) {
    await fetch(`/api/requisitos/${num}`, { method: 'DELETE' });
    await cargarTodoDesdeServidor(true);
}


// --- PESTAÑA 2: SELECCIÓN DE PROVEEDORES ---
let proveedores = [];
let nombresCriteriosProveedores = [
    "Calidad de Entrega",
    "Tiempo de Respuesta",
    "Precios y Pagos",
    "Soporte Técnico",
    "Garantía",
    "Cumplimiento Normativo"
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
    e.preventDefault();

    await guardarNombresCriteriosProveedores();

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
        body: JSON.stringify({ num, nombre, criterios })
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


// --- PESTAÑA 3: EVALUACIÓN Y ESTADÍSTICAS ---
let estadisticas = [];
let nombresCriteriosEstadisticas = [
    "Calidad General",
    "Tiempos de Entrega",
    "Precios competitivos",
    "Atención al Cliente",
    "Garantías y Cambios",
    "Condiciones de Pago"
];
let chartEvolucionInstance = null;

// Lógica de suma de días para calcular la fecha próxima exacta
function calcularFechaProximaDesdeDias() {
    const fEvalVal = document.getElementById('fecha-evaluacion').value;
    const diasVal = parseInt(document.getElementById('dias-proxima-eval').value);
    const badgeFechaCalc = document.getElementById('fecha-calculada-prox');

    if (fEvalVal && !isNaN(diasVal) && diasVal > 0) {
        const fechaBase = new Date(fEvalVal + 'T00:00:00');
        fechaBase.setDate(fechaBase.getDate() + diasVal);

        const dia = String(fechaBase.getDate()).padStart(2, '0');
        const mes = String(fechaBase.getMonth() + 1).padStart(2, '0');
        const anio = fechaBase.getFullYear();

        const fechaFormateada = `${dia}/${mes}/${anio}`;
        badgeFechaCalc.innerText = fechaFormateada;
        return `${anio}-${mes}-${dia}`;
    } else {
        badgeFechaCalc.innerText = '-- / -- / ----';
        return '';
    }
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

    proveedores.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.num;
        opt.innerText = `${p.num} - ${p.nombre}`;
        select.appendChild(opt);
    });

    cargarNombresCriteriosEstadisticas();
    renderizarTablaEstadisticas();
}

function cargarCalificacionExistente() {
    const provNum = document.getElementById('select-prov-estadistica').value;
    const anio = document.getElementById('select-anio-estadistica').value;
    
    const registro = estadisticas.find(e => e.provNum === provNum && e.anio === anio);

    if (registro) {
        if (registro.fechaEval) {
            document.getElementById('fecha-evaluacion').value = registro.fechaEval.split('T')[0];
        }
        document.getElementById('dias-proxima-eval').value = registro.diasPlazo || '';
        calcularFechaProximaDesdeDias();

        if (registro.puntajes) {
            for (let i = 1; i <= 6; i++) {
                document.getElementById(`stat-val-${i}`).value = registro.puntajes[i - 1] || '';
            }
            calcularPuntajeClase();
        }
    } else {
        document.getElementById('fecha-evaluacion').value = '';
        document.getElementById('dias-proxima-eval').value = '';
        document.getElementById('fecha-calculada-prox').innerText = '-- / -- / ----';
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

async function calcularEstadistica(e) {
    e.preventDefault();

    const provNum = document.getElementById('select-prov-estadistica').value;
    const anio = document.getElementById('select-anio-estadistica').value;
    if (!provNum || !anio) return;

    await guardarNombresCriteriosEstadisticas();

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


// --- MODAL DE ÍNDICE DE PERFORMANCE ---
function abrirModalPerformance() {
    const provNum = document.getElementById('select-prov-estadistica').value;
    if (!provNum) {
        alert("Por favor, selecciona un proveedor para ver su Índice de Performance.");
        return;
    }

    const proveedor = proveedores.find(p => p.num === provNum);
    const registros = estadisticas.filter(e => e.provNum === provNum).sort((a,b) => a.anio.localeCompare(b.anio));

    if (registros.length === 0) {
        alert("El proveedor seleccionado aún no posee evaluaciones guardadas.");
        return;
    }

    document.getElementById('modal-performance').style.display = 'flex';
    document.getElementById('perf-prov-nombre').innerText = `${proveedor ? proveedor.nombre : provNum} (${provNum})`;

    const sumaTotal = registros.reduce((acc, curr) => acc + curr.promedio, 0);
    const promedioPerformance = Math.round(sumaTotal / registros.length);
    document.getElementById('perf-indice-valor').innerText = `${promedioPerformance} pts`;

    const badgeTend = document.getElementById('perf-tendencia-badge');
    if (registros.length >= 2) {
        const ult = registros[registros.length - 1].promedio;
        const penult = registros[registros.length - 2].promedio;
        if (ult > penult) {
            badgeTend.innerText = "↗ Mejorando";
            badgeTend.className = "clase-badge badge-a";
        } else if (ult < penult) {
            badgeTend.innerText = "↘ En Descenso";
            badgeTend.className = "clase-badge badge-d";
        } else {
            badgeTend.innerText = "➡️ Estable";
            badgeTend.className = "clase-badge badge-b";
        }
    } else {
        badgeTend.innerText = "Sin histórico previo";
        badgeTend.className = "clase-badge badge-b";
    }

    const tbody = document.getElementById('tabla-perf-historico-body');
    tbody.innerHTML = '';
    registros.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${r.anio}</strong></td>
            <td>${r.promedio} pts</td>
            <td><span class="clase-badge ${r.claseCSS}">${r.clase}</span></td>
            <td>Promedio acumulado de 6 criterios evaluados</td>
        `;
        tbody.appendChild(tr);
    });

    const ctx = document.getElementById('chartEvolucion').getContext('2d');
    if (chartEvolucionInstance) {
        chartEvolucionInstance.destroy();
    }

    chartEvolucionInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: registros.map(r => r.anio),
            datasets: [{
                label: 'Puntaje de Evaluación (0 - 100 pts)',
                data: registros.map(r => r.promedio),
                borderColor: '#0288d1',
                backgroundColor: 'rgba(2, 136, 209, 0.15)',
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#d81b60',
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 100, ticks: { stepSize: 20 } }
            }
        }
    });
}

function cerrarModalPerformance() {
    document.getElementById('modal-performance').style.display = 'none';
}


// --- PESTAÑA 4: COMPRAS Y EMISIÓN DE PDF ---
let ordenesCompra = [];
let contadorOrdenes = 1001;

function actualizarSelectsCompras() {
    const selectProv = document.getElementById('select-compra-prov');
    if (!selectProv) return;
    selectProv.innerHTML = '<option value="">-- Seleccione Proveedor --</option>';
    proveedores.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.num;
        opt.innerText = `${p.num} - ${p.nombre}`;
        selectProv.appendChild(opt);
    });

    const selectReq = document.getElementById('select-compra-req');
    if (!selectReq) return;
    selectReq.innerHTML = '<option value="">-- Seleccione Requisito --</option>';
    requisitos.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.num;
        opt.innerText = `${r.num} - ${r.nombre}`;
        selectReq.appendChild(opt);
    });
}

async function iniciarCompra(e) {
    e.preventDefault();

    const provNum = document.getElementById('select-compra-prov').value;
    const reqNum = document.getElementById('select-compra-req').value;
    const cantidad = document.getElementById('compra-cantidad').value;
    const fechaEmision = document.getElementById('compra-fecha-emision')?.value || new Date().toISOString().split('T')[0];
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
        fechaEmision,
        fechaReq,
        observaciones,
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
            <td><strong>${oc.idOrden}</strong></td>
            <td>${oc.provNombre}</td>
            <td>${oc.reqNombre}</td>
            <td>${oc.cantidad}</td>
            <td>${fEmis}</td>
            <td>${fReq}</td>
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
    doc.text(`Fecha Emisión: ${orden.fechaEmision || new Date().toLocaleDateString()}`, 20, 48);

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
    if (!select) return;
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

async function guardarRecepcion(e) {
    e.preventDefault();

    const idOrden = document.getElementById('select-recepcion-orden').value;
    if (!idOrden) return;

    const remito = document.getElementById('rec-campo-1').value.trim();
    const cantRecibida = document.getElementById('rec-campo-2').value;
    const empaque = document.getElementById('rec-campo-3').value;
    const tiempo = document.getElementById('rec-campo-4').value;
    const calidad = document.getElementById('rec-campo-5').value;
    const obs = document.getElementById('rec-campo-6').value.trim();
    const fechaRecepcion = document.getElementById('rec-fecha')?.value || new Date().toISOString().split('T')[0];

    const orden = ordenesCompra.find(oc => oc.idOrden === idOrden);

    const nuevaRec = {
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
            <td><strong>${r.idOrden}</strong></td>
            <td>${r.provNombre}</td>
            <td>${r.remito}</td>
            <td>${r.cantRecibida}</td>
            <td>${r.calidad}</td>
            <td>${fRec}</td>
            <td><span class="status-badge-received">Recibido</span></td>
        `;
        tbody.appendChild(tr);
    });
}


// --- PESTAÑA 6: GESTIÓN DE USUARIOS ---
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


// --- MODAL Y CONFIGURACIÓN PERSISTENTE EN BASE DE DATOS ---
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

    if (!usuarios || usuarios.length === 0) {
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

async function cambiarLogo(nombreArchivo, guardar = true) {
    if (nombreArchivo) {
        document.getElementById('app-logo').src = nombreArchivo;
        if (guardar) {
            await fetch('/api/configuraciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clave: 'sys_logo', valor: nombreArchivo })
            });
        }
    }
}