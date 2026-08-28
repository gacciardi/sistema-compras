const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de conexión a PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Inicialización de Tablas en PostgreSQL
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS configuraciones (
                clave VARCHAR(255) PRIMARY KEY,
                valor JSONB
            );

            CREATE TABLE IF NOT EXISTS requisitos (
                num VARCHAR(100) PRIMARY KEY,
                num_formulario VARCHAR(255),
                nombre VARCHAR(255),
                fecha DATE,
                detalle TEXT
            );

            CREATE TABLE IF NOT EXISTS proveedores (
                num VARCHAR(100) PRIMARY KEY,
                num_formulario VARCHAR(255),
                nombre VARCHAR(255),
                criterios JSONB
            );

            CREATE TABLE IF NOT EXISTS estadisticas (
                id SERIAL PRIMARY KEY,
                num_formulario VARCHAR(255),
                version VARCHAR(100),
                prov_num VARCHAR(100),
                prov_nombre VARCHAR(255),
                anio VARCHAR(10),
                fecha_eval DATE,
                dias_plazo INT,
                fecha_prox DATE,
                promedio INT,
                clase VARCHAR(50),
                clase_css VARCHAR(50),
                puntajes JSONB
            );

            CREATE TABLE IF NOT EXISTS compras (
                id_orden VARCHAR(100) PRIMARY KEY,
                num_formulario VARCHAR(255),
                prov_num VARCHAR(100),
                prov_nombre VARCHAR(255),
                req_num VARCHAR(100),
                req_nombre VARCHAR(255),
                req_detalle TEXT,
                cantidad INT,
                fecha_emision DATE,
                fecha_req DATE,
                observaciones TEXT,
                pago_eval INT,
                plazo_eval INT,
                estado VARCHAR(50)
            );

            CREATE TABLE IF NOT EXISTS recepciones (
                id SERIAL PRIMARY KEY,
                num_formulario VARCHAR(255),
                id_orden VARCHAR(100),
                prov_nombre VARCHAR(255),
                remito VARCHAR(255),
                cant_recibida INT,
                empaque VARCHAR(100),
                tiempo VARCHAR(100),
                calidad VARCHAR(100),
                obs TEXT,
                fecha_recepcion DATE
            );

            CREATE TABLE IF NOT EXISTS usuarios (
                nombre VARCHAR(255) PRIMARY KEY,
                pass VARCHAR(255),
                sector VARCHAR(100),
                estado VARCHAR(50)
            );
        `);
        console.log("✅ Tablas de PostgreSQL verificadas/creadas correctamente.");
    } catch (err) {
        console.error("❌ Error al inicializar tablas en PostgreSQL:", err);
    }
}

initDB();

// --- RUTAS DE CONFIGURACIÓN ---
app.get('/api/configuraciones', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT clave, valor FROM configuraciones');
        const configMap = {};
        rows.forEach(r => configMap[r.clave] = r.valor);
        res.json(configMap);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/configuraciones', async (req, res) => {
    const { clave, valor } = req.body;
    try {
        await pool.query(
            'INSERT INTO configuraciones (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO UPDATE SET valor = $2',
            [clave, JSON.stringify(valor)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RUTAS REQUISITOS ---
app.get('/api/requisitos', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT num_formulario AS "numFormulario", num, nombre, fecha, detalle FROM requisitos ORDER BY num ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/requisitos', async (req, res) => {
    const { numFormulario, num, nombre, fecha, detalle } = req.body;
    try {
        await pool.query(
            'INSERT INTO requisitos (num_formulario, num, nombre, fecha, detalle) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (num) DO UPDATE SET num_formulario = $1, nombre = $3, fecha = $4, detalle = $5',
            [numFormulario, num, nombre, fecha || null, detalle]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/requisitos/:num', async (req, res) => {
    try {
        await pool.query('DELETE FROM requisitos WHERE num = $1', [req.params.num]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RUTAS PROVEEDORES ---
app.get('/api/proveedores', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT num_formulario AS "numFormulario", num, nombre, criterios FROM proveedores ORDER BY num ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/proveedores', async (req, res) => {
    const { numFormulario, num, nombre, criterios } = req.body;
    try {
        await pool.query(
            'INSERT INTO proveedores (num_formulario, num, nombre, criterios) VALUES ($1, $2, $3, $4) ON CONFLICT (num) DO UPDATE SET num_formulario = $1, nombre = $3, criterios = $4',
            [numFormulario, num, nombre, JSON.stringify(criterios)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/proveedores/:num', async (req, res) => {
    try {
        await pool.query('DELETE FROM proveedores WHERE num = $1', [req.params.num]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RUTAS ESTADÍSTICAS ---
app.get('/api/estadisticas', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT num_formulario AS "numFormulario", version, prov_num AS "provNum", prov_nombre AS "provNombre", anio, fecha_eval AS "fechaEval", dias_plazo AS "diasPlazo", fecha_prox AS "fechaProx", promedio, clase, clase_css AS "claseCSS", puntajes FROM estadisticas ORDER BY anio DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/estadisticas', async (req, res) => {
    const { numFormulario, version, provNum, provNombre, anio, fechaEval, diasPlazo, fechaProx, promedio, clase, claseCSS, puntajes } = req.body;
    try {
        await pool.query('DELETE FROM estadisticas WHERE prov_num = $1 AND anio = $2', [provNum, anio]);
        await pool.query(
            'INSERT INTO estadisticas (num_formulario, version, prov_num, prov_nombre, anio, fecha_eval, dias_plazo, fecha_prox, promedio, clase, clase_css, puntajes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
            [numFormulario, version, provNum, provNombre, anio, fechaEval || null, diasPlazo, fechaProx || null, promedio, clase, claseCSS, JSON.stringify(puntajes)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RUTAS COMPRAS ---
app.get('/api/compras', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id_orden AS "idOrden", num_formulario AS "numFormulario", prov_num AS "provNum", prov_nombre AS "provNombre", req_num AS "reqNum", req_nombre AS "reqNombre", req_detalle AS "reqDetalle", cantidad, fecha_emision AS "fechaEmision", fecha_req AS "fechaReq", observaciones, pago_eval AS "pagoEval", plazo_eval AS "plazoEval", estado FROM compras ORDER BY id_orden DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/compras', async (req, res) => {
    const { idOrden, numFormulario, provNum, provNombre, reqNum, reqNombre, reqDetalle, cantidad, fechaEmision, fechaReq, observaciones, pagoEval, plazoEval, estado } = req.body;
    try {
        await pool.query(
            'INSERT INTO compras (id_orden, num_formulario, prov_num, prov_nombre, req_num, req_nombre, req_detalle, cantidad, fecha_emision, fecha_req, observaciones, pago_eval, plazo_eval, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (id_orden) DO UPDATE SET num_formulario = $2, prov_num = $3, prov_nombre = $4, req_num = $5, req_nombre = $6, req_detalle = $7, cantidad = $8, fecha_emision = $9, fecha_req = $10, observaciones = $11, pago_eval = $12, plazo_eval = $13, estado = $14',
            [idOrden, numFormulario, provNum, provNombre, reqNum, reqNombre, reqDetalle, cantidad, fechaEmision || null, fechaReq || null, observaciones, pagoEval, plazoEval, estado]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RUTAS RECEPCIONES ---
app.get('/api/recepciones', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, num_formulario AS "numFormulario", id_orden AS "idOrden", prov_nombre AS "provNombre", remito, cant_recibida AS "cantRecibida", empaque, tiempo, calidad, obs, fecha_recepcion AS "fechaRecepcion" FROM recepciones ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/recepciones', async (req, res) => {
    const { numFormulario, idOrden, provNombre, remito, cantRecibida, empaque, tiempo, calidad, obs, fechaRecepcion } = req.body;
    try {
        await pool.query(
            'INSERT INTO recepciones (num_formulario, id_orden, prov_nombre, remito, cant_recibida, empaque, tiempo, calidad, obs, fecha_recepcion) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
            [numFormulario, idOrden, provNombre, remito, cantRecibida, empaque, tiempo, calidad, obs, fechaRecepcion || null]
        );
        await pool.query('UPDATE compras SET estado = $1 WHERE id_orden = $2', ['Recibido', idOrden]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RUTAS USUARIOS ---
app.get('/api/usuarios', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT nombre, pass, sector, estado FROM usuarios ORDER BY nombre ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/usuarios', async (req, res) => {
    const { nombre, pass, sector, estado } = req.body;
    try {
        await pool.query(
            'INSERT INTO usuarios (nombre, pass, sector, estado) VALUES ($1, $2, $3, $4) ON CONFLICT (nombre) DO UPDATE SET pass = $2, sector = $3, estado = $4',
            [nombre, pass, sector, estado]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/usuarios/:nombre', async (req, res) => {
    try {
        await pool.query('DELETE FROM usuarios WHERE nombre = $1', [req.params.nombre]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RUTA MASTER PARA REINICIAR / VACIAR LA BASE DE DATOS ---
app.post('/api/master/limpiar-bd', async (req, res) => {
    try {
        await pool.query('TRUNCATE TABLE requisitos, proveedores, estadisticas, compras, recepciones RESTART IDENTITY CASCADE;');
        res.json({ success: true, message: 'Base de datos limpiada correctamente. Todas las transacciones de prueba han sido eliminadas.' });
    } catch (err) {
        console.error("Error al limpiar BD:", err);
        res.status(500).json({ error: 'Error al intentar vaciar la base de datos.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
});