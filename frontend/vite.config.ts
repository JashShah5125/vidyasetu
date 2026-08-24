import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function jsonSyncPlugin(): Plugin {
  return {
    name: 'json-sync-plugin',
    handleHotUpdate({ file }) {
      if (file.endsWith('leads.json') || file.endsWith('students.json') || file.endsWith('db.json')) {
        return [];
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === 'POST' && req.url === '/api/save-leads') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const leadsPath = path.resolve(__dirname, 'src/data/leads.json');
              const parsed = JSON.parse(body);
              fs.writeFileSync(leadsPath, JSON.stringify(parsed, null, 2), 'utf-8');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
          return;
        }

        if (req.method === 'POST' && req.url === '/api/save-students') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const studentsPath = path.resolve(__dirname, 'src/data/students.json');
              const parsed = JSON.parse(body);
              fs.writeFileSync(studentsPath, JSON.stringify(parsed, null, 2), 'utf-8');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), jsonSyncPlugin()],
  server: {
    watch: {
      ignored: ['**/src/data/leads.json', '**/src/data/students.json', '**/server/db.json']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
