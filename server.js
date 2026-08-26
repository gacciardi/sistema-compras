const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
// Se cambió el puerto por defecto a 4000
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal para servir la aplicación
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado y escuchando en http://localhost:${PORT}`);
});