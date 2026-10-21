const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/public/subscription-plans
 * Returns active subscription plans for registration form dropdown
 */
router.get('/subscription-plans', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT id, name, code, description, monthly_price, yearly_price, display_order
            FROM subscription_plans
            WHERE deleted_at IS NULL AND (status = 'Active' OR status = 1 OR status = '1')
            ORDER BY display_order ASC, monthly_price ASC
        `);

        res.status(200).json({
            status: 'success',
            data: rows
        });
    } catch (error) {
        console.error('[publicRoutes] Error fetching subscription plans:', error);
        res.status(500).json({ status: 'error', message: 'Failed to retrieve subscription plans' });
    }
});

const { uploadLeadDocuments } = require('../middleware/uploadMiddleware');

/**
 * POST /api/public/leads
 * Public endpoint to register an institute lead with required documents from landing / registration page
 */
router.post('/leads', uploadLeadDocuments, async (req, res) => {
    try {
        const {
            instituteName,
            contactPerson,
            designation,
            email,
            mobile,
            altMobile,
            addressLine1,
            city,
            state,
            pincode,
            institutionType,
            website,
            planId,
            remarks
        } = req.body;

        // Text Validation
        if (!instituteName || !instituteName.trim()) {
            return res.status(400).json({ status: 'error', message: 'Institution name is required' });
        }
        if (!state || !state.trim()) {
            return res.status(400).json({ status: 'error', message: 'State is required' });
        }
        if (!city || !city.trim()) {
            return res.status(400).json({ status: 'error', message: 'City is required' });
        }
        if (!contactPerson || !contactPerson.trim()) {
            return res.status(400).json({ status: 'error', message: 'Contact person name is required' });
        }

        // Email validation (Mandatory so leads can be notified & tracked at login)
        if (!email || !email.trim()) {
            return res.status(400).json({ status: 'error', message: 'Email address is required' });
        }
        const cleanEmail = email.trim().toLowerCase();
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({ status: 'error', message: 'Please provide a valid email address' });
        }

        // Primary Mobile validation (Must be valid 10-digit Indian mobile starting with 6-9)
        const cleanMobile = (mobile || '').replace(/[^0-9]/g, '');
        if (!cleanMobile || cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
            return res.status(400).json({ status: 'error', message: 'Please enter a valid 10-digit mobile number' });
        }

        // Alternate Mobile validation (if provided)
        let cleanAlt = null;
        if (altMobile && altMobile.trim()) {
            cleanAlt = altMobile.replace(/[^0-9]/g, '');
            if (cleanAlt.length !== 10 || !/^[6-9]\d{9}$/.test(cleanAlt)) {
                return res.status(400).json({ status: 'error', message: 'Alternate mobile number must be a valid 10-digit mobile number' });
            }
        }

        // Pincode validation (if provided, must be 6 digits)
        let cleanPincode = null;
        if (pincode && pincode.trim()) {
            cleanPincode = pincode.replace(/[^0-9]/g, '');
            if (cleanPincode.length !== 6) {
                return res.status(400).json({ status: 'error', message: 'Pincode must be exactly 6 digits' });
            }
        }

        // Document Validations (Mandatory: reg_doc, pan_doc, admin_id_doc)
        const files = req.files || {};

        if (!files.reg_doc || files.reg_doc.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Institution Registration Proof is required (PDF, JPG, or PNG)' });
        }
        if (!files.pan_doc || files.pan_doc.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Institute / Owner PAN Card is required (PDF, JPG, or PNG)' });
        }
        if (!files.admin_id_doc || files.admin_id_doc.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Director / Admin ID Proof is required (PDF, JPG, or PNG)' });
        }

        // Extract relative URLs
        const regDocUrl = `/uploads/leads/documents/${files.reg_doc[0].filename}`;
        const panDocUrl = `/uploads/leads/documents/${files.pan_doc[0].filename}`;
        const adminIdDocUrl = `/uploads/leads/documents/${files.admin_id_doc[0].filename}`;
        const gstDocUrl = files.gst_doc && files.gst_doc.length > 0
            ? `/uploads/leads/documents/${files.gst_doc[0].filename}`
            : null;
        const logoUrl = files.logo && files.logo.length > 0
            ? `/uploads/leads/documents/${files.logo[0].filename}`
            : null;

        // Build combined notes if institution type or website are provided
        const extraNotes = [];
        if (institutionType) extraNotes.push(`Institution Type: ${institutionType}`);
        if (website) extraNotes.push(`Website: ${website}`);
        if (remarks) extraNotes.push(`Notes: ${remarks}`);
        const finalRemarks = extraNotes.length > 0 ? extraNotes.join(' | ') : null;

        // Insert into saas_leads table (source = 2 for Landing Page / Public Form, status = 1 for New Lead)
        const [result] = await pool.query(
            `INSERT INTO saas_leads (
                institute_name, contact_person, designation, email, mobile, alt_mobile,
                address_line1, city, state, pincode, source, status, plan_id, remarks,
                reg_doc_url, pan_doc_url, admin_id_doc_url, gst_doc_url, logo_url,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, 1, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                instituteName.trim(),
                contactPerson.trim(),
                designation ? designation.trim() : null,
                cleanEmail,
                cleanMobile,
                cleanAlt,
                addressLine1 ? addressLine1.trim() : null,
                city ? city.trim() : null,
                state ? state.trim() : null,
                cleanPincode,
                planId ? Number(planId) : null,
                finalRemarks,
                regDocUrl,
                panDocUrl,
                adminIdDocUrl,
                gstDocUrl,
                logoUrl
            ]
        );

        res.status(201).json({
            status: 'success',
            message: 'Your registration request has been submitted successfully. Our team will contact you shortly.',
            data: {
                leadId: result.insertId
            }
        });
    } catch (error) {
        console.error('[publicRoutes] Error registering institute lead:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to process registration request. Please try again.' });
    }
});

module.exports = router;

