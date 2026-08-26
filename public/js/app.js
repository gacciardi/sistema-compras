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

    // Cargar select de proveedores si se abre la pestaña 3
    if (tabId === 'tab-estadisticas') {
        actualizarSelectProveedores();
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
                <button class="btn-danger" onclick="eliminarProveedor('${p.num}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function eliminarProveedor(num) {
    proveedores = proveedores.filter(p => p.num !== num);
    renderizarTablaProveedores();
}


// --- PESTAÑA 3: ESTADÍSTICAS Y CLASIFICACIÓN ---
let estadisticas = [];

function actualizarSelectProveedores() {
    const select = document.getElementById('select-prov-estadistica');
    select.innerHTML = '<option value="">-- Seleccione un Proveedor --</option>';

    proveedores.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.num;
        opt.innerText = `${p.num} - ${p.nombre}`;
        select.appendChild(opt);
    });
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

    const proveedor = proveedores.find(p => p.num === provNum);
    const { promedio, clase, claseCSS } = calcularPuntajeClase();

    const index = estadisticas.findIndex(e => e.provNum === provNum);
    const registro = {
        provNum,
        provNombre: proveedor ? proveedor.nombre : 'Desconocido',
        promedio,
        clase,
        claseCSS
    };

    if (index !== -1) {
        estadisticas[index] = registro;
    } else {
        estadisticas.push(registro);
    }

    document.getElementById('form-estadisticas').reset();
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
                <button class="btn-danger" onclick="eliminarEstadistica('${s.provNum}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function eliminarEstadistica(provNum) {
    estadisticas = estadisticas.filter(s => s.provNum !== provNum);
    renderizarTablaEstadisticas();
}