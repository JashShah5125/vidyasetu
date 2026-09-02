const db = require('./src/config/db');
db.query("SELECT COUNT(*) AS total, SUM(status='active') AS active, SUM(status='suspended') AS suspended, SUM(status='draft') AS draft FROM tenants WHERE tenant_type != 'master'")
  .then(([r]) => { console.log(JSON.stringify(r)); db.end(); })
  .catch(e => { console.error(e.message); db.end(); });
