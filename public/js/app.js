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

async function guardarNumeroFormularioDirecto(claveConfig, idInput) {
    const valor = document.getElementById(idInput).value.trim();
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
            alert(`✅ N° de Formulario "${valor}" guardado correctamente en la Base de Datos PostgreSQL para todas las PCs.`);
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
            document.getElementById('num-formulario-req').value = config.num_form_req;
        }
        if (config.num_form_prov && activeEl !== document.getElementById('num-formulario-prov')) {
            document.getElementById('num-formulario-prov').value = config.num_form_prov;
        }
        if (config.num_form_stat && activeEl !== document.getElementById('num-formulario')) {
            document.getElementById('num-formulario').value = config.num_form_stat;
        }
        if (config.num_form_comp && activeEl !== document.getElementById('num-formulario-comp')) {
            document.getElementById('num-formulario-comp').value = config.num_form_comp;
        }
        if (config.num_form_rec && activeEl !== document.getElementById('num-formulario-rec')) {
            document.getElementById('num-formulario-rec').value = config.num_form_rec;
        }

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

// --- PESTAÑA 1 ---
let requisitos = [];

async function guardarRequisito(e) {
    e.preventDefault();
    const numFormulario = document.getElementById('num-formulario-req').value.trim();
    const num = document.getElementById('num-requisito').value.trim();
    const nombre = document.getElementById('nombre-requisito').value.trim();
    const fecha = document.getElementById('fecha-requisito')?.value || new Date().toISOString().split('T')[0];
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
    e.preventDefault();

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


// --- MODAL PERFORMANCE ---
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

// 1. Gráfico de Torta / 3D Separado estilo la imagen de referencia
function renderizarGraficoTortaClases() {
    const conteo = { 'Clase A': 0, 'Clase B': 0, 'Clase C': 0, 'Clase D': 0 };

    if (Array.isArray(estadisticas)) {
        estadisticas.forEach(est => {
            if (conteo[est.clase] !== undefined) {
                conteo[est.clase]++;
            } else {
                conteo['Clase D']++;
            }
        });
    }

    const total = Object.values(conteo).reduce((a, b) => a + b, 0);

    const ctx = document.getElementById('chartTortaClases').getContext('2d');
    if (chartTortaInstance) chartTortaInstance.destroy();

    // Plugin personalizado para simular el borde y grosor 3D inferior
    const pluginSombra3D = {
        id: 'efecto3D',
        beforeDatasetsDraw(chart) {
            const { ctx } = chart;
            ctx.save();
            ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 10;
        },
        afterDatasetsDraw(chart) {
            chart.ctx.restore();
        }
    };

    chartTortaInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Clase A (>=91)', 'Clase B (76-90)', 'Clase C (61-75)', 'Clase D (<61)'],
            datasets: [{
                data: [
                    conteo['Clase A'],
                    conteo['Clase B'],
                    conteo['Clase C'],
                    conteo['Clase D']
                ],
                backgroundColor: [
                    '#b522b0', // Magenta / Violeta (como STAT 01)
                    '#00c9b7', // Turquesa (como STAT 02)
                    '#2934d0', // Azul Oscuro (como STAT 03)
                    '#5e17eb'  // Púrpura Intenso (como STAT 04)
                ],
                borderColor: '#ffffff',
                borderWidth: 4,
                // Offset que separa cada porción recreando el diseño infográfico 3D
                offset: [12, 12, 12, 12],
                hoverOffset: 18
            }]
        },
        plugins: [pluginSombra3D],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 20
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                        padding: 15,
                        font: { size: 12, weight: 'bold' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw || 0;
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                            return ` ${context.label}: ${val} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 2. Gráfico de Barras por Criterio con Sombras Proyectadas
function renderizarGraficoPerformanceProveedores() {
    const provSeleccionado = document.getElementById('select-grafico-prov')?.value || 'TODOS';
    
    let provsAProcesar = proveedores || [];
    if (provSeleccionado !== 'TODOS') {
        provsAProcesar = proveedores.filter(p => p.num === provSeleccionado);
    }

    const labels = [];
    const datosRecepcion = []; 
    const datosPlazo = [];     
    const datosPago = [];      
    const datosCalidad = [];   

    provsAProcesar.forEach(prov => {
        const evals = estadisticas.filter(e => e.provNum === prov.num);
        if (evals.length > 0) {
            const ultimaEval = evals[evals.length - 1]; 
            labels.push(prov.nombre);

            const p = ultimaEval.puntajes || [0, 0, 0, 0, 0, 0];
            datosRecepcion.push(p[0] || 0); 
            datosCalidad.push(p[1] || 0);   
            datosPago.push(p[2] || 0);      
            datosPlazo.push(p[3] || 0);     
        }
    });

    const ctx = document.getElementById('chartPerformanceProveedores').getContext('2d');
    if (chartPerfProvInstance) chartPerfProvInstance.destroy();

    // Plugin para aplicar sombra paralela a cada barra
    const pluginSombraBarras = {
        id: 'sombraBarras',
        beforeDatasetDraw(chart, args) {
            const { ctx } = chart;
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 4;
        },
        afterDatasetDraw(chart) {
            chart.ctx.restore();
        }
    };

    chartPerfProvInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length > 0 ? labels : ['Sin Datos'],
            datasets: [
                {
                    label: 'Cumplimiento de Entrega',
                    data: datosRecepcion.length > 0 ? datosRecepcion : [0],
                    backgroundColor: '#0288d1',
                    borderRadius: 6
                },
                {
                    label: 'Plazo de Entrega',
                    data: datosPlazo.length > 0 ? datosPlazo : [0],
                    backgroundColor: '#5e17eb',
                    borderRadius: 6
                },
                {
                    label: 'Condición de Pago',
                    data: datosPago.length > 0 ? datosPago : [0],
                    backgroundColor: '#f57c00',
                    borderRadius: 6
                },
                {
                    label: 'Calidad de Insumos',
                    data: datosCalidad.length > 0 ? datosCalidad : [0],
                    backgroundColor: '#00c9b7',
                    borderRadius: 6
                }
            ]
        },
        plugins: [pluginSombraBarras],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 12,
                        font: { size: 11 }
                    }
                }
            },
            scales: {
                y: { min: 0, max: 100, ticks: { stepSize: 20 } },
                x: { grid: { display: false } }
            }
        }
    });
}

// --- PESTAÑA 4 ---
let ordenesCompra = [];

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

    const numFormulario = document.getElementById('num-formulario-comp').value.trim();
    const provNum = document.getElementById('select-compra-prov').value;
    const reqNum = document.getElementById('select-compra-req').value;
    const cantidad = document.getElementById('compra-cantidad').value;
    const fechaEmision = document.getElementById('compra-fecha-emision')?.value || new Date().toISOString().split('T')[0];
    const fechaReq = document.getElementById('compra-fecha-req').value;
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

    const numFormulario = document.getElementById('num-formulario-rec').value.trim();
    const remito = document.getElementById('rec-campo-1').value.trim();
    const cantRecibida = document.getElementById('rec-campo-2').value;
    const empaque = document.getElementById('rec-campo-3').value;
    const tiempo = '';
    const calidad = document.getElementById('rec-campo-5').value;
    const obs = document.getElementById('rec-campo-6').value.trim();
    const fechaRecepcion = document.getElementById('rec-fecha')?.value || new Date().toISOString().split('T')[0];

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
        if (logoImg) logoImg.src = srcImagen;

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