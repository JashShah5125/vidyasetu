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

// Support ticket attachment uploads (single file, up to 10MB).
// Supported: images, PDFs, documents, spreadsheets, text/CSV and archives.
const supportStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../uploads/support');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const baseName = (file.originalname || 'attachment').replace(/[^\w.\- ]/g, '').replace(/\s+/g, '-').slice(0, 100);
        cb(null, baseName + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadSupportAttachment = multer({
    storage: supportStorage,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10MB and exactly 1 file
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'text/csv',
            'application/zip', 'application/x-zip-compressed'
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Allowed: images, PDF, DOC/XLS, TXT/CSV and ZIP files.'));
        }
    }
});

// Homework attachments (teacher uploads alongside a homework).
const homeworkStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../uploads/homework');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const baseName = (file.originalname || 'attachment').replace(/[^\w.\- ]/g, '').replace(/\s+/g, '-').slice(0, 100);
        cb(null, baseName + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const homeworkFileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv',
        'application/zip', 'application/x-zip-compressed'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed: images, PDF, DOC/XLS, TXT/CSV and ZIP files.'));
    }
};

const uploadHomeworkFiles = multer({
    storage: homeworkStorage,
    limits: { fileSize: 20 * 1024 * 1024, files: 5 }, // 20MB each, up to 5 files
    fileFilter: homeworkFileFilter
}).array('files', 5);

// Student homework submissions.
const submissionStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../uploads/homework-submissions');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const baseName = (file.originalname || 'submission').replace(/[^\w.\- ]/g, '').replace(/\s+/g, '-').slice(0, 100);
        cb(null, baseName + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadSubmissionFiles = multer({
    storage: submissionStorage,
    limits: { fileSize: 20 * 1024 * 1024, files: 5 }, // 20MB each, up to 5 files
    fileFilter: homeworkFileFilter
}).array('files', 5);

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

// Attendance CSV upload middleware (in-memory buffer for immediate parsing)
const uploadAttendanceCsv = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.csv', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedMimes = ['text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/csv', 'text/x-csv', 'application/x-csv', 'text/comma-separated-values', 'text/x-comma-separated-values'];
        if (allowedExtensions.includes(ext) || allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV (.csv) files are allowed.'));
        }
    }
}).single('file');

// Doubt attachments (student & teacher doubts/replies, up to 5 files, 10MB each).
const doubtStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../uploads/doubts');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const baseName = (file.originalname || 'attachment').replace(/[^\w.\- ]/g, '').replace(/\s+/g, '-').slice(0, 100);
        cb(null, baseName + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadDoubtAttachments = multer({
    storage: doubtStorage,
    limits: { fileSize: 10 * 1024 * 1024, files: 5 },
    fileFilter: homeworkFileFilter
}).array('attachments', 5);

// Student Registration & KYC Documents (up to 10MB per file: PDF, JPG, PNG, DOCX)
const studentDocStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../uploads/documents');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const baseName = (file.originalname || 'document').replace(/[^\w.\- ]/g, '').replace(/\s+/g, '-').slice(0, 100);
        cb(null, baseName + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadStudentDocument = multer({
    storage: studentDocStorage,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/webp',
            'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, JPG, PNG, and DOC files are allowed.'));
        }
    }
}).single('file');

const uploadStudentDocuments = multer({
    storage: studentDocStorage,
    limits: { fileSize: 10 * 1024 * 1024, files: 10 },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/webp',
            'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, JPG, PNG, and DOC files are allowed.'));
        }
    }
}).array('files', 10);

module.exports = {
    uploadLogo,
    uploadSupportAttachment,
    verifyFileSignature,
    uploadHomeworkFiles,
    uploadSubmissionFiles,
    uploadAttendanceCsv,
    uploadDoubtAttachments,
    uploadStudentDocument,
    uploadStudentDocuments
};
