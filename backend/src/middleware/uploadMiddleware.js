const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../uploads/tenants/logo');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const slug = req.body.slug || 'tenant';
        cb(null, slug + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadLogo = multer({ 
    storage: storage,
    limits: { fileSize: 500 * 1024, files: 1 }, // 500KB and exactly 1 file
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, PNG, and SVG are allowed.'));
        }
    }
});

const verifyFileSignature = (req, res, next) => {
    if (!req.file) return next();

    const filePath = req.file.path;
    const buffer = Buffer.alloc(12);
    try {
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 12, 0);
        fs.closeSync(fd);
    } catch (e) {
        fs.unlinkSync(filePath); // Cleanup
        return res.status(400).json({ status: 'error', message: 'Could not read uploaded file.' });
    }

    const hex = buffer.toString('hex').toUpperCase();
    const str = buffer.toString('utf8');

    let isValid = false;
    
    // JPEG/JPG: Starts with FFD8FF
    if (hex.startsWith('FFD8FF')) isValid = true;
    // PNG: Starts with 89504E470D0A1A0A
    else if (hex.startsWith('89504E470D0A1A0A')) isValid = true;
    // SVG: Text file starting with <svg, <?xml, or HTML comments like <!--
    else if (str.trimStart().startsWith('<svg') || str.trimStart().startsWith('<?xml') || str.trimStart().startsWith('<!--')) isValid = true;

    if (!isValid) {
        fs.unlinkSync(filePath); // Cleanup invalid file
        return res.status(400).json({ status: 'error', message: 'File signature mismatch. The file content does not match allowed image formats (JPG, PNG, SVG).' });
    }

    next();
};

module.exports = { uploadLogo, verifyFileSignature };
