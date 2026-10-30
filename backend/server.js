// Root entrypoint for hosting environments (Plesk, Phusion Passenger, cPanel, Docker)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('./src/server');

