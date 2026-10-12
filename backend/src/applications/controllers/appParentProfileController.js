const appParentProfileService = require('../services/appParentProfileService');

class AppParentProfileController {
    /**
     * GET /api/app/parent/profile
     */
    async getProfile(req, res) {
        try {
            const result = await appParentProfileService.getProfile(req.user);
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve parent profile.'
            });
        }
    }

    /**
     * PUT /api/app/parent/profile
     */
    async updateProfile(req, res) {
        try {
            const result = await appParentProfileService.updateProfile(req.user, req.body);
            return res.status(200).json({
                success: true,
                message: 'Parent profile updated successfully.',
                data: result
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update parent profile.'
            });
        }
    }

    /**
     * POST /api/app/parent/profile/photo
     */
    async updateProfilePhoto(req, res) {
        try {
            const result = await appParentProfileService.updateProfilePhoto(req.user, req.file);
            return res.status(200).json({
                success: true,
                message: 'Parent profile photo updated successfully.',
                data: result
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update profile photo.'
            });
        }
    }
}

module.exports = new AppParentProfileController();
