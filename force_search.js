const { runLeadGenerationJob } = require('./worker/leadGenerator');
async function force() {
  console.log("Forcing lead search...");
  await runLeadGenerationJob();
  console.log("Search complete.");
  process.exit();
}
force();
