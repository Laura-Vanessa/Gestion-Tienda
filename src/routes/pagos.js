const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');


router.post('/procesar-pago', async (req, res) => {
    const { id_orden, monto_pago, id_metodo_pago } = req.body;
    const pool = await poolPromise.connect(); // Conexión a la base de datos
    const transaction = new sql.Transaction(pool); // Inicia una nueva transacción

    try {
        // Iniciar la transacción
        await transaction.begin();

        // 1. Obtener el monto total de la orden
        const resultOrder = await transaction.request()
            .input('id_orden', sql.Int, id_orden) // Parametro para la orden
            .query('SELECT total FROM Ordenes WHERE id_orden = @id_orden');

        if (resultOrder.recordset.length === 0) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        const montoOrden = resultOrder.recordset[0].total;
        console.log(montoOrden)
        console.log(monto_pago)
        // 2. Validar que el monto del pago coincida con el monto de la orden
        if (monto_pago !== montoOrden) {
            return res.status(400).json({ error: 'El monto del pago no coincide con el monto de la orden' });
        }

        // 3. Insertar el pago en la tabla Pagos
        const resultPayment = await transaction.request()
            .input('monto_pago', sql.Decimal(10, 2), monto_pago)  // Parametro para monto_pago
            .input('id_orden', sql.Int, id_orden)  // Parametro para id_orden
            .input('id_metodo_pago', sql.Int, id_metodo_pago)  // Parametro para id_metodo_pago
            .query(`
                INSERT INTO Pagos (monto, id_orden, id_metodo_pago, fecha_pago)
                VALUES (@monto_pago, @id_orden, @id_metodo_pago, GETDATE());
                SELECT SCOPE_IDENTITY() AS id_pago;  -- Retorna el id del pago insertado
            `);

        // 4. Confirmar la transacción
        await transaction.commit();

        // 5. Responder con éxito
        return res.status(201).json({ message: 'Pago registrado correctamente', id_pago: resultPayment.recordset[0].id_pago });

    } catch (error) {
        // En caso de error, revertir la transacción
        await transaction.rollback();
        console.error(error);
        return res.status(500).json({ error: 'Error al procesar el pago' });
    } finally {
        pool.close(); // Liberar la conexión
    }
});

router.get('/pagos', async (req, res) => {
    const pool = await poolPromise.connect(); // Conexión a la base de datos

    try {
        // Consultar todos los pagos
        const result = await pool.request().query(`
            SELECT 
                p.id_pago,
                p.monto,
                p.fecha_pago,
                p.id_orden,
                mp.tipo_pago AS metodo_pago
            FROM Pagos p
            JOIN Metodos_Pago mp ON p.id_metodo_pago = mp.id_metodo_pago
            ORDER BY p.fecha_pago DESC;
        `);

        // Verificar si existen pagos
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron pagos registrados.' });
        }

        // Responder con la lista de pagos
        res.status(200).json({ pagos: result.recordset });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al obtener los pagos.' });
    } finally {
        pool.close(); // Liberar la conexión
    }
});
module.exports = router;