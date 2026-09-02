const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');

router.get('/:category/:key', settingController.getSetting);
router.put('/:category/:key', settingController.updateSetting);

module.exports = router;
