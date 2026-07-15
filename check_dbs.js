const mysql = require('mysql2/promise');
async function checkDbs() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root', // Let's try root or admin
        password: ''
    }).catch(() => null);
    
    if (!conn) {
        const conn2 = await mysql.createConnection({
            host: 'localhost',
            user: 'admin',
            password: 'Disan@1234'
        }).catch(e => { console.error(e); process.exit(1); });
        const [rows] = await conn2.query("SHOW DATABASES");
        console.log(rows);
        process.exit(0);
    }
}
checkDbs();
