const express = require('express');
const bodyParser = require('body-parser');
const ordenRoutes = require('./routes/orden'); // Importa el archivo de rutas orden.js

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json()); // Parsear el cuerpo de las peticiones como JSON

// Rutas
app.use('/api', ordenRoutes); // Asigna el prefijo /api a las rutas

// Servidor en escucha
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
