const academicEventModel = require('../models/academicEventModel');

const academicEventController = {
    async listEvents(req, res) {
        try {
            const tenantId = req.user.tenantId || req.user.tenant_id;
            const { branchId, type, startDate, endDate, search } = req.query;

            const events = await academicEventModel.getEvents(tenantId, {
                branchId,
                type,
                startDate,
                endDate,
                search
            });

            return res.status(200).json({
                status: 'success',
                data: events
            });
        } catch (error) {
            console.error('[academicEventController.listEvents] error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Failed to fetch academic events.'
            });
        }
    },

    async getEvent(req, res) {
        try {
            const tenantId = req.user.tenantId || req.user.tenant_id;
            const { id } = req.params;

            const event = await academicEventModel.getEventById(tenantId, id);
            if (!event) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Event not found.'
                });
            }

            return res.status(200).json({
                status: 'success',
                data: event
            });
        } catch (error) {
            console.error('[academicEventController.getEvent] error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Failed to fetch event.'
            });
        }
    },

    async createEvent(req, res) {
        try {
            const tenantId = req.user.tenantId || req.user.tenant_id;
            const userId = req.user.userId || req.user.id;
            const { title, type, eventType, startDate, endDate, startTime, endTime, description, venue, branchId, academicYearId } = req.body;

            if (!title || !title.trim()) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Event title is required.'
                });
            }

            if (!startDate) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Start date is required.'
                });
            }

            const newEvent = await academicEventModel.createEvent(tenantId, {
                title,
                type: type || eventType || 'EVENT',
                startDate,
                endDate: endDate || startDate,
                startTime,
                endTime,
                description,
                venue,
                branchId,
                academicYearId
            }, userId);

            return res.status(201).json({
                status: 'success',
                message: 'Academic event created successfully.',
                data: newEvent
            });
        } catch (error) {
            console.error('[academicEventController.createEvent] error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Failed to create event.'
            });
        }
    },

    async updateEvent(req, res) {
        try {
            const tenantId = req.user.tenantId || req.user.tenant_id;
            const userId = req.user.userId || req.user.id;
            const { id } = req.params;
            const { title, type, eventType, startDate, endDate, startTime, endTime, description, venue, branchId, academicYearId } = req.body;

            const updatedEvent = await academicEventModel.updateEvent(tenantId, id, {
                title,
                type: type || eventType,
                startDate,
                endDate,
                startTime,
                endTime,
                description,
                venue,
                branchId,
                academicYearId
            }, userId);

            if (!updatedEvent) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Event not found.'
                });
            }

            return res.status(200).json({
                status: 'success',
                message: 'Academic event updated successfully.',
                data: updatedEvent
            });
        } catch (error) {
            console.error('[academicEventController.updateEvent] error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Failed to update event.'
            });
        }
    },

    async deleteEvent(req, res) {
        try {
            const tenantId = req.user.tenantId || req.user.tenant_id;
            const { id } = req.params;

            const deleted = await academicEventModel.deleteEvent(tenantId, id);
            if (!deleted) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Event not found.'
                });
            }

            return res.status(200).json({
                status: 'success',
                message: 'Academic event deleted successfully.'
            });
        } catch (error) {
            console.error('[academicEventController.deleteEvent] error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Failed to delete event.'
            });
        }
    }
};

module.exports = academicEventController;
