// VARIABLES GLOBALES DE INSTANCIA DE GRÁFICOS
let radarChartInstance = null;
let pieChartInstance = null;

// EVENTO DE CARGA INICIAL
document.addEventListener('DOMContentLoaded', () => {
    evaluarAnioSeleccionado();
    renderizarGraficosPestaña3();
});

// NAVEGACIÓN DE PESTAÑAS
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

// GESTIÓN DE AÑO ACTUAL vs HISTÓRICO
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
    calcularPuntajeClase();
    actualizarGraficoRadar();
}

// CÁLCULO DE PROMEDIO Y CLASIFICACIÓN (CLASE A, B, C, D)
function calcularPuntajeClase() {
    const v1 = parseFloat(document.getElementById('stat-val-1')?.value) || 0; // Cumplimiento Entrega (Auto/Manual)
    const v2 = parseFloat(document.getElementById('stat-val-2')?.value) || 0; // Calidad
    const v3 = parseFloat(document.getElementById('stat-val-3')?.value) || 0; // Condicion Pago (Auto/Manual)
    const v5 = parseFloat(document.getElementById('stat-val-5')?.value) || 0; // Atención
    const v6 = parseFloat(document.getElementById('stat-val-6')?.value) || 0; // Respuesta a Reclamos

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

// RENDERIZADO INICIAL DE AMBOS GRÁFICOS
function renderizarGraficosPestaña3() {
    renderizarGraficoRadar();
    renderizarGraficoPie();
}

// GRÁFICO 1: RADAR / ARAÑA DE 5 VARIABLES DEL PROVEEDOR
function renderizarGraficoRadar() {
    const ctx = document.getElementById('chart-radar-proveedor');
    if (!ctx) return;

    if (radarChartInstance) {
        radarChartInstance.destroy();
    }

    const v1 = parseFloat(document.getElementById('stat-val-1')?.value) || 0;
    const v2 = parseFloat(document.getElementById('stat-val-2')?.value) || 0;
    const v3 = parseFloat(document.getElementById('stat-val-3')?.value) || 0;
    const v5 = parseFloat(document.getElementById('stat-val-5')?.value) || 0;
    const v6 = parseFloat(document.getElementById('stat-val-6')?.value) || 0;

    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: [
                'Cumplimiento Entrega',
                'Calidad Insumos',
                'Condición Pago',
                'Atención',
                'Resp. Reclamos'
            ],
            datasets: [{
                label: 'Desempeño Obtenido (0-100)',
                data: [v1, v2, v3, v5, v6],
                backgroundColor: 'rgba(33, 150, 243, 0.25)',
                borderColor: '#2196F3',
                pointBackgroundColor: '#1976D2',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#1976D2',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: '#e0e0e0' },
                    grid: { color: '#f0f0f0' },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: { stepSize: 20 }
                }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
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

// GRÁFICO 2: TORTA / DOUGHNUT 3D DE CLASIFICACIÓN (% A, B, C, D)
function renderizarGraficoPie() {
    const ctx = document.getElementById('chart-pie-clasificacion');
    if (!ctx) return;

    if (pieChartInstance) {
        pieChartInstance.destroy();
    }

    // Datos globales de ejemplo/distribución actual
    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Clase A (≥90 pts)', 'Clase B (75-89 pts)', 'Clase C (60-74 pts)', 'Clase D (<60 pts)'],
            datasets: [{
                data: [40, 30, 20, 10], // Porcentajes / Cantidades
                backgroundColor: [
                    '#4CAF50', // Verde A
                    '#2196F3', // Azul B
                    '#FF9800', // Naranja C
                    '#F44336'  // Rojo D
                ],
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 15, padding: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw}% del Total`;
                        }
                    }
                }
            },
            cutout: '55%' // Da efecto 3D/Anillo
        }
    });
}

// DUMMIES / STUBS DE SOPORTE DE COMPONENTES
function guardarNumeroFormularioDirecto(id, val) {}
function calcularFechaProximaDesdeDias() {}
function autoCompletarPuntajePago() {}
function abrirModalGestionPago() {}
function cerrarModalGestionPago() {}
function agregarNuevaCondicionDirecta() {}
function guardarCambiosModalPago() {}
function iniciarCompra(e) { e.preventDefault(); }
function cancelarEdicionCompra() {}
function guardarRecepcion(e) { e.preventDefault(); }
function cargarDetalleOrdenPendiente() {}
function guardarRequisito(e) { e.preventDefault(); }
function guardarProveedor(e) { e.preventDefault(); }
function calcularEstadistica(e) { e.preventDefault(); }
function iniciarSesionUsuario(e) { e.preventDefault(); }
function cerrarSesionUsuario() {}
function abrirModalMaster() {}
function cerrarModalMaster() {}
function autenticarMaster() {}
function guardarPermisosSectores() {}
function guardarPermisosProveedoresMaster() {}
function agregarNuevoSectorMaster() {}
function guardarTituloSistema() {}
function cambiarColorBg(val, flag) {}
function subirLogoDesdePC(e) {}
function limpiarBaseDeDatosMaster() {}
function guardarNuevaPasswordMaster() {}
