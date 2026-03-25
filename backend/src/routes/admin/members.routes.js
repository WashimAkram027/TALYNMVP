import { Router } from 'express'
import { authenticateAdmin, requireAdminRole } from '../../middleware/adminAuth.js'
import { adminMembersController } from '../../controllers/admin/members.controller.js'
import { supabase } from '../../config/supabase.js'
import { successResponse, errorResponse } from '../../utils/response.js'
import { auditLogService } from '../../services/admin/auditLog.service.js'

const router = Router()

router.use(authenticateAdmin)

// List all members cross-org
router.get('/', adminMembersController.list)

// Get member detail
router.get('/:id', adminMembersController.getDetail)

// Override member status (super_admin only)
router.put('/:id/status', requireAdminRole('super_admin'), adminMembersController.overrideStatus)

// Verify member's bank details
router.post('/:id/verify-bank', requireAdminRole('super_admin', 'finance_admin'), async (req, res) => {
  try {
    const memberId = req.params.id
    const adminId = req.admin.id
    const ip = req.ip || req.headers['x-forwarded-for']

    // Get current member
    const { data: member, error: fetchError } = await supabase
      .from('organization_members')
      .select('id, bank_verified_at, profile:profiles!organization_members_profile_id_fkey(id, first_name, last_name, email)')
      .eq('id', memberId)
      .single()

    if (fetchError || !member) {
      return errorResponse(res, 'Member not found', 404)
    }

    if (member.bank_verified_at) {
      return errorResponse(res, 'Bank details already verified', 400)
    }

    const { error } = await supabase
      .from('organization_members')
      .update({
        bank_verified_at: new Date().toISOString(),
        bank_verified_by: adminId
      })
      .eq('id', memberId)

    if (error) throw error

    await auditLogService.log(adminId, 'bank_verified', 'organization_member', memberId, {
      memberName: member.profile ? `${member.profile.first_name} ${member.profile.last_name}` : null
    }, ip)

    return successResponse(res, null, 'Bank details verified')
  } catch (error) {
    return errorResponse(res, error.message, 500)
  }
})

export default router
