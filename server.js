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
                fecha DATE,
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
                fecha_emision DATE,
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
                fecha_recepcion DATE
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

        // Migración automática para agregar columnas si la tabla ya existía
        await pool.query(`
            ALTER TABLE requisitos ADD COLUMN IF NOT EXISTS fecha DATE;
            ALTER TABLE compras ADD COLUMN IF NOT EXISTS fecha_emision DATE;
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

// Configuraciones globales
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
    const { num, nombre, fecha, detalle } = req.body;
    try {
        await pool.query(
            `INSERT INTO requisitos (num, nombre, fecha, detalle) VALUES ($1, $2, $3, $4)
             ON CONFLICT (num) DO UPDATE SET nombre=$2, fecha=$3, detalle=$4`,
            [num, nombre, fecha, detalle]
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
            fechaEmision: r.fecha_emision,
            fechaReq: r.fecha_req,
            observaciones: r.observaciones,
            estado: r.estado
        })));
    } catch (e) { res.json([]); }
});

app.post('/api/compras', async (req, res) => {
    const { idOrden, provNum, provNombre, reqNum, reqNombre, reqDetalle, cantidad, fechaEmision, fechaReq, observaciones, estado } = req.body;
    try {
        await pool.query(
            `INSERT INTO compras (id_orden, prov_num, prov_nombre, req_num, req_nombre, req_detalle, cantidad, fecha_emision, fecha_req, observaciones, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id_orden) DO UPDATE SET estado=$11`,
            [idOrden, provNum, provNombre, reqNum, reqNombre, reqDetalle, cantidad, fechaEmision, fechaReq, observaciones, estado]
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

app.delete('/api/usuarios/:nombre', async (req, res) => {
    try {
        await pool.query('DELETE FROM usuarios WHERE nombre=$1', [req.params.nombre]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
});