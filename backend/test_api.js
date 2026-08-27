const planModel = require('./src/models/planModel');
async function run() {
  try {
    const plans = await planModel.getPlans();
    console.dir(plans[0], { depth: null });
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
run();
