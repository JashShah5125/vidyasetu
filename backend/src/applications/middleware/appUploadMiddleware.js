const multer = require('multer');
const path = require('path');
const fs = require('fs');

const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../../uploads/avatars');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const userId = req.user?.userId || 'student';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `avatar-${userId}-${uniqueSuffix}${ext}`);
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024, files: 1 }, // 2MB max
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            const err = new Error('Invalid file format. Only JPG, PNG, and WebP images are allowed.');
            err.statusCode = 400;
            cb(err);
        }
    }
});

// Homework Submission File Uploads
const submissionStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../../uploads/homework-submissions');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const userId = req.user?.userId || 'student';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
        const baseName = (file.originalname || 'file').replace(/[^\w.\-]/g, '_').slice(0, 50);
        cb(null, `sub-${userId}-${uniqueSuffix}-${baseName}`);
    }
});

const uploadHomeworkSubmission = multer({
    storage: submissionStorage,
    limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB per file, max 5 files
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            const err = new Error('Invalid file format. Allowed types: PDF, Word (DOC/DOCX), Images (JPG/PNG/WebP), and Text files.');
            err.statusCode = 400;
            cb(err);
        }
    }
});

// Doubt / Query Attachment Uploads
const doubtStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../../uploads/doubts');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const userId = req.user?.userId || 'student';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
        const baseName = (file.originalname || 'file').replace(/[^\w.\-]/g, '_').slice(0, 50);
        cb(null, `doubt-${userId}-${uniqueSuffix}-${baseName}`);
    }
});

const uploadDoubtAttachments = multer({
    storage: doubtStorage,
    limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB per file, max 5 files
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            const err = new Error('Invalid file format. Allowed types: PDF, Word (DOC/DOCX), Images (JPG/PNG/WebP), and Text files.');
            err.statusCode = 400;
            cb(err);
        }
    }
});

module.exports = {
    uploadAvatar,
    uploadHomeworkSubmission,
    uploadDoubtAttachments
};


