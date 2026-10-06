const pool = require('../config/db');

/**
 * Model for Academic Calendar Events and Holidays
 */
const academicEventModel = {
    /**
     * Get list of academic events
     */
    async getEvents(tenantId, filters = {}) {
        const tid = Number(tenantId);
        let query = `
            SELECT 
                ae.id,
                ae.tenant_id,
                ae.branch_id,
                b.name AS branch_name,
                b.code AS branch_code,
                ae.academic_year_id,
                ae.title,
                ae.event_type AS \`type\`,
                DATE_FORMAT(ae.start_date, '%Y-%m-%d') AS start_date,
                DATE_FORMAT(COALESCE(ae.end_date, ae.start_date), '%Y-%m-%d') AS end_date,
                TIME_FORMAT(ae.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(ae.end_time, '%H:%i') AS end_time,
                ae.description,
                ae.venue,
                ae.created_by,
                ae.created_at,
                ae.updated_at
            FROM academic_events ae
            LEFT JOIN branches b ON ae.branch_id = b.id
            WHERE ae.tenant_id = ? AND ae.deleted_at IS NULL
        `;
        const params = [tid];

        if (filters.branchId && filters.branchId !== 'All' && filters.branchId !== 'all') {
            query += ` AND (ae.branch_id IS NULL OR ae.branch_id = ?)`;
            params.push(Number(filters.branchId));
        }

        if (filters.type && filters.type !== 'All' && filters.type !== 'all') {
            query += ` AND ae.event_type = ?`;
            params.push(filters.type);
        }

        if (filters.startDate) {
            query += ` AND COALESCE(ae.end_date, ae.start_date) >= ?`;
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ` AND ae.start_date <= ?`;
            params.push(filters.endDate);
        }

        if (filters.search) {
            query += ` AND (ae.title LIKE ? OR ae.description LIKE ? OR ae.venue LIKE ?)`;
            const searchPattern = `%${filters.search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        query += ` ORDER BY ae.start_date ASC, ae.id ASC`;

        const [rows] = await pool.query(query, params);

        return rows.map(r => ({
            id: String(r.id),
            title: r.title,
            type: r.type,
            startDate: r.start_date,
            endDate: r.end_date,
            startTime: r.start_time,
            endTime: r.end_time,
            description: r.description || '',
            venue: r.venue || (r.branch_name ? r.branch_name : 'All Branches'),
            branchId: r.branch_id,
            branchName: r.branch_name || 'All Branches',
            academicYearId: r.academic_year_id,
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }));
    },

    /**
     * Get single event by ID
     */
    async getEventById(tenantId, id) {
        const tid = Number(tenantId);
        const [rows] = await pool.query(
            `SELECT 
                ae.id,
                ae.tenant_id,
                ae.branch_id,
                b.name AS branch_name,
                b.code AS branch_code,
                ae.academic_year_id,
                ae.title,
                ae.event_type AS \`type\`,
                DATE_FORMAT(ae.start_date, '%Y-%m-%d') AS start_date,
                DATE_FORMAT(COALESCE(ae.end_date, ae.start_date), '%Y-%m-%d') AS end_date,
                TIME_FORMAT(ae.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(ae.end_time, '%H:%i') AS end_time,
                ae.description,
                ae.venue,
                ae.created_by,
                ae.created_at,
                ae.updated_at
             FROM academic_events ae
             LEFT JOIN branches b ON ae.branch_id = b.id
             WHERE ae.tenant_id = ? AND ae.id = ? AND ae.deleted_at IS NULL`,
            [tid, id]
        );

        if (!rows.length) return null;
        const r = rows[0];
        return {
            id: String(r.id),
            title: r.title,
            type: r.type,
            startDate: r.start_date,
            endDate: r.end_date,
            startTime: r.start_time,
            endTime: r.end_time,
            description: r.description || '',
            venue: r.venue || (r.branch_name ? r.branch_name : 'All Branches'),
            branchId: r.branch_id,
            branchName: r.branch_name || 'All Branches',
            academicYearId: r.academic_year_id,
            createdAt: r.created_at,
            updatedAt: r.updated_at
        };
    },

    /**
     * Create event
     */
    async createEvent(tenantId, data, userId = null) {
        const tid = Number(tenantId);
        const branchId = data.branchId ? Number(data.branchId) : null;
        const title = (data.title || '').trim();
        const eventType = data.type || data.eventType || 'EVENT';
        const startDate = data.startDate;
        const endDate = data.endDate || data.startDate;
        const startTime = data.startTime || null;
        const endTime = data.endTime || null;
        const description = (data.description || '').trim();
        const venue = (data.venue || '').trim() || (branchId ? null : 'All Branches');
        const academicYearId = data.academicYearId ? Number(data.academicYearId) : null;

        const [result] = await pool.query(
            `INSERT INTO academic_events 
             (tenant_id, branch_id, academic_year_id, title, event_type, start_date, end_date, start_time, end_time, description, venue, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tid, branchId, academicYearId, title, eventType, startDate, endDate, startTime, endTime, description, venue, userId]
        );

        const newId = result.insertId;

        // If it's a HOLIDAY, keep holidays table in sync
        if (eventType === 'HOLIDAY') {
            try {
                await pool.query(
                    `INSERT INTO holidays (tenant_id, branch_id, name, holiday_date, description, created_by)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`,
                    [tid, branchId || 0, title, startDate, description, userId]
                );
            } catch (syncErr) {
                console.warn('[academicEventModel.createEvent] Holiday sync warning:', syncErr.message);
            }
        }

        return this.getEventById(tid, newId);
    },

    /**
     * Update event
     */
    async updateEvent(tenantId, id, data, userId = null) {
        const tid = Number(tenantId);
        const existing = await this.getEventById(tid, id);
        if (!existing) return null;

        const branchId = data.branchId !== undefined ? (data.branchId ? Number(data.branchId) : null) : existing.branchId;
        const title = data.title !== undefined ? (data.title || '').trim() : existing.title;
        const eventType = data.type || data.eventType || existing.type;
        const startDate = data.startDate || existing.startDate;
        const endDate = data.endDate || existing.endDate || startDate;
        const startTime = data.startTime !== undefined ? data.startTime : existing.startTime;
        const endTime = data.endTime !== undefined ? data.endTime : existing.endTime;
        const description = data.description !== undefined ? (data.description || '').trim() : existing.description;
        const venue = data.venue !== undefined ? (data.venue || '').trim() : existing.venue;
        const academicYearId = data.academicYearId !== undefined ? (data.academicYearId ? Number(data.academicYearId) : null) : existing.academicYearId;

        await pool.query(
            `UPDATE academic_events
             SET branch_id = ?, academic_year_id = ?, title = ?, event_type = ?,
                 start_date = ?, end_date = ?, start_time = ?, end_time = ?,
                 description = ?, venue = ?, updated_at = NOW()
             WHERE tenant_id = ? AND id = ?`,
            [branchId, academicYearId, title, eventType, startDate, endDate, startTime, endTime, description, venue, tid, id]
        );

        // If HOLIDAY, update holiday table if applicable
        if (eventType === 'HOLIDAY') {
            try {
                await pool.query(
                    `INSERT INTO holidays (tenant_id, branch_id, name, holiday_date, description, created_by)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`,
                    [tid, branchId || 0, title, startDate, description, userId]
                );
            } catch (syncErr) {
                console.warn('[academicEventModel.updateEvent] Holiday sync warning:', syncErr.message);
            }
        }

        return this.getEventById(tid, id);
    },

    /**
     * Delete event (soft delete)
     */
    async deleteEvent(tenantId, id) {
        const tid = Number(tenantId);
        const existing = await this.getEventById(tid, id);
        if (!existing) return false;

        const [result] = await pool.query(
            `UPDATE academic_events SET deleted_at = NOW() WHERE tenant_id = ? AND id = ?`,
            [tid, id]
        );

        // If it was a holiday, soft-delete or remove from holidays table
        if (existing.type === 'HOLIDAY') {
            try {
                await pool.query(
                    `DELETE FROM holidays WHERE tenant_id = ? AND holiday_date = ? AND name = ?`,
                    [tid, existing.startDate, existing.title]
                );
            } catch (syncErr) {
                console.warn('[academicEventModel.deleteEvent] Holiday removal warning:', syncErr.message);
            }
        }

        return result.affectedRows > 0;
    }
};

module.exports = academicEventModel;
