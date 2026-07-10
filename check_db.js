const { getDb } = require('./config/emailDbWrapper');
async function check() {
  const db = await getDb();
  const accounts = await db.all("SELECT id, email, is_active, deleted FROM email_accounts");
  console.log("Email Accounts:", accounts);
  
  // Also trigger a manual check of the worker for testing
  const { checkReplies } = require('./worker/replyAnalyzer');
  await checkReplies();
  
  process.exit();
}
check();
