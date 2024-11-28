const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');

// Endpoint para crear una orden y sus detalles
router.post('/orders', async (req, res) => {
    const { fecha_orden, total, id_cliente, detalles } = req.body;

    // Validación básica de los campos requeridos
    if (!fecha_orden || !total || !id_cliente || !Array.isArray(detalles) || detalles.length === 0) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios: fecha_orden, total, id_cliente y detalles' });
    }
    const pool = await poolPromise.connect(); // Conexión a la base de datos
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin(); // Inicia una transacción

        // Insertar la orden directamente con una consulta
        const orderResult = await transaction.request()
            .input('fecha_orden', sql.Date, fecha_orden)
            .input('estado', sql.VarChar(50), 'Sin enviar')
            .input('total', sql.Decimal(10, 2), total)
            .input('id_cliente', sql.Int, id_cliente)
            .query(`
                DECLARE @InsertedOrders TABLE (id_orden INT);
        
                INSERT INTO Ordenes (fecha_orden, estado, total, id_cliente)
                OUTPUT inserted.id_orden INTO @InsertedOrders
                VALUES (@fecha_orden, 'Sin enviar', @total, @id_cliente);
        
                SELECT id_orden FROM @InsertedOrders;
            `);

        const id_orden = orderResult.recordset[0].id_orden; // Obtiene el ID de la orden creada

        // Insertar los detalles de la orden
        for (const detalle of detalles) {
            const { id_producto, cantidad, precio_unitario } = detalle;

            if (!id_producto || !cantidad || !precio_unitario) {
                throw new Error('Cada detalle debe contener: id_producto, cantidad y precio_unitario');
            }

            await transaction.request()
                .input('id_orden', sql.Int, id_orden)
                .input('id_producto', sql.Int, id_producto)
                .input('cantidad', sql.Int, cantidad)
                .input('precio_unitario', sql.Decimal(10, 2), precio_unitario)
                .query(`
                    DECLARE @InsertedDetails TABLE (id_detalle INT);
        
                    INSERT INTO Detalles_Orden (id_orden, id_producto, cantidad, precio_unitario)
                    OUTPUT inserted.id_detalle INTO @InsertedDetails
                    VALUES (@id_orden, @id_producto, @cantidad, @precio_unitario);
        
                    SELECT id_detalle FROM @InsertedDetails;
                `);
        }

        await transaction.commit(); // Confirma la transacción
        res.status(201).json({ message: 'Orden y detalles creados con éxito', ordenId: id_orden });
    } catch (err) {
        await transaction.rollback(); // Revierte la transacción en caso de error
        console.error('Error al crear la orden y detalles:', err);
        res.status(500).json({ message: 'Error al crear la orden y detalles', error: err.message });
    } finally {
        pool.close();
    }
});

// Endpoint para obtener todas las órdenes
router.get('/orders', async (req, res) => {
    const pool = await poolPromise.connect(); // Conexión a la base de datos

    try {
        // Consulta para obtener todas las órdenes con detalles
        const result = await pool.request().query(`
            SELECT 
                o.id_orden,
				ho.id_historial,
                o.fecha_orden,
                o.estado,
                o.total,
                o.id_cliente,
                u.nombre AS nombre_cliente,
                u.email AS email_cliente,
                do.id_detalle,
                do.id_producto,
                p.nombre_producto,
                do.cantidad,
                do.precio_unitario,
                (do.cantidad * do.precio_unitario) AS total_producto
            FROM 
                Ordenes o
            LEFT JOIN 
                Clientes c ON o.id_cliente = c.id_cliente
            LEFT JOIN 
                Usuarios u ON c.id_usuario = u.id_usuario
            LEFT JOIN 
                Detalles_Orden do ON o.id_orden = do.id_orden
            LEFT JOIN 
                Productos p ON do.id_producto = p.id_producto
			LEFT JOIN
				Historial_Ordenes ho ON ho.id_historial = o.id_orden
            ORDER BY 
                o.id_orden, do.id_detalle;
        `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron órdenes.' });
        }

        // Agrupar las órdenes con sus detalles
        const orders = result.recordset.reduce((acc, row) => {
            const { id_orden, fecha_orden, estado, total, id_cliente, nombre_cliente, email_cliente, ...detalle } = row;

            let order = acc.find(o => o.id_orden === id_orden);
            if (!order) {
                order = {
                    id_orden,
                    fecha_orden,
                    estado,
                    total,
                    id_cliente,
                    nombre_cliente,
                    email_cliente,
                    detalles: []
                };
                acc.push(order);
            }

            if (detalle.id_detalle) {
                order.detalles.push(detalle);
            }

            return acc;
        }, []);

        res.status(200).json(orders);
    } catch (err) {
        console.error('Error al obtener las órdenes:', err);
        res.status(500).json({ message: 'Error al obtener las órdenes', error: err.message });
    } finally {
        pool.close();
    }
});


module.exports = router;
