const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');

router.post('/crear-orden', async (req, res) => {
    const { id_cliente, detalles } = req.body;

    // Validar entrada
    if (!id_cliente || !Array.isArray(detalles) || detalles.length === 0) {
        return res.status(400).json({ error: 'Todos los campos son requeridos y los detalles deben ser un arreglo.' });
    }

    try {
        // Obtener el pool de conexiones (esto es asincrónico, por eso usamos await)
        const pool = await poolPromise;
        if (!pool) {
            return res.status(500).json({ error: 'Error al conectar con la base de datos.' });
        }
        // Llama al procedimiento almacenado para crear una orden
        const ordenResult = await pool.request()
            .input('p_id_cliente', sql.Int, id_cliente)
            .execute('CrearOrden'); // Procedimiento almacenado

        const idOrden = ordenResult.recordset[0].id_orden; // Obtener el ID de la nueva orden

        // Registrar cada detalle de la orden
        for (const detalle of detalles) {
            const { id_producto, cantidad } = detalle;

            await pool.request()
                .input('id_orden', sql.Int, idOrden)
                .input('id_producto', sql.Int, id_producto)
                .input('cantidad', sql.Int, cantidad)
                .execute('RegistrarDetallesOrden');
        }

        res.status(200).json({
            message: 'Orden y detalles creados exitosamente.',
            id_orden: idOrden
        });
    } catch (err) {
        console.error('Error al crear la orden y los detalles:', err);
        res.status(500).json({
            error: 'Error en el servidor.',
            message: err.message, // Agrega más detalles sobre el error
            stack: err.stack // Puedes agregar la pila de errores para más detalles
        });
    }
});

module.exports = router;
