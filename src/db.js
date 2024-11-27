const sql = require('mssql');

const poolPromise = new sql.ConnectionPool({
    user: 'sa',
    password: 'G01fukl*',
    server: '192.168.1.10',
    database: 'TiendaOnline',
    options: {
        encrypt: true,
        trustServerCertificate: true
    },
    connectionTimeout: 30000
});

poolPromise.connect()
    .then(() => {
        console.log('Conexión exitosa');
    })
    .catch(err => {
        console.error('Error de conexión:', err);
    });
