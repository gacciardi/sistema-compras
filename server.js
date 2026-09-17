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
                fecha_alta DATE,
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
                tipo_orden VARCHAR(50) DEFAULT 'Normal',
                num_formulario VARCHAR(255),
                prov_num VARCHAR(100),
                prov_nombre VARCHAR(255),
                req_num VARCHAR(100),
                req_nombre VARCHAR(255),
                req_detalle TEXT,
                cantidad INT,
                cantidad_necesaria INT,
                saldo_aplicado INT DEFAULT 0,
                valor_unitario NUMERIC(14,2),
                valor_total NUMERIC(16,2),
                fecha_emision DATE,
                fecha_req DATE,
                condicion_pago VARCHAR(255),
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
                fecha_recepcion DATE,
                usuario VARCHAR(255),
                cant_aplicada INT DEFAULT 0,
                cant_excedente INT DEFAULT 0,
                tratamiento_excedente VARCHAR(100) DEFAULT 'Sin excedente',
                prov_num VARCHAR(100),
                req_num VARCHAR(100),
                req_nombre VARCHAR(255)
            );

            CREATE TABLE IF NOT EXISTS excedentes (
                id SERIAL PRIMARY KEY,
                id_recepcion INT,
                id_orden_origen VARCHAR(100),
                prov_num VARCHAR(100),
                prov_nombre VARCHAR(255),
                req_num VARCHAR(100),
                req_nombre VARCHAR(255),
                remito VARCHAR(255),
                fecha DATE,
                cantidad_original INT NOT NULL,
                cantidad_disponible INT NOT NULL,
                tratamiento VARCHAR(100),
                estado VARCHAR(50) DEFAULT 'Disponible'
            );

            CREATE TABLE IF NOT EXISTS aplicaciones_excedentes (
                id SERIAL PRIMARY KEY,
                id_orden_destino VARCHAR(100) UNIQUE,
                prov_num VARCHAR(100),
                req_num VARCHAR(100),
                cantidad INT NOT NULL,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS usuarios (
                nombre VARCHAR(255) PRIMARY KEY,
                pass VARCHAR(255),
                sector VARCHAR(100),
                estado VARCHAR(50)
            );
        `);

        // Migración automática por si las columnas faltan en bases de datos existentes
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='compras' AND column_name='condicion_pago') THEN
                    ALTER TABLE compras ADD COLUMN condicion_pago VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='compras' AND column_name='tipo_orden') THEN
                    ALTER TABLE compras ADD COLUMN tipo_orden VARCHAR(50) DEFAULT 'Normal';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recepciones' AND column_name='usuario') THEN
                    ALTER TABLE recepciones ADD COLUMN usuario VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proveedores' AND column_name='fecha_alta') THEN
                    ALTER TABLE proveedores ADD COLUMN fecha_alta DATE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='compras' AND column_name='valor_unitario') THEN
                    ALTER TABLE compras ADD COLUMN valor_unitario NUMERIC(14,2);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='compras' AND column_name='valor_total') THEN
                    ALTER TABLE compras ADD COLUMN valor_total NUMERIC(16,2);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='compras' AND column_name='cantidad_necesaria') THEN
                    ALTER TABLE compras ADD COLUMN cantidad_necesaria INT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='compras' AND column_name='saldo_aplicado') THEN
                    ALTER TABLE compras ADD COLUMN saldo_aplicado INT DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recepciones' AND column_name='cant_aplicada') THEN
                    ALTER TABLE recepciones ADD COLUMN cant_aplicada INT DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recepciones' AND column_name='cant_excedente') THEN
                    ALTER TABLE recepciones ADD COLUMN cant_excedente INT DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recepciones' AND column_name='tratamiento_excedente') THEN
                    ALTER TABLE recepciones ADD COLUMN tratamiento_excedente VARCHAR(100) DEFAULT 'Sin excedente';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recepciones' AND column_name='prov_num') THEN
                    ALTER TABLE recepciones ADD COLUMN prov_num VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recepciones' AND column_name='req_num') THEN
                    ALTER TABLE recepciones ADD COLUMN req_num VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recepciones' AND column_name='req_nombre') THEN
                    ALTER TABLE recepciones ADD COLUMN req_nombre VARCHAR(255);
                END IF;
            END $$;
        `);

        // Compatibilidad con recepciones anteriores: reconstruye aplicado/excedente
        // respetando el orden cronológico de los remitos ya existentes.
        await pool.query(`
            WITH historial AS (
                SELECT r.id, r.cant_recibida, c.cantidad,
                       COALESCE(SUM(r.cant_recibida) OVER (
                           PARTITION BY r.id_orden ORDER BY r.id
                           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
                       ), 0) AS recibido_previo
                FROM recepciones r
                JOIN compras c ON c.id_orden = r.id_orden
                WHERE COALESCE(r.cant_aplicada, 0) = 0
                  AND COALESCE(r.cant_excedente, 0) = 0
                  AND r.cant_recibida > 0
            )
            UPDATE recepciones r
            SET cant_aplicada = GREATEST(0, LEAST(h.cant_recibida, h.cantidad - h.recibido_previo)),
                cant_excedente = h.cant_recibida - GREATEST(0, LEAST(h.cant_recibida, h.cantidad - h.recibido_previo)),
                tratamiento_excedente = CASE
                    WHEN h.cant_recibida > GREATEST(0, LEAST(h.cant_recibida, h.cantidad - h.recibido_previo)) THEN 'Saldo a favor'
                    ELSE 'Sin excedente'
                END
            FROM historial h
            WHERE r.id = h.id;

            UPDATE recepciones r
            SET prov_num = c.prov_num, req_num = c.req_num, req_nombre = c.req_nombre
            FROM compras c
            WHERE r.id_orden = c.id_orden
              AND (r.prov_num IS NULL OR r.req_num IS NULL);

            INSERT INTO excedentes (id_recepcion, id_orden_origen, prov_num, prov_nombre, req_num, req_nombre, remito, fecha, cantidad_original, cantidad_disponible, tratamiento, estado)
            SELECT r.id, r.id_orden, r.prov_num, r.prov_nombre, r.req_num, r.req_nombre, r.remito, r.fecha_recepcion,
                   r.cant_excedente, r.cant_excedente, 'Saldo a favor', 'Disponible'
            FROM recepciones r
            WHERE r.cant_excedente > 0
              AND r.tratamiento_excedente = 'Saldo a favor'
              AND NOT EXISTS (SELECT 1 FROM excedentes e WHERE e.id_recepcion = r.id);
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
        const { rows } = await pool.query('SELECT num_formulario AS "numFormulario", num, nombre, fecha_alta AS "fechaAlta", criterios FROM proveedores ORDER BY num ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/proveedores', async (req, res) => {
    const { numFormulario, num, nombre, fechaAlta, criterios } = req.body;
    try {
        await pool.query(
            'INSERT INTO proveedores (num_formulario, num, nombre, fecha_alta, criterios) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (num) DO UPDATE SET num_formulario = $1, nombre = $3, fecha_alta = $4, criterios = $5',
            [numFormulario, num, nombre, fechaAlta || null, JSON.stringify(criterios)]
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
        const { rows } = await pool.query('SELECT id_orden AS "idOrden", tipo_orden AS "tipoOrden", num_formulario AS "numFormulario", prov_num AS "provNum", prov_nombre AS "provNombre", req_num AS "reqNum", req_nombre AS "reqNombre", req_detalle AS "reqDetalle", cantidad, COALESCE(cantidad_necesaria, cantidad) AS "cantidadNecesaria", COALESCE(saldo_aplicado, 0) AS "saldoAplicado", valor_unitario AS "valorUnitario", valor_total AS "valorTotal", fecha_emision AS "fechaEmision", fecha_req AS "fechaReq", condicion_pago AS "condicionPago", observaciones, pago_eval AS "pagoEval", plazo_eval AS "plazoEval", estado FROM compras ORDER BY id_orden DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/compras', async (req, res) => {
    const { idOrden, tipoOrden, numFormulario, provNum, provNombre, reqNum, reqNombre, reqDetalle, cantidad, cantidadNecesaria, saldoAplicado, valorUnitario, valorTotal, fechaEmision, fechaReq, condicionPago, observaciones, pagoEval, plazoEval, estado } = req.body;
    try {
        await pool.query(
            'INSERT INTO compras (id_orden, tipo_orden, num_formulario, prov_num, prov_nombre, req_num, req_nombre, req_detalle, cantidad, cantidad_necesaria, saldo_aplicado, valor_unitario, valor_total, fecha_emision, fecha_req, condicion_pago, observaciones, pago_eval, plazo_eval, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) ON CONFLICT (id_orden) DO UPDATE SET tipo_orden = $2, num_formulario = $3, prov_num = $4, prov_nombre = $5, req_num = $6, req_nombre = $7, req_detalle = $8, cantidad = $9, cantidad_necesaria = $10, saldo_aplicado = $11, valor_unitario = $12, valor_total = $13, fecha_emision = $14, fecha_req = $15, condicion_pago = $16, observaciones = $17, pago_eval = $18, plazo_eval = $19, estado = $20',
            [idOrden, tipoOrden || 'Normal', numFormulario, provNum, provNombre, reqNum, reqNombre, reqDetalle, cantidad, cantidadNecesaria || cantidad, saldoAplicado || 0, valorUnitario, valorTotal, fechaEmision || null, fechaReq || null, condicionPago, observaciones, pagoEval, plazoEval, estado]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/compras/:idOrden', async (req, res) => {
    try {
        await pool.query('DELETE FROM compras WHERE id_orden = $1', [req.params.idOrden]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RUTAS RECEPCIONES ---
app.get('/api/recepciones', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, num_formulario AS "numFormulario", id_orden AS "idOrden", prov_num AS "provNum", prov_nombre AS "provNombre", req_num AS "reqNum", req_nombre AS "reqNombre", remito, cant_recibida AS "cantRecibida", COALESCE(cant_aplicada, cant_recibida) AS "cantAplicada", COALESCE(cant_excedente, 0) AS "cantExcedente", tratamiento_excedente AS "tratamientoExcedente", empaque, tiempo, calidad, obs, fecha_recepcion AS "fechaRecepcion", usuario FROM recepciones ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/recepciones', async (req, res) => {
    const { numFormulario, idOrden, remito, cantRecibida, tratamientoExcedente, empaque, tiempo, calidad, obs, fechaRecepcion, usuario } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const ordenResult = await client.query('SELECT * FROM compras WHERE id_orden = $1 FOR UPDATE', [idOrden]);
        if (ordenResult.rows.length === 0) throw new Error('Orden de compra no encontrada.');
        const orden = ordenResult.rows[0];
        const acumuladoResult = await client.query('SELECT COALESCE(SUM(cant_aplicada), 0) AS total FROM recepciones WHERE id_orden = $1', [idOrden]);
        const pendiente = Math.max(0, Number(orden.cantidad) - Number(acumuladoResult.rows[0].total));
        const totalRecibido = Math.max(0, Number(cantRecibida) || 0);
        const cantAplicada = Math.min(totalRecibido, pendiente);
        const cantExcedente = Math.max(0, totalRecibido - cantAplicada);
        const tratamiento = cantExcedente > 0 ? (tratamientoExcedente || 'Saldo a favor') : 'Sin excedente';

        const recepcionResult = await client.query(
            'INSERT INTO recepciones (num_formulario, id_orden, prov_num, prov_nombre, req_num, req_nombre, remito, cant_recibida, cant_aplicada, cant_excedente, tratamiento_excedente, empaque, tiempo, calidad, obs, fecha_recepcion, usuario) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id',
            [numFormulario, idOrden, orden.prov_num, orden.prov_nombre, orden.req_num, orden.req_nombre, remito, totalRecibido, cantAplicada, cantExcedente, tratamiento, empaque, tiempo, calidad, obs, fechaRecepcion || null, usuario || 'admin']
        );

        if (cantExcedente > 0 && tratamiento === 'Saldo a favor') {
            await client.query(
                'INSERT INTO excedentes (id_recepcion, id_orden_origen, prov_num, prov_nombre, req_num, req_nombre, remito, fecha, cantidad_original, cantidad_disponible, tratamiento, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11)',
                [recepcionResult.rows[0].id, idOrden, orden.prov_num, orden.prov_nombre, orden.req_num, orden.req_nombre, remito, fechaRecepcion || null, cantExcedente, tratamiento, 'Disponible']
            );
        }

        const nuevoAcumulado = Number(acumuladoResult.rows[0].total) + cantAplicada;
        const nuevoEstado = nuevoAcumulado >= Number(orden.cantidad) ? (cantExcedente > 0 ? 'Recibido con excedente' : 'Recibido') : 'Parcial';
        await client.query('UPDATE compras SET estado = $1 WHERE id_orden = $2', [nuevoEstado, idOrden]);
        await client.query('COMMIT');
        res.json({ success: true, cantAplicada, cantExcedente, tratamientoExcedente: tratamiento, estadoOrden: nuevoEstado });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- SALDOS DE EXCEDENTES POR PROVEEDOR Y PRODUCTO ---
app.get('/api/excedentes', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT prov_num AS "provNum", prov_nombre AS "provNombre", req_num AS "reqNum", req_nombre AS "reqNombre",
                   SUM(cantidad_original) AS "cantidadOriginal", SUM(cantidad_disponible) AS "cantidadDisponible"
            FROM excedentes
            GROUP BY prov_num, prov_nombre, req_num, req_nombre
            HAVING SUM(cantidad_disponible) > 0
            ORDER BY prov_nombre, req_nombre
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/excedentes/aplicar', async (req, res) => {
    const { idOrden, provNum, reqNum, cantidad } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const yaAplicado = await client.query('SELECT id FROM aplicaciones_excedentes WHERE id_orden_destino = $1', [idOrden]);
        if (yaAplicado.rows.length > 0) throw new Error('La orden ya tiene un saldo de excedente aplicado.');

        let restante = Math.max(0, Number(cantidad) || 0);
        const solicitado = restante;
        const saldos = await client.query('SELECT id, cantidad_disponible FROM excedentes WHERE prov_num = $1 AND req_num = $2 AND cantidad_disponible > 0 ORDER BY fecha NULLS LAST, id FOR UPDATE', [provNum, reqNum]);
        for (const saldo of saldos.rows) {
            if (restante <= 0) break;
            const usar = Math.min(restante, Number(saldo.cantidad_disponible));
            await client.query("UPDATE excedentes SET cantidad_disponible = cantidad_disponible - $1, estado = CASE WHEN cantidad_disponible - $1 <= 0 THEN 'Aplicado' ELSE 'Disponible' END WHERE id = $2", [usar, saldo.id]);
            restante -= usar;
        }
        const aplicada = solicitado - restante;
        if (aplicada !== solicitado) throw new Error('El saldo disponible cambió. Recargue la página e intente nuevamente.');
        await client.query('INSERT INTO aplicaciones_excedentes (id_orden_destino, prov_num, req_num, cantidad) VALUES ($1, $2, $3, $4)', [idOrden, provNum, reqNum, aplicada]);
        await client.query('COMMIT');
        res.json({ success: true, cantidadAplicada: aplicada });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
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

// --- RUTA MASTER PARA VACIAR EVALUACIONES, COMPRAS Y RECEPCIONES ---
app.post('/api/master/limpiar-bd', async (req, res) => {
    try {
        await pool.query('TRUNCATE TABLE aplicaciones_excedentes, excedentes, estadisticas, compras, recepciones RESTART IDENTITY CASCADE;');
        res.json({ success: true, message: 'Se eliminaron correctamente todas las Evaluaciones, Órdenes y Recepciones.' });
    } catch (err) {
        console.error("Error al limpiar datos de pruebas:", err);
        res.status(500).json({ error: 'Error al intentar vaciar las tablas.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
});
