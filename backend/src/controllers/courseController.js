const courseModel = require('../models/courseModel');

// Resolve the tenant id for the acting user.
const resolveTenantId = (req) => req.user && req.user.tenantId;

const getCourses = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', branchId, status } = req.query;
        const offset = (page - 1) * limit;

        const result = await courseModel.getCourses(resolveTenantId(req), {
            search,
            branchId,
            status,
            limit: Number(limit),
            offset
        });

        res.status(200).json({
            status: 'success',
            data: result.data,
            pagination: {
                total: result.total,
                page: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getCourseByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const course = await courseModel.getCourseByCode(resolveTenantId(req), code);

        if (!course) {
            return res.status(404).json({ status: 'error', message: 'Course not found' });
        }

        res.status(200).json({ status: 'success', data: course });
    } catch (error) {
        console.error('Error fetching course details:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const createCourse = async (req, res) => {
    try {
        const { name, code, description, is_active, branches, programs } = req.body;

        if (!name || !code) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields (name, code)' });
        }
        const result = await courseModel.createCourse(resolveTenantId(req), {
            name, code, description, is_active, branches, programs
        }, req.user.userId);

        res.status(201).json({ status: 'success', message: 'Course created successfully', data: result });
    } catch (error) {
        console.error('Error creating course:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ status: 'error', message: 'Course code already exists for this institute' });
        }
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const updateCourse = async (req, res) => {
    try {
        const { code } = req.params;
        const { name, description, is_active, branches, programs } = req.body;

        const result = await courseModel.updateCourse(resolveTenantId(req), code, {
            name, description, is_active, branches, programs
        }, req.user.userId);

        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Course not found' });
        }

        res.status(200).json({ status: 'success', message: 'Course updated successfully', data: result });
    } catch (error) {
        console.error('Error updating course:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ status: 'error', message: 'A program/level code already exists for this course' });
        }
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const { code } = req.params;
        const success = await courseModel.deleteCourse(resolveTenantId(req), code, req.user.userId);

        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Course not found' });
        }

        res.status(200).json({ status: 'success', message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

module.exports = {
    getCourses,
    getCourseByCode,
    createCourse,
    updateCourse,
    deleteCourse
};
