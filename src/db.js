const sql = require('mssql');

// Configuración de la conexión a la base de datos
const poolPromise = new sql.ConnectionPool({
    user: 'sa',
    password: 'G01fukl*',
    server: '127.0.0.1',
    database: 'TiendaOnline',
    options: {
        encrypt: true,
        trustServerCertificate: true
    },
    connectionTimeout: 30000
});

// Establecer la conexión y ejecutar la consulta de prueba
poolPromise.connect()
    .then(() => {
        console.log('Conexión exitosa');
        // Llamar a la función de prueba de la consulta después de la conexión exitosa
        testQuery();
    })
    .catch(err => {
        console.error('Error de conexión:', err);
    });

// Función para ejecutar una consulta de prueba
async function testQuery() {
    try {
        // Realizamos una consulta simple a la base de datos
        const result = await poolPromise.request().query('SELECT * FROM clientes'); // Ajusta la consulta a tu base de datos
        console.log('Consulta exitosa:', result.recordset); // Muestra el resultado de la consulta
    } catch (err) {
        console.error('Error al ejecutar la consulta:', err);
    } finally {
        // Cerrar la conexión al final
        poolPromise.close();
    }
}
