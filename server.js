const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de la Base de Datos PostgreSQL o fallback local JSON
const usePostgres = !!process.env.DATABASE_URL;
let pool = null;

if (usePostgres) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
}

const DATA_FILE = path.join(__dirname, 'data.json');

const defaultData = {
    requisitos: [],
    proveedores: [],
    estadisticas: [],
    compras: [],
    recepciones: [],
    usuarios: [{ nombre: "admin", pass: "1234", sector: "Administración", estado: "Activo" }],
    configuraciones: {}
};

// Inicializar BD
async function initDB() {
    if (usePostgres) {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS sistema_datos (
                    id VARCHAR(50) PRIMARY KEY,
                    contenido JSONB NOT NULL
                )
            `);
            const res = await pool.query('SELECT contenido FROM sistema_datos WHERE id = $1', ['datos_principales']);
            if (res.rows.length === 0) {
                await pool.query('INSERT INTO sistema_datos (id, contenido) VALUES ($1, $2)', ['datos_principales', defaultData]);
            }
            console.log("✅ Conectado exitosamente a PostgreSQL en Render");
        } catch (err) {
            console.error("❌ Error inicializando PostgreSQL:", err);
        }
    } else {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
        }
    }
}

initDB();

async function obtenerDatos() {
    if (usePostgres) {
        try {
            const res = await pool.query('SELECT contenido FROM sistema_datos WHERE id = $1', ['datos_principales']);
            return res.rows[0]?.contenido || defaultData;
        } catch (e) {
            console.error(e);
            return defaultData;
        }
    } else {
        try {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } catch (e) {
            return defaultData;
        }
    }
}

async function guardarDatos(datos) {
    if (usePostgres) {
        try {
            await pool.query(
                'INSERT INTO sistema_datos (id, contenido) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET contenido = $2',
                ['datos_principales', datos]
            );
        } catch (e) {
            console.error("Error al guardar en PostgreSQL:", e);
        }
    } else {
        fs.writeFileSync(DATA_FILE, JSON.stringify(datos, null, 2));
    }
}

// Rutas API
app.get('/api/requisitos', async (req, res) => res.json((await obtenerDatos()).requisitos || []));
app.post('/api/requisitos', async (req, res) => {
    const datos = await obtenerDatos();
    datos.requisitos = datos.requisitos || [];
    const index = datos.requisitos.findIndex(r => r.num === req.body.num);
    if (index !== -1) datos.requisitos[index] = req.body;
    else datos.requisitos.push(req.body);
    await guardarDatos(datos);
    res.json({ status: 'ok' });
});
app.delete('/api/requisitos/:num', async (req, res) => {
    const datos = await obtenerDatos();
    datos.requisitos = (datos.requisitos || []).filter(r => r.num !== req.params.num);
    await guardarDatos(datos);
    res.json({ status: 'ok' });
});

app.get('/api/proveedores', async (req, res) => res.json((await obtenerDatos()).proveedores || []));
app.post('/api/proveedores', async (req, res) => {
    const datos = await obtenerDatos();
    datos.proveedores = datos.proveedores || [];
    const index = datos.proveedores.findIndex(p => p.num === req.body.num);
    if (index !== -1) datos.proveedores[index] = req.body;
    else datos.proveedores.push(req.body);
    await guardarDatos(datos);
    res.json({ status: 'ok' });
});
app.delete('/api/proveedores/:num', async (req, res) => {
    const datos = await obtenerDatos();
    datos.proveedores = (datos.proveedores || []).filter(p => p.num !== req.params.num);
    await guardarDatos(datos);
    res.json({ status: 'ok' });
});

app.get('/api/estadisticas', async (req, res) => res.json((await obtenerDatos()).estadisticas || []));
app.post('/api/estadisticas', async (req, res) => {
    const datos = await obtenerDatos();
    datos.estadisticas = datos.estadisticas || [];
    const index = datos.estadisticas.findIndex(e => e.provNum === req.body.provNum && e.anio === req.body.anio);
    if (index !== -1) datos.estadisticas[index] = req.body;
    else datos.estadisticas.push(req.body);
    await guardarDatos(datos);
    res.json({ status: 'ok' });
});

app.get('/api/compras', async (req, res) => res.json((await obtenerDatos()).compras || []));
app.post('/api/compras', async (req, res) => {
    const datos = await obtenerDatos();
    datos.compras = datos.compras || [];
    const index = datos.compras.findIndex(c => c.idOrden === req.body.idOrden);
    if (index !== -1) datos.compras[index] = req.body;
    else datos.compras.push(req.body);
    await guardarDatos(datos);
    res.json({ status: 'ok' });
});
app.delete('/api/compras/:idOrden', async (req, res) => {
    const datos = await obtenerDatos();
    datos.compras = (datos.compras || []).filter(c => c.idOrden !== req.params.idOrden);
    await guardarDatos(datos);
    res.json({ status: 'ok' });
});

app.get('/api/recepciones', async (req, res) => res.json((await obtenerDatos()).recepciones || []));
app.post('/api/recepciones', async (req, res) => {
    const datos = await obtenerDatos();
    datos.recepciones = datos.recepciones || [];
    datos.recepciones.push(req.body);
    await guardarDatos(datos);
    res.json({ status: 'ok' });
});

app.get('/api/usuarios', async (req, res) => res.json((await obtenerDatos()).usuarios || []));
app.post('/api/usuarios', async (req, res) => {
    const datos = await obtenerDatos();
    datos.usuarios = datos.usuarios || [];
    const index = datos.usuarios.findIndex(u => u.nombre.toLowerCase() === req.body.nombre.toLowerCase());
    if (index !== -1) datos.usuarios[index] = req.body;
    else datos.usuarios.push(req.body);
    await guardarDatos(datos);
    res.json({ status: 'ok' });
});
app.delete('/api/usuarios/:nombre', async (req, res) => {
    const datos = await obtenerDatos();
    datos.usuarios = (datos.usuarios || []).filter(u => u.nombre.toLowerCase() !== req.params.nombre.toLowerCase());
    await guardarDatos(datos);
    res.json({ status: 'ok' });
});

app.get('/api/configuraciones', async (req, res) => res.json((await obtenerDatos()).configuraciones || {}));
app.post('/api/configuraciones', async (req, res) => {
    const datos = await obtenerDatos();
    datos.configuraciones = datos.configuraciones || {};
    datos.configuraciones[req.body.clave] = req.body.valor;
    await guardarDatos(datos);
    res.json({ status: 'ok' });
});

app.post('/api/master/limpiar-bd', async (req, res) => {
    const datos = await obtenerDatos();
    datos.estadisticas = [];
    datos.compras = [];
    datos.recepciones = [];
    await guardarDatos(datos);
    res.json({ message: "Base de datos limpia correctamente." });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
});
