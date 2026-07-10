const { getDb } = require('./config/emailDbWrapper');
async function check() {
  const db = await getDb();
  const [cols] = await db.pool.query("SHOW COLUMNS FROM email_leads LIKE 'intent_analysis'");
  console.log(cols);
  process.exit();
}
check();
