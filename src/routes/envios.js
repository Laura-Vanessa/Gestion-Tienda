const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');

// Endpoint para insertar o actualizar un envío
router.post('/envios', async (req, res) => {
    const { id_orden, estado_envio, fecha_envio, fecha_entrega } = req.body;

    // Validación de los datos
    if (!id_orden || !estado_envio || !fecha_envio) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios: id_orden, estado_envio, fecha_envio.' });
    }

    const pool = await poolPromise.connect(); // Conexión a la base de datos

    try {
        // Verificamos si ya existe un envío para la orden
        const existingShipment = await pool.request()
            .input('id_orden', sql.Int, id_orden)
            .query('SELECT * FROM Envíos WHERE id_orden = @id_orden');

        let query;
        let message;

        if (existingShipment.recordset.length > 0) {
            // Si existe un envío, lo actualizamos
            query = `
                UPDATE Envíos 
                SET estado_envio = @estado_envio, fecha_envio = @fecha_envio, fecha_entrega = @fecha_entrega
                WHERE id_orden = @id_orden;
            `;
            message = 'Envío actualizado con éxito.';
        } else {
            // Si no existe, lo insertamos
            query = `
                INSERT INTO Envíos (id_orden, estado_envio, fecha_envio, fecha_entrega)
                VALUES (@id_orden, @estado_envio, @fecha_envio, @fecha_entrega);
            `;
            message = 'Envío creado con éxito.';
        }

        await pool.request()
            .input('id_orden', sql.Int, id_orden)
            .input('estado_envio', sql.VarChar(50), estado_envio)
            .input('fecha_envio', sql.Date, fecha_envio)
            .input('fecha_entrega', sql.Date, fecha_entrega || null)
            .query(query);

        res.status(200).json({ message });

    } catch (err) {
        console.error('Error al crear o actualizar el envío:', err);
        res.status(500).json({ message: 'Error al procesar el envío', error: err.message });
    } finally {
        pool.close();
    }
});

// Endpoint para obtener todos los envíos
router.get('/envios', async (req, res) => {
    const pool = await poolPromise.connect(); // Conexión a la base de datos

    try {
        // Consulta para obtener todos los registros de envíos
        const result = await pool.request().query('SELECT * FROM Envíos');

        // Verificar si existen registros
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron envíos registrados.' });
        }

        res.status(200).json({ envios: result.recordset });

    } catch (err) {
        console.error('Error al obtener los envíos:', err);
        res.status(500).json({ message: 'Error al obtener los envíos', error: err.message });
    } finally {
        pool.close();
    }
});
module.exports = router;