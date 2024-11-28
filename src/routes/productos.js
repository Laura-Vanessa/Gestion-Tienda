const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');


router.post('/crear-producto-inventario', async (req, res) => {
    const { 
        nombre_producto, 
        descripcion, 
        precio, 
        id_categoria, 
        cantidad, 
        id_proveedor 
    } = req.body; // Extraer los datos del producto desde el cuerpo de la solicitud

    const pool = await poolPromise.connect(); // Conexión a la base de datos

    try {
        // Ejecutar el procedimiento almacenado para crear el producto y agregarlo al inventario
        await pool.request()
            .input('nombre_producto', sql.VarChar(100), nombre_producto)
            .input('descripcion', sql.Text, descripcion)
            .input('precio', sql.Decimal(10, 2), precio)
            .input('id_categoria', sql.Int, id_categoria)
            .input('cantidad', sql.Int, cantidad)
            .input('id_proveedor', sql.Int, id_proveedor)
            .execute('sp_CrearNuevoProductoEnInventario');

        // Respuesta exitosa
        res.status(201).json({ message: 'Producto y registro de inventario creados exitosamente.' });

    } catch (error) {
        console.error(error);

        if (error.originalError?.info?.message.includes('categoría especificada no existe')) {
            return res.status(400).json({ error: 'La categoría especificada no existe.' });
        }

        if (error.originalError?.info?.message.includes('proveedor especificado no existe')) {
            return res.status(400).json({ error: 'El proveedor especificado no existe.' });
        }

        res.status(500).json({ error: 'Error al crear el producto e inventario.' });
    } finally {
        pool.close(); // Liberar la conexión
    }
});

router.get('/productos', async (req, res) => {
    const pool = await poolPromise.connect(); // Conexión a la base de datos

    try {
        // Ejecutar la consulta para obtener todos los productos
        const result = await pool.request()
            .query(`
                SELECT 
                    p.id_producto, 
                    p.nombre_producto, 
                    p.descripcion, 
                    p.precio, 
                    p.id_categoria, 
                    c.nombre_categoria
                FROM Productos p
                JOIN Categorias c ON p.id_categoria = c.id_categoria
            `);

        // Verificar si se obtuvieron productos
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron productos.' });
        }

        // Responder con la lista de productos
        res.status(200).json({ productos: result.recordset });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los productos.' });
    } finally {
        pool.close(); // Liberar la conexión
    }
});

module.exports = router;