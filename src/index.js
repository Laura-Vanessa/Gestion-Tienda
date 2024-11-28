const express = require('express');
const bodyParser = require('body-parser');
const ordenRoutes = require('./routes/orden'); // Importa el archivo de rutas orden.js
const categoriasRoutes = require('./routes/categoria'); // Importa el archivo de rutas orden.js
const devolucionesRoutes = require('./routes/devoluciones'); // Importa el archivo de rutas orden.js
const enviosnRoutes = require('./routes/envios'); // Importa el archivo de rutas orden.js
const historial_ordenesRoutes = require('./routes/historial_ordenes'); // Importa el archivo de rutas orden.js
const pagosRoutes = require('./routes/pagos'); // Importa el archivo de rutas orden.js
const productosRoutes = require('./routes/productos'); // Importa el archivo de rutas orden.js
const proveedorRoutes = require('./routes/proveedor'); // Importa el archivo de rutas orden.js
const reportes_ventasRoutes = require('./routes/reportes_ventas'); // Importa el archivo de rutas orden.js

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json()); // Parsear el cuerpo de las peticiones como JSON

// Rutas
app.use('/api', ordenRoutes); // Asigna el prefijo /api a las rutas
app.use('/api', categoriasRoutes); // Asigna el prefijo /api a las rutas
app.use('/api', devolucionesRoutes); // Asigna el prefijo /api a las rutas
app.use('/api', enviosnRoutes); // Asigna el prefijo /api a las rutas
app.use('/api', historial_ordenesRoutes); // Asigna el prefijo /api a las rutas
app.use('/api', pagosRoutes); // Asigna el prefijo /api a las rutas
app.use('/api', productosRoutes); // Asigna el prefijo /api a las rutas
app.use('/api', proveedorRoutes); // Asigna el prefijo /api a las rutas
app.use('/api', reportes_ventasRoutes); // Asigna el prefijo /api a las rutas


// Servidor en escucha
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
