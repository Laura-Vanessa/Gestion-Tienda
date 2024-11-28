const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');

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

// Endpoint para obtener todos los proveedores
router.get('/proveedores', async (req, res) => {
    const pool = await poolPromise.connect(); // Conexión a la base de datos

    try {
        // Ejecutar la consulta para obtener todos los proveedores
        const result = await pool.request().query(`
            SELECT id_proveedor, nombre, telefono, email 
            FROM Proveedores;
        `);

        // Verificar si existen proveedores en la base de datos
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron proveedores.' });
        }

        // Responder con los proveedores obtenidos
        res.status(200).json({ proveedores: result.recordset });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los proveedores.' });
    } finally {
        pool.close(); // Liberar la conexión
    }
});


module.exports = router;