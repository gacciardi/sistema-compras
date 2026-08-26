const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 4000;

// Configuración de PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Crear tablas en la Base de Datos
async function initDB() {
    if (!process.env.DATABASE_URL) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS requisitos (
                num VARCHAR(50) PRIMARY KEY,
                nombre TEXT NOT NULL,
                detalle TEXT
            );

            CREATE TABLE IF NOT EXISTS proveedores (
                num VARCHAR(50) PRIMARY KEY,
                nombre TEXT NOT NULL,
                fecha_eval DATE,
                fecha_prox DATE,
                dias_restantes INT,
                criterios JSONB
            );

            CREATE TABLE IF NOT EXISTS estadisticas (
                id SERIAL PRIMARY KEY,
                prov_num VARCHAR(50),
                prov_nombre TEXT,
                anio VARCHAR(10),
                promedio INT,
                clase VARCHAR(10),
                clase_css VARCHAR(20),
                puntajes JSONB,
                UNIQUE(prov_num, anio)
            );

            CREATE TABLE IF NOT EXISTS compras (
                id_orden VARCHAR(50) PRIMARY KEY,
                prov_num VARCHAR(50),
                prov_nombre TEXT,
                req_num VARCHAR(50),
                req_nombre TEXT,
                req_detalle TEXT,
                cantidad INT,
                fecha_req DATE,
                observaciones TEXT,
                estado VARCHAR(20) DEFAULT 'Pendiente'
            );

            CREATE TABLE IF NOT EXISTS recepciones (
                id SERIAL PRIMARY KEY,
                id_orden VARCHAR(50),
                prov_nombre TEXT,
                remito VARCHAR(50),
                cant_recibida INT,
                empaque VARCHAR(50),
                tiempo VARCHAR(50),
                calidad VARCHAR(50),
                obs TEXT,
                fecha_recepcion TEXT
            );

            CREATE TABLE IF NOT EXISTS usuarios (
                nombre VARCHAR(50) PRIMARY KEY,
                pass TEXT,
                sector VARCHAR(50),
                estado VARCHAR(20)
            );

            CREATE TABLE IF NOT EXISTS configuraciones (
                clave VARCHAR(50) PRIMARY KEY,
                valor JSONB
            );
        `);
        console.log("Base de datos conectada y tablas inicializadas correctamente.");
    } catch (err) {
        console.error("Error al inicializar la base de datos:", err);
    }
}

initDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API ENDPOINTS ---

// Configuraciones globales (Títulos, Logo, Color BG)
app.get('/api/configuraciones', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM configuraciones');
        const config = {};
        result.rows.forEach(r => { config[r.clave] = r.valor; });
        res.json(config);
    } catch (e) { res.json({}); }
});

app.post('/api/configuraciones', async (req, res) => {
    const { clave, valor } = req.body;
    try {
        await pool.query(
            `INSERT INTO configuraciones (clave, valor) VALUES ($1, $2)
             ON CONFLICT (clave) DO UPDATE SET valor=$2`,
            [clave, JSON.stringify(valor)]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Requisitos
app.get('/api/requisitos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM requisitos');
        res.json(result.rows);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/requisitos', async (req, res) => {
    const { num, nombre, detalle } = req.body;
    try {
        await pool.query(
            `INSERT INTO requisitos (num, nombre, detalle) VALUES ($1, $2, $3)
             ON CONFLICT (num) DO UPDATE SET nombre=$2, detalle=$3`,
            [num, nombre, detalle]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/requisitos/:num', async (req, res) => {
    try {
        await pool.query('DELETE FROM requisitos WHERE num=$1', [req.params.num]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Proveedores
app.get('/api/proveedores', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM proveedores');
        res.json(result.rows);
    } catch (e) { res.json([]); }
});

app.post('/api/proveedores', async (req, res) => {
    const { num, nombre, fechaEval, fechaProx, diasRestantes, criterios } = req.body;
    try {
        await pool.query(
            `INSERT INTO proveedores (num, nombre, fecha_eval, fecha_prox, dias_restantes, criterios)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (num) DO UPDATE SET nombre=$2, fecha_eval=$3, fecha_prox=$4, dias_restantes=$5, criterios=$6`,
            [num, nombre, fechaEval, fechaProx, diasRestantes, JSON.stringify(criterios)]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/proveedores/:num', async (req, res) => {
    try {
        await pool.query('DELETE FROM proveedores WHERE num=$1', [req.params.num]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Estadísticas
app.get('/api/estadisticas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM estadisticas');
        res.json(result.rows.map(r => ({
            provNum: r.prov_num,
            provNombre: r.prov_nombre,
            anio: r.anio,
            promedio: r.promedio,
            clase: r.clase,
            claseCSS: r.clase_css,
            puntajes: r.puntajes
        })));
    } catch (e) { res.json([]); }
});

app.post('/api/estadisticas', async (req, res) => {
    const { provNum, provNombre, anio, promedio, clase, claseCSS, puntajes } = req.body;
    try {
        await pool.query(
            `INSERT INTO estadisticas (prov_num, prov_nombre, anio, promedio, clase, clase_css, puntajes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (prov_num, anio) DO UPDATE SET promedio=$4, clase=$5, clase_css=$6, puntajes=$7`,
            [provNum, provNombre, anio, promedio, clase, claseCSS, JSON.stringify(puntajes)]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Compras
app.get('/api/compras', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM compras');
        res.json(result.rows.map(r => ({
            idOrden: r.id_orden,
            provNum: r.prov_num,
            provNombre: r.prov_nombre,
            reqNum: r.req_num,
            reqNombre: r.req_nombre,
            reqDetalle: r.req_detalle,
            cantidad: r.cantidad,
            fechaReq: r.fecha_req,
            observaciones: r.observaciones,
            estado: r.estado
        })));
    } catch (e) { res.json([]); }
});

app.post('/api/compras', async (req, res) => {
    const { idOrden, provNum, provNombre, reqNum, reqNombre, reqDetalle, cantidad, fechaReq, observaciones, estado } = req.body;
    try {
        await pool.query(
            `INSERT INTO compras (id_orden, prov_num, prov_nombre, req_num, req_nombre, req_detalle, cantidad, fecha_req, observaciones, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id_orden) DO UPDATE SET estado=$10`,
            [idOrden, provNum, provNombre, reqNum, reqNombre, reqDetalle, cantidad, fechaReq, observaciones, estado]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Recepciones
app.get('/api/recepciones', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM recepciones');
        res.json(result.rows.map(r => ({
            idOrden: r.id_orden,
            provNombre: r.prov_nombre,
            remito: r.remito,
            cantRecibida: r.cant_recibida,
            empaque: r.empaque,
            tiempo: r.tiempo,
            calidad: r.calidad,
            obs: r.obs,
            fechaRecepcion: r.fecha_recepcion
        })));
    } catch (e) { res.json([]); }
});

app.post('/api/recepciones', async (req, res) => {
    const { idOrden, provNombre, remito, cantRecibida, empaque, tiempo, calidad, obs, fechaRecepcion } = req.body;
    try {
        await pool.query(
            `INSERT INTO recepciones (id_orden, prov_nombre, remito, cant_recibida, empaque, tiempo, calidad, obs, fecha_recepcion)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [idOrden, provNombre, remito, cantRecibida, empaque, tiempo, calidad, obs, fechaRecepcion]
        );
        await pool.query(`UPDATE compras SET estado='Recibido' WHERE id_orden=$1`, [idOrden]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Usuarios
app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM usuarios');
        res.json(result.rows);
    } catch (e) { res.json([]); }
});

app.post('/api/usuarios', async (req, res) => {
    const { nombre, pass, sector, estado } = req.body;
    try {
        await pool.query(
            `INSERT INTO usuarios (nombre, pass, sector, estado) VALUES ($1, $2, $3, $4)
             ON CONFLICT (nombre) DO UPDATE SET pass=$2, sector=$3, estado=$4`,
            [nombre, pass, sector, estado]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
});

JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    await cargarTodoDesdeServidor();
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
async function cargarTodoDesdeServidor() {
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
        if (config.crit_prov_labels) nombresCriteriosProveedores = config.crit_prov_labels;
        if (config.crit_stat_labels) nombresCriteriosEstadisticas = config.crit_stat_labels;
        if (config.sys_bg_color) cambiarColorBg(config.sys_bg_color, false);
        if (config.sys_logo) cambiarLogo(config.sys_logo, false);

        cargarNombresCriteriosProveedores();
        cargarNombresCriteriosEstadisticas();

        renderizarTablaRequisitos();
        renderizarTablaProveedores();
        renderizarTablaEstadisticas();
        renderizarTablaCompras();
        renderizarTablaRecepciones();
        renderizarTablaUsuarios();
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
    const detalle = document.getElementById('detalle-requisito').value.trim();

    await fetch('/api/requisitos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num, nombre, detalle })
    });

    document.getElementById('form-requisito').reset();
    await cargarTodoDesdeServidor();
}

function renderizarTablaRequisitos() {
    const tbody = document.getElementById('tabla-requisitos-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    requisitos.forEach((req) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${req.num}</strong></td>
            <td>${req.nombre}</td>
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
    await cargarTodoDesdeServidor();
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

async function guardarNombresCriteriosProveedores() {
    for (let i = 1; i <= 6; i++) {
        const val = document.getElementById(`crit-nombre-${i}`).value.trim();
        if (val) {
            nombresCriteriosProveedores[i - 1] = val;
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
        if (el) el.value = nombresCriteriosProveedores[i - 1];
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

async function guardarProveedor(e) {
    e.preventDefault();

    await guardarNombresCriteriosProveedores();

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

    await fetch('/api/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num, nombre, fechaEval, fechaProx, diasRestantes, criterios })
    });

    document.getElementById('form-proveedor').reset();
    cargarNombresCriteriosProveedores();
    document.getElementById('caja-dias-restantes').innerText = '0';
    await cargarTodoDesdeServidor();
}

function renderizarTablaProveedores() {
    const tbody = document.getElementById('tabla-proveedores-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    proveedores.forEach((p) => {
        const tr = document.createElement('tr');
        const fEval = p.fecha_eval ? p.fecha_eval.split('T')[0] : p.fechaEval;
        const fProx = p.fecha_prox ? p.fecha_prox.split('T')[0] : p.fechaProx;
        const dRest = p.dias_restantes !== undefined ? p.dias_restantes : p.diasRestantes;

        tr.innerHTML = `
            <td><strong>${p.num}</strong></td>
            <td>${p.nombre}</td>
            <td>${fEval || ''}</td>
            <td>${fProx || ''}</td>
            <td><strong>${dRest || 0} días</strong></td>
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
    document.getElementById('fecha-evaluacion').value = p.fecha_eval ? p.fecha_eval.split('T')[0] : p.fechaEval;
    document.getElementById('proxima-evaluacion').value = p.fecha_prox ? p.fecha_prox.split('T')[0] : p.fechaProx;

    if (p.criterios && Array.isArray(p.criterios)) {
        p.criterios.forEach((crit, index) => {
            const i = index + 1;
            const lbl = document.getElementById(`crit-nombre-${i}`);
            const val = document.getElementById(`crit-cant-${i}`);
            if (lbl) lbl.value = crit.nombre;
            if (val) val.value = crit.cantidad;
        });
    }

    calcularDiasDiferencia();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarProveedor(num) {
    await fetch(`/api/proveedores/${num}`, { method: 'DELETE' });
    await cargarTodoDesdeServidor();
}


// --- PESTAÑA 3: ESTADÍSTICAS Y CLASIFICACIÓN MULTIANUAL ---
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

async function guardarNombresCriteriosEstadisticas() {
    for (let i = 1; i <= 6; i++) {
        const val = document.getElementById(`lbl-stat-${i}`).value.trim();
        if (val) {
            nombresCriteriosEstadisticas[i - 1] = val;
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
        if (el) el.value = nombresCriteriosEstadisticas[i - 1];
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

async function calcularEstadistica(e) {
    e.preventDefault();

    const provNum = document.getElementById('select-prov-estadistica').value;
    const anio = document.getElementById('select-anio-estadistica').value;
    if (!provNum || !anio) return;

    await guardarNombresCriteriosEstadisticas();

    const proveedor = proveedores.find(p => p.num === provNum);
    const { promedio, clase, claseCSS } = calcularPuntajeClase();

    const puntajes = [];
    for (let i = 1; i <= 6; i++) {
        puntajes.push(parseFloat(document.getElementById(`stat-val-${i}`).value) || 0);
    }

    const registro = {
        provNum,
        provNombre: proveedor ? proveedor.nombre : 'Desconocido',
        anio,
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
    cargarNombresCriteriosEstadisticas();
    document.getElementById('stat-promedio').innerText = '0 pts';
    document.getElementById('stat-clase').innerText = 'Clase D';
    document.getElementById('stat-clase').className = 'clase-badge badge-d';

    await cargarTodoDesdeServidor();
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
        tr.innerHTML = `
            <td><strong>${s.anio}</strong></td>
            <td>${s.provNum}</td>
            <td>${s.provNombre}</td>
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

    await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaOrden)
    });

    generarPDFOrden(nuevaOrden);
    document.getElementById('form-compras').reset();
    await cargarTodoDesdeServidor();
}

function renderizarTablaCompras() {
    const tbody = document.getElementById('tabla-compras-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    ordenesCompra.forEach(oc => {
        const tr = document.createElement('tr');
        const badgeClass = oc.estado === 'Pendiente' ? 'status-badge-pending' : 'status-badge-received';
        const fReq = oc.fechaReq ? oc.fechaReq.split('T')[0] : '';

        tr.innerHTML = `
            <td><strong>${oc.idOrden}</strong></td>
            <td>${oc.provNombre}</td>
            <td>${oc.reqNombre}</td>
            <td>${oc.cantidad}</td>
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
        fechaRecepcion: new Date().toLocaleDateString()
    };

    await fetch('/api/recepciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaRec)
    });

    document.getElementById('form-recepcion').reset();
    await cargarTodoDesdeServidor();
    actualizarSelectOrdenesPendientes();
}

function renderizarTablaRecepciones() {
    const tbody = document.getElementById('tabla-recepcion-body');
    if (!tbody) return;
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

async function guardarUsuario(e) {
    e.preventDefault();

    const nombre = document.getElementById('usr-nombre').value.trim();
    const pass = document.getElementById('usr-pass').value;
    const sector = document.getElementById('usr-sector').value;
    const estado = document.getElementById('usr-estado').value;

    await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, pass, sector, estado })
    });

    document.getElementById('form-usuarios').reset();
    await cargarTodoDesdeServidor();
    renderizarTablaMasterUsuarios();
}

function renderizarTablaUsuarios() {
    const tbody = document.getElementById('tabla-usuarios-body');
    if (!tbody) return;
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

async function alternarEstadoUsuario(nombre) {
    const u = usuarios.find(usr => usr.nombre === nombre);
    if (u) {
        u.estado = u.estado === 'Activo' ? 'Inactivo' : 'Activo';
        await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(u)
        });
        await cargarTodoDesdeServidor();
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