const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');


router.post('/registrar-devolucion', async (req, res) => {
    const { id_orden, motivo_devolucion } = req.body;
    const pool = await poolPromise.connect(); // Conexión a la base de datos
    const transaction = new sql.Transaction(pool); // Inicia una nueva transacción

    try {
        // Iniciar la transacción
        await transaction.begin();

        // 1. Verificar que la orden exista
        const resultOrder = await transaction.request()
            .input('id_orden', sql.Int, id_orden) // Parametro para la orden
            .query('SELECT id_orden FROM Ordenes WHERE id_orden = @id_orden');

        if (resultOrder.recordset.length === 0) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        // 2. Insertar la devolución en la tabla Devoluciones
        const resultDevolucion = await transaction.request()
            .input('id_orden', sql.Int, id_orden)  // Parametro para id_orden
            .input('motivo_devolucion', sql.Text, motivo_devolucion)  // Parametro para motivo_devolucion
            .query(`
                INSERT INTO Devoluciones (id_orden, fecha_devolucion, motivo)
                VALUES (@id_orden, GETDATE(), @motivo_devolucion);
                SELECT SCOPE_IDENTITY() AS id_devolucion;  -- Retorna el id de la devolución insertada
            `);

        // 3. Confirmar la transacción
        await transaction.commit();

        // 4. Responder con éxito
        return res.status(201).json({ message: 'Devolución registrada correctamente', id_devolucion: resultDevolucion.recordset[0].id_devolucion });

    } catch (error) {
        // En caso de error, revertir la transacción
        await transaction.rollback();
        console.error(error);
        return res.status(500).json({ error: 'Error al registrar la devolución' });
    } finally {
        pool.close(); // Liberar la conexión
    }
});
router.get('/obtener-devoluciones', async (req, res) => {
    const pool = await poolPromise.connect(); // Conexión a la base de datos

    try {
        // Ejecutar la consulta para obtener todas las devoluciones
        const result = await pool.request().query(`
            SELECT 
                d.id_devolucion, 
                d.id_orden, 
                d.fecha_devolucion, 
                d.motivo, 
                o.fecha_orden, 
                o.total AS total_orden
            FROM 
                Devoluciones d
            LEFT JOIN 
                Ordenes o ON d.id_orden = o.id_orden
            ORDER BY 
                d.fecha_devolucion DESC;
        `);

        // Verificar si hay devoluciones
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron devoluciones registradas.' });
        }

        // Responder con las devoluciones encontradas
        res.status(200).json({ devoluciones: result.recordset });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al obtener las devoluciones' });
    } finally {
        pool.close(); // Liberar la conexión
    }
});

module.exports = router;