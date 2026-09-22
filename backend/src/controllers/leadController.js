const leadService = require('../services/leadService');
const leadModel = require('../models/leadModel');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobileRegex = /^[0-9]{10}$/;

const getLeads = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = '', source = '', plan = '', assignedTo = '' } = req.query;
        const offset = (page - 1) * limit;

        const result = await leadService.getLeads({
            limit,
            offset,
            search,
            status,
            source,
            planId: plan,
            assignedTo
        });

        res.status(200).json({
            status: 'success',
            data: result.data,
            pagination: {
                total: result.total,
                page: Number(page),
                limit: Number(limit)
            },
            filters: {
                statuses: result.available_statuses
            }
        });
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getLeadById = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await leadService.getLeadById(id);

        if (!lead) {
            return res.status(404).json({ status: 'error', message: 'Lead not found' });
        }

        res.status(200).json({ status: 'success', data: lead });
    } catch (error) {
        console.error('Error fetching lead:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const createLead = async (req, res) => {
    try {
        const {
            instituteName, contactPerson, designation, email, mobile, altMobile,
            addressLine1, city, state, pincode, source, assignedTo, status, lostReason,
            nextFollowupAt, planId, preferredSlug, remarks
        } = req.body;

        if (!instituteName || !instituteName.trim()) {
            return res.status(400).json({ status: 'error', message: 'Institute name is compulsory' });
        }
        if (!contactPerson || !contactPerson.trim()) {
            return res.status(400).json({ status: 'error', message: 'Contact person name is compulsory' });
        }
        const cleanMobile = (mobile || '').replace(/[^0-9]/g, '');
        if (!cleanMobile || cleanMobile.length < 10) {
            return res.status(400).json({ status: 'error', message: 'Mobile number is compulsory and must be at least 10 digits' });
        }
        if (email && !emailRegex.test(email.trim())) {
            return res.status(400).json({ status: 'error', message: 'Invalid format: Email is incorrectly formatted' });
        }
        if (altMobile) {
            const cleanAlt = altMobile.replace(/[^0-9]/g, '');
            if (cleanAlt.length < 10) {
                return res.status(400).json({ status: 'error', message: 'Alternate mobile number must be at least 10 digits' });
            }
        }

        const createdBy = req.user ? (req.user.userId || req.user.id) : null;

        const lead = await leadService.createLead({
            instituteName: instituteName.trim(),
            contactPerson: contactPerson.trim(),
            designation: designation || null,
            email: email ? email.trim() : null,
            mobile: cleanMobile,
            altMobile: altMobile ? altMobile.replace(/[^0-9]/g, '') : null,
            addressLine1: addressLine1 || null,
            city: city || null,
            state: state || null,
            pincode: pincode || null,
            source: source !== undefined && source !== '' ? Number(source) : 1,
            assignedTo: assignedTo ? Number(assignedTo) : null,
            status: status !== undefined && status !== '' ? Number(status) : 1,
            lostReason: lostReason || null,
            nextFollowupAt: nextFollowupAt || null,
            planId: planId ? Number(planId) : null,
            preferredSlug: preferredSlug || null,
            remarks: remarks || null
        }, createdBy);

        res.status(201).json({ status: 'success', message: 'Lead created successfully', data: lead });
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const updateLead = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            instituteName, contactPerson, designation, email, mobile, altMobile,
            addressLine1, city, state, pincode, source, assignedTo, status, lostReason,
            nextFollowupAt, planId, preferredSlug, remarks
        } = req.body;

        if (instituteName !== undefined && !instituteName.trim()) {
            return res.status(400).json({ status: 'error', message: 'Institute name cannot be empty' });
        }
        if (contactPerson !== undefined && !contactPerson.trim()) {
            return res.status(400).json({ status: 'error', message: 'Contact person name cannot be empty' });
        }
        if (mobile !== undefined) {
            const cleanMobile = mobile.replace(/[^0-9]/g, '');
            if (cleanMobile.length < 10) {
                return res.status(400).json({ status: 'error', message: 'Mobile number must be at least 10 digits' });
            }
        }
        if (email !== undefined && email && !emailRegex.test(email.trim())) {
            return res.status(400).json({ status: 'error', message: 'Invalid format: Email is incorrectly formatted' });
        }

        const updatedBy = req.user ? (req.user.userId || req.user.id) : null;

        const lead = await leadService.updateLead(id, {
            instituteName: instituteName !== undefined ? instituteName.trim() : undefined,
            contactPerson: contactPerson !== undefined ? contactPerson.trim() : undefined,
            designation,
            email,
            mobile,
            altMobile,
            addressLine1,
            city,
            state,
            pincode,
            source: source !== undefined && source !== '' ? Number(source) : undefined,
            assignedTo: assignedTo !== undefined ? Number(assignedTo) || null : undefined,
            status: status !== undefined && status !== '' ? Number(status) : undefined,
            lostReason,
            nextFollowupAt,
            planId: planId !== undefined ? Number(planId) || null : undefined,
            preferredSlug,
            remarks
        }, updatedBy);

        if (!lead) {
            return res.status(404).json({ status: 'error', message: 'Lead not found' });
        }

        res.status(200).json({ status: 'success', message: 'Lead updated successfully', data: lead });
    } catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const updateLeadStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = [1, 2, 3, 4, 5, 6, 7];
        if (!validStatuses.includes(Number(status))) {
            return res.status(400).json({ status: 'error', message: 'Invalid status. Expected 1 (new), 2 (contacted), 3 (follow_up), 4 (plan_assigned), 5 (interested), 6 (converted), or 7 (lost)' });
        }

        const updatedBy = req.user ? (req.user.userId || req.user.id) : null;
        const lead = await leadService.updateLeadStatus(id, Number(status), updatedBy);

        if (!lead) {
            return res.status(404).json({ status: 'error', message: 'Lead not found' });
        }

        res.status(200).json({ status: 'success', message: 'Lead status updated successfully', data: lead });
    } catch (error) {
        console.error('Error updating lead status:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const deleteLead = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedBy = req.user ? (req.user.userId || req.user.id) : null;
        const lostReason = req.body && req.body.lostReason ? String(req.body.lostReason).trim() : null;

        const success = await leadService.softDeleteLead(id, updatedBy, lostReason);
        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Lead not found or already deleted' });
        }

        res.status(200).json({ status: 'success', message: 'Lead deleted successfully' });
    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const addFollowup = async (req, res) => {
    try {
        const { id } = req.params;
        const { followupMode, outcome, notes, nextFollowupAt } = req.body;

        if (!followupMode || !followupMode.trim()) {
            return res.status(400).json({ status: 'error', message: 'Follow-up mode is compulsory' });
        }
        if (!outcome || !outcome.trim()) {
            return res.status(400).json({ status: 'error', message: 'Follow-up outcome is compulsory' });
        }

        const lead = await leadService.getLeadById(id);
        if (!lead) {
            return res.status(404).json({ status: 'error', message: 'Lead not found' });
        }

        const createdBy = req.user ? (req.user.userId || req.user.id) : null;
        const followupId = await leadService.addFollowup(id, {
            followupMode: followupMode.trim(),
            outcome: outcome.trim(),
            notes,
            nextFollowupAt: nextFollowupAt || null
        }, createdBy);

        const updatedLead = await leadService.getLeadById(id);

        // Auto-advance status from new -> contacted after first followup
        if (lead.status === 1 && updatedLead.status === 1) {
            await leadModel.updateLeadStatus(id, 2, createdBy);
            updatedLead.status = 2;
        }

        res.status(201).json({ status: 'success', message: 'Follow-up added successfully', data: { id: followupId, lead: updatedLead } });
    } catch (error) {
        console.error('Error adding follow-up:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

module.exports = {
    getLeads,
    getLeadById,
    createLead,
    updateLead,
    updateLeadStatus,
    deleteLead,
    addFollowup
};