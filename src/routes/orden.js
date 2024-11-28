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

router.post('/agregar-proveedor', async (req, res) => {
    const { nombre, telefono, email } = req.body; // Parámetros del nuevo proveedor
    const pool = await poolPromise.connect(); // Conexión a la base de datos

    try {
        // Verificar si ya existe un proveedor con el mismo nombre o email
        const resultExist = await pool.request()
            .input('nombre', sql.VarChar(100), nombre)
            .input('email', sql.VarChar(100), email)
            .query(`
                IF EXISTS (SELECT 1 FROM Proveedores WHERE nombre = @nombre)
                    SELECT 'Nombre ya existe' AS mensaje;
                ELSE IF EXISTS (SELECT 1 FROM Proveedores WHERE email = @email)
                    SELECT 'Email ya existe' AS mensaje;
                ELSE
                    SELECT 'OK' AS mensaje;
            `);

        // Verificar el resultado de la validación
        if (resultExist.recordset[0].mensaje !== 'OK') {
            return res.status(400).json({ error: resultExist.recordset[0].mensaje });
        }

        // Si no existe, insertar el nuevo proveedor
        const resultInsert = await pool.request()
            .input('nombre', sql.VarChar(100), nombre)
            .input('telefono', sql.VarChar(15), telefono)
            .input('email', sql.VarChar(100), email)
            .query(`
                INSERT INTO Proveedores (nombre, telefono, email)
                VALUES (@nombre, @telefono, @email);
            `);

        // Responder con éxito
        res.status(201).json({ message: 'Proveedor agregado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al agregar el proveedor' });
    } finally {
        pool.close(); // Liberar la conexión
    }
});

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

router.post('/crear-categoria', async (req, res) => {
    const { nombre_categoria } = req.body; // Obtener el nombre de la categoría desde el cuerpo de la solicitud
    const pool = await poolPromise.connect(); // Conexión a la base de datos

    try {
        // Verificar que se ha proporcionado el nombre de la categoría
        if (!nombre_categoria) {
            return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
        }

        // Ejecutar el procedimiento almacenado para crear la nueva categoría
        const result = await pool.request()
            .input('nombre_categoria', sql.VarChar, nombre_categoria) // Pasar el parámetro nombre_categoria
            .execute('sp_CrearNuevaCategoria'); // Llamar al procedimiento almacenado

        // Verificar si la categoría fue creada exitosamente
        if (result.rowsAffected[0] === 0) {
            return res.status(400).json({ message: 'La categoría ya existe.' });
        }

        // Responder con éxito
        res.status(201).json({ message: 'Categoría creada exitosamente' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear la categoría' });
    } finally {
        pool.close(); // Liberar la conexión
    }
});

module.exports = router;
