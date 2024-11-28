const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');

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

router.get('/obtener-categoria', async (req, res) => {
    const pool = await poolPromise.connect(); // Conexión a la base de datos

    try {
        // Ejecutar la consulta para obtener todas las categorías
        const result = await pool.request().query('SELECT * FROM Categorias');

        // Verificar si se encontraron categorías
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron categorías' });
        }

        // Responder con las categorías
        res.status(200).json({ categorias: result.recordset });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las categorías' });
    } finally {
        pool.close(); // Liberar la conexión
    }
});
module.exports = router;