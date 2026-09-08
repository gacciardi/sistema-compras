const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de archivos de persistencia
const DATA_FILE = path.join(__dirname, 'data.json');

// Estructura de la base de datos local con usuario por defecto
let baseDeDatos = {
    requisitos: [],
    proveedores: [],
    estadisticas: [],
    compras: [],
    recepciones: [],
    usuarios: [
        { nombre: 'admin', pass: '1234', sector: 'Administración', estado: 'Activo' }
    ],
    configuraciones: {
        master_password: '1234',
        sys_title: 'Sistema de Gestión e Inspección de Compras',
        sys_bg_color: '#e57373',
        sys_logo: '',
        lista_sectores: ['Compras', 'Almacén / Depósito', 'Calidad', 'Expedición', 'Administración'],
        permisos_sectores: {
            'Compras': [1, 2, 3, 4, 5],
            'Almacén / Depósito': [1, 5],
            'Calidad': [1, 3, 5],
            'Expedición': [1, 5],
            'Administración': [1, 2, 3, 4, 5, 6]
        },
        permisos_proveedores_usuarios: {},
        crit_prov_labels: ["Cumplimiento de Entrega", "Calidad Insumos/Servicios", "Condicion de Pago", "Plazo de Entrega", "Atencion", "Respuesta a Reclamos"],
        crit_stat_labels: ["Cumplimiento de Entrega (Auto)", "Calidad Insumos/Servicios", "Condicion de Pago (OC)", "Plazo de Entrega (OC)", "Atencion", "Respuesta a Reclamos"],
        tabla_condicion_pago_puntos: { 'Prepago': 10, 'Contado': 35, 'Cuenta corriente': 70, 'Plazos': 95 }
    }
};

// Cargar datos al iniciar
function cargarBaseDeDatos() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const rawData = fs.readFileSync(DATA_FILE, 'utf8');
            const datosGuardados = JSON.parse(rawData);
            baseDeDatos = { ...baseDeDatos, ...datosGuardados };

            // Garantizar que siempre haya al menos un usuario activo
            if (!baseDeDatos.usuarios || baseDeDatos.usuarios.length === 0) {
                baseDeDatos.usuarios = [
                    { nombre: 'admin', pass: '1234', sector: 'Administración', estado: 'Activo' }
                ];
            }
        } catch (e) {
            console.error("Error al leer data.json:", e);
        }
    } else {
        guardarBaseDeDatos();
    }
}

function guardarBaseDeDatos() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(baseDeDatos, null, 2), 'utf8');
    } catch (e) {
        console.error("Error al guardar data.json:", e);
    }
}

cargarBaseDeDatos();

// --- ENDPOINTS DE CONFIGURACIONES ---
app.get('/api/configuraciones', (req, res) => {
    res.json(baseDeDatos.configuraciones || {});
});

app.post('/api/configuraciones', (req, res) => {
    const { clave, valor } = req.body;
    if (clave) {
        baseDeDatos.configuraciones[clave] = valor;
        guardarBaseDeDatos();
        res.json({ status: 'ok' });
    } else {
        res.status(400).json({ error: 'Falta la clave' });
    }
});

// --- ENDPOINTS DE REQUISITOS ---
app.get('/api/requisitos', (req, res) => {
    res.json(baseDeDatos.requisitos || []);
});

app.post('/api/requisitos', (req, res) => {
    const reqItem = req.body;
    const index = baseDeDatos.requisitos.findIndex(r => r.num === reqItem.num);
    if (index !== -1) {
        baseDeDatos.requisitos[index] = { ...baseDeDatos.requisitos[index], ...reqItem };
    } else {
        baseDeDatos.requisitos.push(reqItem);
    }
    guardarBaseDeDatos();
    res.json({ status: 'ok' });
});

app.delete('/api/requisitos/:num', (req, res) => {
    baseDeDatos.requisitos = baseDeDatos.requisitos.filter(r => r.num !== req.params.num);
    guardarBaseDeDatos();
    res.json({ status: 'ok' });
});

// --- ENDPOINTS DE PROVEEDORES ---
app.get('/api/proveedores', (req, res) => {
    res.json(baseDeDatos.proveedores || []);
});

app.post('/api/proveedores', (req, res) => {
    const provItem = req.body;
    const index = baseDeDatos.proveedores.findIndex(p => p.num === provItem.num);
    if (index !== -1) {
        baseDeDatos.proveedores[index] = { ...baseDeDatos.proveedores[index], ...provItem };
    } else {
        baseDeDatos.proveedores.push(provItem);
    }
    guardarBaseDeDatos();
    res.json({ status: 'ok' });
});

app.delete('/api/proveedores/:num', (req, res) => {
    baseDeDatos.proveedores = baseDeDatos.proveedores.filter(p => p.num !== req.params.num);
    guardarBaseDeDatos();
    res.json({ status: 'ok' });
});

// --- ENDPOINTS DE EVALUACIONES/ESTADÍSTICAS ---
app.get('/api/estadisticas', (req, res) => {
    res.json(baseDeDatos.estadisticas || []);
});

app.post('/api/estadisticas', (req, res) => {
    const statItem = req.body;
    const index = baseDeDatos.estadisticas.findIndex(s => s.provNum === statItem.provNum && s.anio === statItem.anio);
    if (index !== -1) {
        baseDeDatos.estadisticas[index] = { ...baseDeDatos.estadisticas[index], ...statItem };
    } else {
        baseDeDatos.estadisticas.push(statItem);
    }
    guardarBaseDeDatos();
    res.json({ status: 'ok' });
});

// --- ENDPOINTS DE ÓRDENES DE COMPRA (P4) ---
app.get('/api/compras', (req, res) => {
    res.json(baseDeDatos.compras || []);
});

app.post('/api/compras', (req, res) => {
    const nuevaOrden = req.body;
    const index = baseDeDatos.compras.findIndex(o => o.idOrden === nuevaOrden.idOrden);

    if (index !== -1) {
        baseDeDatos.compras[index] = {
            ...baseDeDatos.compras[index],
            ...nuevaOrden,
            tipoOrden: nuevaOrden.tipoOrden
        };
    } else {
        baseDeDatos.compras.push(nuevaOrden);
    }

    guardarBaseDeDatos();
    res.json({ status: 'ok', orden: baseDeDatos.compras[index !== -1 ? index : baseDeDatos.compras.length - 1] });
});

app.delete('/api/compras/:idOrden', (req, res) => {
    baseDeDatos.compras = baseDeDatos.compras.filter(o => o.idOrden !== req.params.idOrden);
    guardarBaseDeDatos();
    res.json({ status: 'ok' });
});

// --- ENDPOINTS DE RECEPCIONES (P5) ---
app.get('/api/recepciones', (req, res) => {
    res.json(baseDeDatos.recepciones || []);
});

app.post('/api/recepciones', (req, res) => {
    const recItem = req.body;
    baseDeDatos.recepciones.push(recItem);
    guardarBaseDeDatos();
    res.json({ status: 'ok' });
});

// --- ENDPOINTS DE USUARIOS (P6) ---
app.get('/api/usuarios', (req, res) => {
    res.json(baseDeDatos.usuarios || []);
});

app.post('/api/usuarios', (req, res) => {
    const usrItem = req.body;
    const index = baseDeDatos.usuarios.findIndex(u => u.nombre.toLowerCase() === usrItem.nombre.toLowerCase());
    if (index !== -1) {
        baseDeDatos.usuarios[index] = { ...baseDeDatos.usuarios[index], ...usrItem };
    } else {
        baseDeDatos.usuarios.push(usrItem);
    }
    guardarBaseDeDatos();
    res.json({ status: 'ok' });
});

app.delete('/api/usuarios/:nombre', (req, res) => {
    const usrNombre = decodeURIComponent(req.params.nombre).toLowerCase();
    baseDeDatos.usuarios = baseDeDatos.usuarios.filter(u => u.nombre.toLowerCase() !== usrNombre);
    guardarBaseDeDatos();
    res.json({ status: 'ok' });
});

// Limpieza de datos desde Panel Master
app.post('/api/master/limpiar-bd', (req, res) => {
    baseDeDatos.estadisticas = [];
    baseDeDatos.compras = [];
    baseDeDatos.recepciones = [];
    guardarBaseDeDatos();
    res.json({ message: 'Base de datos de pruebas limpiada exitosamente.' });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
