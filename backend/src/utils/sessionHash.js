const crypto = require('crypto');

const hashRefreshToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
    hashRefreshToken
};
