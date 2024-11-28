const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');



router.get('/reporte-ventas', async (req, res) => {
    const pool = await poolPromise.connect(); // Conexión a la base de datos

    try {
        // Ejecutar el procedimiento almacenado para generar el reporte de ventas
        const result = await pool.request().execute('GenerarReporteVentas');

        // Verificar si se obtuvieron resultados
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron registros de ventas.' });
        }

        // Responder con el reporte de ventas
        res.status(200).json({ reporte: result.recordset });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al generar el reporte de ventas.' });
    } finally {
        pool.close(); // Liberar la conexión
    }
});

module.exports = router;