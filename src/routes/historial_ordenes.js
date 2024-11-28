const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');

router.get('/historial-orden/:id_orden', async (req, res) => {
    const { id_orden } = req.params; // Obtener el id_orden desde los parámetros de la URL
    const pool = await poolPromise.connect(); // Conexión a la base de datos

    try {
        // Ejecutar el procedimiento almacenado para obtener el historial de la orden
        const result = await pool.request()
            .input('id_orden', sql.Int, id_orden) // Pasar el parámetro id_orden
            .execute('sp_ConsultarHistorialOrdenes'); // Llamar al procedimiento almacenado

        // Verificar si se obtuvo resultados
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontró historial para esta orden.' });
        }

        // Responder con el historial de la orden
        res.status(200).json({ historial: result.recordset });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar el historial de la orden' });
    } finally {
        pool.close(); // Liberar la conexión
    }
});
router.get('/historial-ordenes', async (req, res) => {
    const pool = await poolPromise.connect(); // Conexión a la base de datos

    try {
        // Ejecutar una consulta directa para obtener todo el historial de órdenes
        const result = await pool.request()
            .query(`
                SELECT 
                    id_historial, 
                    id_orden, 
                    estado_orden, 
                    fecha_cambio
                FROM Historial_Ordenes
                ORDER BY id_orden, fecha_cambio ASC
            `);

        // Verificar si se obtuvieron resultados
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontró historial de órdenes.' });
        }

        // Responder con el historial completo de órdenes
        res.status(200).json({ historial: result.recordset });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar el historial de órdenes.' });
    } finally {
        pool.close(); // Liberar la conexión
    }
});
module.exports = router;