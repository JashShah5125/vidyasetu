const pool = require('../config/db');

exports.getSetting = async (req, res) => {
    const { category, key } = req.params;
    try {
        const [rows] = await pool.query('SELECT value FROM platform_settings WHERE category = ? AND key_name = ?', [category, key]);
        res.json({ success: true, value: rows.length ? rows[0].value : null });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateSetting = async (req, res) => {
    const { category, key } = req.params;
    const { value } = req.body;
    try {
        await pool.query('UPDATE platform_settings SET value = ? WHERE category = ? AND key_name = ?', [value, category, key]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
