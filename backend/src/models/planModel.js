const pool = require('../config/db');

const getPlans = async () => {
    const query = `
        SELECT *
        FROM subscription_plans
        ORDER BY price_monthly ASC
    `;
    const [rows] = await pool.query(query);
    return rows;
};

const getPlanById = async (id) => {
    const query = `
        SELECT *
        FROM subscription_plans
        WHERE id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0];
};

const createPlan = async (planData) => {
    const { name, code, price_monthly, price_annual, max_branches, max_students, max_users, max_storage_gb, trial_period_days, description } = planData;
    
    const query = `
        INSERT INTO subscription_plans 
        (name, code, price_monthly, price_annual, max_branches, max_students, max_users, max_storage_gb, trial_period_days, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [name, code, price_monthly, price_annual, max_branches, max_students, max_users, max_storage_gb, trial_period_days || 0, description]);
    
    return result.insertId;
};

const updatePlanStatus = async (id, is_active) => {
    const query = `
        UPDATE subscription_plans
        SET is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    const [result] = await pool.query(query, [is_active, id]);
    return result.affectedRows > 0;
};

module.exports = {
    getPlans,
    getPlanById,
    createPlan,
    updatePlanStatus
};
