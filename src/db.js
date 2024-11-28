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
      
    })
    .catch(err => {
        console.error('Error de conexión:', err);
    });

// Exportar tanto sql como la conexión
module.exports = { sql, poolPromise };