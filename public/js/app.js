// ==========================================
// ESTADO GLOBAL Y PERSISTENCIA (LOCALSTORAGE)
// ==========================================
let usuarioActual = null;
let radarChartInstance = null;
let pieChartInstance = null;

// Usuarios por defecto garantizados para el sistema
const USUARIOS_DEFAULT = [
    { usuario: 'admin', pass: 'admin123', sector: 'Administración', estado: 'Activo' },
    { usuario: 'compras', pass: '1234', sector: 'Compras', estado: 'Activo' },
    { usuario: 'recepcion', pass: '1234', sector: 'Recepción', estado: 'Activo' }
];

const DB_INICIAL = {
    usuarios: USUARIOS_DEFAULT,
    sectores: ['Administración', 'Compras', 'Recepción', 'Auditoría'],
    requisitos: [
        { formulario: 'F-COM-01', codigo: 'REQ-001', nombre: 'Garrafas de Gas 45kg', fecha: '2026-09-01', detalle: 'Gas propano para producción' }
    ],
    proveedores: [
        { formulario: 'F-PROV-01', num: 'PROV-1001', nombre: 'Amarilla Gas S.A.', criterios: { c1: 80, c2: 90, c3: 85, c4: 90, c5: 85, c6: 80 } }
    ],
    evaluaciones: [
        { formulario: 'F-EVAL-2026', anio: '2026', numProv: 'PROV-1001', proveedor: 'Amarilla Gas S.A.', fechaReal: '2026-09-05', plazo: 180, proxEval: '2027-03-04', v1: 100, v2: 90, v3: 85, v5: 90, v6: 85, promedio: 90, clase: 'Clase A' }
    ],
    compras: [],
    recepciones: [],
    condicionesPago: [
        { nombre: 'Contado / Efectivo', puntos: 100 },
        { nombre: 'Transferencia 15 días', puntos: 90 },
        { nombre: 'Cheque 30 días', puntos: 80 },
        { nombre: 'Cheque 60 días', puntos: 60 }
    ]
};

function getDB() {
    try {
        const data = localStorage.getItem('SISTEMA_COMPRAS_DB');
        if (!data) {
            localStorage.setItem('SISTEMA_COMPRAS_DB', JSON.stringify(DB_INICIAL));
            return DB_INICIAL;
        }
        const db = JSON.parse(data);
        
        // Verificación de seguridad: si no existen usuarios en el LocalStorage, los reinyecta
        if (!db.usuarios || !Array.isArray(db.usuarios) || db.usuarios.length === 0) {
            db.usuarios = USUARIOS_DEFAULT;
            saveDB(db);
        }
        return db;
    } catch (e) {
        // En caso de corrupción de datos local, reinicia la BD de forma limpia
        localStorage.setItem('SISTEMA_COMPRAS_DB', JSON.stringify(DB_INICIAL));
        return DB_INICIAL;
    }
}

function saveDB(db) {
    localStorage.setItem('SISTEMA_COMPRAS_DB', JSON.stringify(db));
}

// ==========================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    getDB();
    cargarSelectsProveedores();
    cargarCondicionesPagoSelect();
    renderizarTablas();
    evaluarAnioSeleccionado();
    
    // Verificar si existe sesión activa guardada
    const session = sessionStorage.getItem('USUARIO_SESION');
    if (session) {
        try {
            usuarioActual = JSON.parse(session);
            iniciarPantallaPrincipal();
        } catch (e) {
            sessionStorage.removeItem('USUARIO_SESION');
        }
    }
});

// ==========================================
// LOGIN Y AUTENTICACIÓN
// ==========================================
function iniciarSesionUsuario(event) {
    if (event) event.preventDefault();
    
    const userEl = document.getElementById('login-user');
    const passEl = document.getElementById('login-pass');

    if (!userEl || !passEl) return;

    const userIn = userEl.value.trim().toLowerCase();
    const passIn = passEl.value.trim();

    const db = getDB();
    
    // Búsqueda flexible (insensible a mayúsculas/minúsculas en el usuario)
    const usuarioEncontrado = db.usuarios.find(u => 
        u.usuario.toLowerCase() === userIn && 
        u.pass === passIn && 
        (u.estado === 'Activo' || !u.estado)
    );

    if (usuarioEncontrado) {
        usuarioActual = usuarioEncontrado;
        sessionStorage.setItem('USUARIO_SESION', JSON.stringify(usuarioActual));
        iniciarPantallaPrincipal();
    } else {
        alert('Credenciales incorrectas.\n\nUsuarios disponibles:\n• Usuario: admin / Clave: admin123\n• Usuario: compras / Clave: 1234');
    }
}

function iniciarPantallaPrincipal() {
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    const userBadge = document.getElementById('user-session-info');

    if (loginScreen) loginScreen.style.display = 'none';
    if (appScreen) appScreen.style.display = 'block';
    if (userBadge && usuarioActual) {
        userBadge.innerText = `👤 ${usuarioActual.usuario} (${usuarioActual.sector || 'General'})`;
    }
    
    showTab('tab-requisitos');
}

function cerrarSesionUsuario() {
    sessionStorage.removeItem('USUARIO_SESION');
    usuarioActual = null;
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');

    if (appScreen) appScreen.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'flex';
}

// ==========================================
// NAVEGACIÓN Y PESTAÑAS
// ==========================================
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    const activeBtn = document.querySelector(`[onclick="showTab('${tabId}')"]`);
    if (activeBtn) activeBtn.classList.add('active');

    if (tabId === 'tab-estadisticas') {
        cargarCalificacionExistente();
        renderizarGraficosPestaña3();
    }
}

// ==========================================
// PESTAÑA 3: EVALUACIÓN DE DESEMPEÑO Y MODO HISTÓRICO
// ==========================================
function evaluarAnioSeleccionado() {
    const selectAnio = document.getElementById('select-anio-estadistica');
    const cajaHistorica = document.getElementById('caja-alerta-historica');
    const inputPago = document.getElementById('stat-val-3');
    const inputEntrega = document.getElementById('stat-val-1');

    if (!selectAnio || !inputPago || !inputEntrega) return;

    if (selectAnio.value !== '2026') {
        if (cajaHistorica) cajaHistorica.style.display = 'block';
        inputPago.removeAttribute('readonly');
        inputEntrega.removeAttribute('readonly');
        inputPago.style.backgroundColor = '#ffffff';
        inputEntrega.style.backgroundColor = '#ffffff';
        inputPago.placeholder = 'Ingreso Manual (0-100)';
        inputEntrega.placeholder = 'Ingreso Manual (0-100)';
    } else {
        if (cajaHistorica) cajaHistorica.style.display = 'none';
        inputPago.setAttribute('readonly', 'readonly');
        inputEntrega.setAttribute('readonly', 'readonly');
        inputPago.style.backgroundColor = '#fff8e1';
        inputEntrega.style.backgroundColor = '#fff8e1';
        inputPago.placeholder = 'Puntaje Auto (Pest. 4)';
        inputEntrega.placeholder = 'Puntaje Auto (Pest. 5)';
    }
}

function cargarCalificacionExistente() {
    evaluarAnioSeleccionado();

    const provSelect = document.getElementById('select-prov-estadistica')?.value;
    const anioSelect = document.getElementById('select-anio-estadistica')?.value;

    if (!provSelect) return;

    const db = getDB();
    const evalExistente = db.evaluaciones.find(e => e.proveedor === provSelect && e.anio === anioSelect);

    if (evalExistente) {
        document.getElementById('num-formulario').value = evalExistente.formulario || '';
        document.getElementById('fecha-evaluacion').value = evalExistente.fechaReal || '';
        document.getElementById('dias-proxima-eval').value = evalExistente.plazo || '';
        document.getElementById('fecha-calculada-prox').innerText = evalExistente.proxEval || '-- / -- / ----';

        document.getElementById('stat-val-1').value = evalExistente.v1 || 0;
        document.getElementById('stat-val-2').value = evalExistente.v2 || 0;
        document.getElementById('stat-val-3').value = evalExistente.v3 || 0;
        document.getElementById('stat-val-5').value = evalExistente.v5 || 0;
        document.getElementById('stat-val-6').value = evalExistente.v6 || 0;
    } else {
        document.getElementById('stat-val-1').value = (anioSelect === '2026') ? 100 : '';
        document.getElementById('stat-val-2').value = '';
        document.getElementById('stat-val-3').value = (anioSelect === '2026') ? 90 : '';
        document.getElementById('stat-val-5').value = '';
        document.getElementById('stat-val-6').value = '';
    }

    calcularPuntajeClase();
}

function calcularPuntajeClase() {
    const v1 = parseFloat(document.getElementById('stat-val-1')?.value) || 0;
    const v2 = parseFloat(document.getElementById('stat-val-2')?.value) || 0;
    const v3 = parseFloat(document.getElementById('stat-val-3')?.value) || 0;
    const v5 = parseFloat(document.getElementById('stat-val-5')?.value) || 0;
    const v6 = parseFloat(document.getElementById('stat-val-6')?.value) || 0;

    const suma = v1 + v2 + v3 + v5 + v6;
    const promedio = Math.round(suma / 5);

    const elPromedio = document.getElementById('stat-promedio');
    const elClase = document.getElementById('stat-clase');

    if (elPromedio) elPromedio.innerText = `${promedio} pts`;

    let clase = 'Clase D';
    let badgeClass = 'badge-d';

    if (promedio >= 90) {
        clase = 'Clase A';
        badgeClass = 'badge-a';
    } else if (promedio >= 75) {
        clase = 'Clase B';
        badgeClass = 'badge-b';
    } else if (promedio >= 60) {
        clase = 'Clase C';
        badgeClass = 'badge-c';
    }

    if (elClase) {
        elClase.innerText = clase;
        elClase.className = `clase-badge ${badgeClass}`;
    }

    actualizarGraficoRadar();
}

function calcularFechaProximaDesdeDias() {
    const fechaEval = document.getElementById('fecha-evaluacion').value;
    const dias = parseInt(document.getElementById('dias-proxima-eval').value) || 0;
    const badge = document.getElementById('fecha-calculada-prox');

    if (fechaEval && dias > 0) {
        const fecha = new Date(fechaEval);
        fecha.setDate(fecha.getDate() + dias);
        badge.innerText = fecha.toLocaleDateString('es-AR');
    } else {
        badge.innerText = '-- / -- / ----';
    }
}

function calcularEstadistica(event) {
    if (event) event.preventDefault();
    const db = getDB();

    const prov = document.getElementById('select-prov-estadistica').value;
    const anio = document.getElementById('select-anio-estadistica').value;
    const provObj = db.proveedores.find(p => p.nombre === prov);

    const v1 = parseFloat(document.getElementById('stat-val-1').value) || 0;
    const v2 = parseFloat(document.getElementById('stat-val-2').value) || 0;
    const v3 = parseFloat(document.getElementById('stat-val-3').value) || 0;
    const v5 = parseFloat(document.getElementById('stat-val-5').value) || 0;
    const v6 = parseFloat(document.getElementById('stat-val-6').value) || 0;
    const promedio = Math.round((v1 + v2 + v3 + v5 + v6) / 5);

    let clase = 'Clase D';
    if (promedio >= 90) clase = 'Clase A';
    else if (promedio >= 75) clase = 'Clase B';
    else if (promedio >= 60) clase = 'Clase C';

    const nuevaEval = {
        formulario: document.getElementById('num-formulario').value,
        anio: anio,
        numProv: provObj ? provObj.num : 'PROV-1000',
        proveedor: prov,
        fechaReal: document.getElementById('fecha-evaluacion').value,
        plazo: document.getElementById('dias-proxima-eval').value,
        proxEval: document.getElementById('fecha-calculada-prox').innerText,
        v1, v2, v3, v5, v6,
        promedio,
        clase
    };

    const index = db.evaluaciones.findIndex(e => e.proveedor === prov && e.anio === anio);
    if (index >= 0) {
        db.evaluaciones[index] = nuevaEval;
    } else {
        db.evaluaciones.push(nuevaEval);
    }

    saveDB(db);
    alert('Evaluación guardada con éxito.');
    renderizarTablas();
    renderizarGraficosPestaña3();
}

// ==========================================
// RENDERIZADO DE GRÁFICOS (CHART.JS)
// ==========================================
function renderizarGraficosPestaña3() {
    renderizarGraficoRadar();
    renderizarGraficoPie();
}

function renderizarGraficoRadar() {
    const ctx = document.getElementById('chart-radar-proveedor');
    if (!ctx) return;

    if (radarChartInstance) radarChartInstance.destroy();

    const v1 = parseFloat(document.getElementById('stat-val-1')?.value) || 0;
    const v2 = parseFloat(document.getElementById('stat-val-2')?.value) || 0;
    const v3 = parseFloat(document.getElementById('stat-val-3')?.value) || 0;
    const v5 = parseFloat(document.getElementById('stat-val-5')?.value) || 0;
    const v6 = parseFloat(document.getElementById('stat-val-6')?.value) || 0;

    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Cumplimiento Entrega', 'Calidad Insumos', 'Condición Pago', 'Atención', 'Resp. Reclamos'],
            datasets: [{
                label: 'Desempeño Obtenido (0-100)',
                data: [v1, v2, v3, v5, v6],
                backgroundColor: 'rgba(33, 150, 243, 0.25)',
                borderColor: '#2196F3',
                pointBackgroundColor: '#1976D2',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { suggestedMin: 0, suggestedMax: 100 } }
        }
    });
}

function actualizarGraficoRadar() {
    if (!radarChartInstance) return;
    const v1 = parseFloat(document.getElementById('stat-val-1')?.value) || 0;
    const v2 = parseFloat(document.getElementById('stat-val-2')?.value) || 0;
    const v3 = parseFloat(document.getElementById('stat-val-3')?.value) || 0;
    const v5 = parseFloat(document.getElementById('stat-val-5')?.value) || 0;
    const v6 = parseFloat(document.getElementById('stat-val-6')?.value) || 0;

    radarChartInstance.data.datasets[0].data = [v1, v2, v3, v5, v6];
    radarChartInstance.update();
}

function renderizarGraficoPie() {
    const ctx = document.getElementById('chart-pie-clasificacion');
    if (!ctx) return;

    if (pieChartInstance) pieChartInstance.destroy();

    const db = getDB();
    let ca = 0, cb = 0, cc = 0, cd = 0;

    db.evaluaciones.forEach(e => {
        if (e.clase === 'Clase A') ca++;
        else if (e.clase === 'Clase B') cb++;
        else if (e.clase === 'Clase C') cc++;
        else cd++;
    });

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

// ==========================================
// CARGA DE SELECTS Y TABLAS DE DATOS
// ==========================================
function cargarSelectsProveedores() {
    const db = getDB();
    const selectP3 = document.getElementById('select-prov-estadistica');
    const selectP4 = document.getElementById('select-compra-prov');

    if (selectP3 && db.proveedores) {
        selectP3.innerHTML = db.proveedores.map(p => `<option value="${p.nombre}">${p.nombre}</option>`).join('');
    }
    if (selectP4 && db.proveedores) {
        selectP4.innerHTML = db.proveedores.map(p => `<option value="${p.nombre}">${p.nombre}</option>`).join('');
    }
}

function cargarCondicionesPagoSelect() {
    const db = getDB();
    const selectPago = document.getElementById('select-compra-condicion-pago');
    const listaUI = document.getElementById('lista-reglas-pago-ui');

    if (selectPago && db.condicionesPago) {
        selectPago.innerHTML = db.condicionesPago.map(c => `<option value="${c.nombre}">${c.nombre} (${c.puntos} pts)</option>`).join('');
    }
    if (listaUI && db.condicionesPago) {
        listaUI.innerHTML = db.condicionesPago.map(c => `<li><strong>${c.nombre}:</strong> ${c.puntos} Puntos</li>`).join('');
    }
}

function autoCompletarPuntajePago() {
    const db = getDB();
    const condNombre = document.getElementById('select-compra-condicion-pago').value;
    const condObj = db.condicionesPago.find(c => c.nombre === condNombre);
    const inputEval = document.getElementById('compra-pago-eval');

    if (condObj && inputEval) {
        inputEval.value = condObj.puntos;
    }
}

function renderizarTablas() {
    const db = getDB();

    // Tabla P1 Requisitos
    const tbodyP1 = document.getElementById('tabla-requisitos-body');
    if (tbodyP1 && db.requisitos) {
        tbodyP1.innerHTML = db.requisitos.map(r => `
            <tr>
                <td>${r.formulario}</td>
                <td>${r.codigo}</td>
                <td>${r.nombre}</td>
                <td>${r.fecha}</td>
                <td>${r.detalle}</td>
                <td><button class="btn-danger" onclick="eliminarRequisito('${r.codigo}')">🗑️</button></td>
            </tr>
        `).join('');
    }

    // Tabla P2 Proveedores
    const tbodyP2 = document.getElementById('tabla-proveedores-body');
    if (tbodyP2 && db.proveedores) {
        tbodyP2.innerHTML = db.proveedores.map(p => `
            <tr>
                <td>${p.formulario}</td>
                <td>${p.num}</td>
                <td>${p.nombre}</td>
                <td><button class="btn-danger" onclick="eliminarProveedor('${p.num}')">🗑️</button></td>
            </tr>
        `).join('');
    }

    // Tabla P3 Evaluaciones
    const tbodyP3 = document.getElementById('tabla-estadisticas-body');
    if (tbodyP3 && db.evaluaciones) {
        tbodyP3.innerHTML = db.evaluaciones.map(e => `
            <tr>
                <td>${e.formulario}</td>
                <td>${e.anio}</td>
                <td>${e.numProv}</td>
                <td>${e.proveedor}</td>
                <td>${e.fechaReal}</td>
                <td>${e.plazo} días</td>
                <td>${e.proxEval}</td>
                <td><strong>${e.promedio} pts</strong></td>
                <td><span class="clase-badge">${e.clase}</span></td>
                <td><button class="btn-danger" onclick="eliminarEvaluacion('${e.proveedor}', '${e.anio}')">🗑️</button></td>
            </tr>
        `).join('');
    }
}

function guardarNumeroFormularioDirecto(key, inputId) {
    const val = document.getElementById(inputId)?.value;
    if (val) {
        alert(`Número de formulario ${val} asignado.`);
    }
}

function eliminarRequisito(cod) {
    let db = getDB();
    db.requisitos = db.requisitos.filter(r => r.codigo !== cod);
    saveDB(db);
    renderizarTablas();
}

function eliminarProveedor(num) {
    let db = getDB();
    db.proveedores = db.proveedores.filter(p => p.num !== num);
    saveDB(db);
    cargarSelectsProveedores();
    renderizarTablas();
}

function eliminarEvaluacion(prov, anio) {
    let db = getDB();
    db.evaluaciones = db.evaluaciones.filter(e => !(e.proveedor === prov && e.anio === anio));
    saveDB(db);
    renderizarTablas();
    renderizarGraficosPestaña3();
}

// Modales Master y Configuración
function abrirModalMaster() { document.getElementById('modal-master').style.display = 'flex'; }
function cerrarModalMaster() { document.getElementById('modal-master').style.display = 'none'; }
function abrirModalGestionPago() { document.getElementById('modal-gestion-pago').style.display = 'flex'; }
function cerrarModalGestionPago() { document.getElementById('modal-gestion-pago').style.display = 'none'; }
