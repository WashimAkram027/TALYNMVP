import { Resend } from 'resend'
import { supabase } from '../config/supabase.js'
import { env } from '../config/env.js'

// Initialize Resend client
const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null

// Escape HTML entities to prevent XSS in email templates
function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Email service - handles sending emails via Resend
 */
export const emailService = {
  /**
   * Log email to database for audit trail
   * @param {string} recipient - Recipient email
   * @param {string} type - Email type (verification, invitation, welcome, notification)
   * @param {string} subject - Email subject
   * @param {string} messageId - Resend message ID (if available)
   * @param {string} status - sent, failed, mock
   * @param {object} metadata - Additional metadata
   * @param {string} errorMessage - Error message if failed
   */
  async logEmail(recipient, type, subject, messageId = null, status = 'sent', metadata = null, errorMessage = null) {
    try {
      await supabase.from('email_logs').insert({
        recipient_email: recipient,
        email_type: type,
        subject: subject,
        resend_message_id: messageId,
        status: status,
        metadata: metadata,
        error_message: errorMessage
      })
    } catch (error) {
      console.error('[EmailService] Failed to log email:', error)
    }
  },

  /**
   * Send email verification email
   * @param {string} email - Recipient email
   * @param {string} token - Verification token (unhashed)
   * @param {string} firstName - User's first name
   */
  async sendVerificationEmail(email, token, firstName = 'there') {
    const verifyUrl = `${env.frontendUrl}/verify-email?token=${token}`
    const displayName = firstName || 'there'
    const subject = 'Verify your email address - Talyn'

    if (!resend) {
      console.warn('[EmailService] Resend not configured, skipping email send')
      console.log('[EmailService] Verification token for', email, ':', token)
      await this.logEmail(email, 'verification', subject, null, 'mock', { firstName })
      return { success: true, mock: true }
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #3B82F6;">Talyn</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1a1a1a;">Verify Your Email Address</h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi ${displayName},
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Thanks for signing up for Talyn! Please verify your email address by clicking the button below:
              </p>

              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #3B82F6; text-decoration: none; border-radius: 6px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                This link will expire in 24 hours for security reasons.
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                If you didn't create an account with Talyn, you can safely ignore this email.
              </p>

              <!-- Fallback URL -->
              <p style="margin: 20px 0 0; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #3B82F6; word-break: break-all;">
                ${verifyUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                &copy; ${new Date().getFullYear()} Talyn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    const text = `
Hi ${displayName},

Thanks for signing up for Talyn! Please verify your email address by visiting:

${verifyUrl}

This link will expire in 24 hours for security reasons.

If you didn't create an account with Talyn, you can safely ignore this email.

- The Talyn Team
    `.trim()

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [email],
        subject,
        html,
        text
      })

      if (error) {
        console.error('[EmailService] Resend error:', error)
        await this.logEmail(email, 'verification', subject, null, 'failed', { firstName }, error.message)
        throw new Error(error.message || 'Failed to send email')
      }

      console.log('[EmailService] Verification email sent:', data?.id)
      await this.logEmail(email, 'verification', subject, data?.id, 'sent', { firstName })
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send verification email:', error)
      await this.logEmail(email, 'verification', subject, null, 'failed', { firstName }, error.message)
      throw error
    }
  },

  /**
   * Send invitation email to team member
   * @param {string} email - Recipient email
   * @param {string} inviterName - Name of person who sent the invitation
   * @param {string} orgName - Organization name
   * @param {string} jobTitle - Job title being offered
   */
  async sendInvitationEmail(email, inviterName, orgName, jobTitle = null) {
    const signupUrl = `${env.frontendUrl}/signup/employee?email=${encodeURIComponent(email)}&invite=true`
    const subject = `You've been invited to join ${orgName} on Talyn`

    if (!resend) {
      console.warn('[EmailService] Resend not configured, skipping email send')
      console.log('[EmailService] Invitation email for', email, '- Sign up at:', signupUrl)
      await this.logEmail(email, 'invitation', subject, null, 'mock', { inviterName, orgName, jobTitle })
      return { success: true, mock: true }
    }

    const jobInfo = jobTitle ? `<p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;"><strong>Position:</strong> ${jobTitle}</p>` : ''
    const jobInfoText = jobTitle ? `Position: ${jobTitle}\n\n` : ''

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #3B82F6;">Talyn</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1a1a1a;">You've Been Invited!</h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                ${inviterName} has invited you to join <strong>${orgName}</strong> on Talyn.
              </p>
              ${jobInfo}
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Click the button below to create your account and accept the invitation:
              </p>

              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${signupUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #3B82F6; text-decoration: none; border-radius: 6px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                Already have a Talyn account? Just log in and you'll see the invitation waiting for you.
              </p>

              <!-- Fallback URL -->
              <p style="margin: 20px 0 0; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #3B82F6; word-break: break-all;">
                ${signupUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                &copy; ${new Date().getFullYear()} Talyn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    const text = `
You've Been Invited!

${inviterName} has invited you to join ${orgName} on Talyn.

${jobInfoText}Click the link below to create your account and accept the invitation:

${signupUrl}

Already have a Talyn account? Just log in and you'll see the invitation waiting for you.

- The Talyn Team
    `.trim()

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [email],
        subject,
        html,
        text
      })

      if (error) {
        console.error('[EmailService] Resend error:', error)
        await this.logEmail(email, 'invitation', subject, null, 'failed', { inviterName, orgName, jobTitle }, error.message)
        throw new Error(error.message || 'Failed to send email')
      }

      console.log('[EmailService] Invitation email sent:', data?.id)
      await this.logEmail(email, 'invitation', subject, data?.id, 'sent', { inviterName, orgName, jobTitle })
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send invitation email:', error)
      await this.logEmail(email, 'invitation', subject, null, 'failed', { inviterName, orgName, jobTitle }, error.message)
      throw error
    }
  },

  /**
   * Send welcome email to employer after verification
   * @param {string} email - Recipient email
   * @param {string} firstName - User's first name
   * @param {string} companyName - Company name
   */
  async sendWelcomeEmployerEmail(email, firstName, companyName) {
    const dashboardUrl = `${env.frontendUrl}/dashboard`
    const displayName = firstName || 'there'
    const subject = `Welcome to Talyn, ${displayName}!`

    if (!resend) {
      console.warn('[EmailService] Resend not configured, skipping email send')
      await this.logEmail(email, 'welcome_employer', subject, null, 'mock', { firstName, companyName })
      return { success: true, mock: true }
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Talyn</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #3B82F6;">Talyn</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1a1a1a;">Welcome to Talyn!</h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi ${displayName},
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Your account for <strong>${companyName}</strong> is now verified and ready to use!
              </p>
              <p style="margin: 0 0 10px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                <strong>Here's what you can do next:</strong>
              </p>
              <ul style="margin: 0 0 20px; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                <li>Invite team members to join your organization</li>
                <li>Set up departments and roles</li>
                <li>Manage payroll and time off</li>
                <li>Track your team's progress</li>
              </ul>

              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #3B82F6; text-decoration: none; border-radius: 6px;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                &copy; ${new Date().getFullYear()} Talyn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    const text = `
Welcome to Talyn!

Hi ${displayName},

Your account for ${companyName} is now verified and ready to use!

Here's what you can do next:
- Invite team members to join your organization
- Set up departments and roles
- Manage payroll and time off
- Track your team's progress

Go to your dashboard: ${dashboardUrl}

- The Talyn Team
    `.trim()

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [email],
        subject,
        html,
        text
      })

      if (error) {
        console.error('[EmailService] Resend error:', error)
        await this.logEmail(email, 'welcome_employer', subject, null, 'failed', { firstName, companyName }, error.message)
        return { success: false }
      }

      console.log('[EmailService] Welcome employer email sent:', data?.id)
      await this.logEmail(email, 'welcome_employer', subject, data?.id, 'sent', { firstName, companyName })
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send welcome email:', error)
      await this.logEmail(email, 'welcome_employer', subject, null, 'failed', { firstName, companyName }, error.message)
      return { success: false }
    }
  },

  /**
   * Send welcome email to candidate after verification
   * @param {string} email - Recipient email
   * @param {string} firstName - User's first name
   */
  async sendWelcomeCandidateEmail(email, firstName) {
    const dashboardUrl = `${env.frontendUrl}/dashboard-employee`
    const displayName = firstName || 'there'
    const subject = `Welcome to Talyn, ${displayName}!`

    if (!resend) {
      console.warn('[EmailService] Resend not configured, skipping email send')
      await this.logEmail(email, 'welcome_candidate', subject, null, 'mock', { firstName })
      return { success: true, mock: true }
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Talyn</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #3B82F6;">Talyn</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1a1a1a;">Welcome to Talyn!</h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi ${displayName},
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Your Talyn account is now verified and ready to use!
              </p>
              <p style="margin: 0 0 10px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                <strong>What happens next:</strong>
              </p>
              <ul style="margin: 0 0 20px; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                <li>Complete your profile to stand out to employers</li>
                <li>When an employer invites you, you'll see it in your dashboard</li>
                <li>Accept invitations to join teams and access your payroll info</li>
              </ul>

              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #3B82F6; text-decoration: none; border-radius: 6px;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                &copy; ${new Date().getFullYear()} Talyn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    const text = `
Welcome to Talyn!

Hi ${displayName},

Your Talyn account is now verified and ready to use!

What happens next:
- Complete your profile to stand out to employers
- When an employer invites you, you'll see it in your dashboard
- Accept invitations to join teams and access your payroll info

Go to your dashboard: ${dashboardUrl}

- The Talyn Team
    `.trim()

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [email],
        subject,
        html,
        text
      })

      if (error) {
        console.error('[EmailService] Resend error:', error)
        await this.logEmail(email, 'welcome_candidate', subject, null, 'failed', { firstName }, error.message)
        return { success: false }
      }

      console.log('[EmailService] Welcome candidate email sent:', data?.id)
      await this.logEmail(email, 'welcome_candidate', subject, data?.id, 'sent', { firstName })
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send welcome email:', error)
      await this.logEmail(email, 'welcome_candidate', subject, null, 'failed', { firstName }, error.message)
      return { success: false }
    }
  },

  /**
   * Send notification to employer when candidate accepts invitation
   * @param {string} employerEmail - Employer's email
   * @param {string} employerName - Employer's first name
   * @param {string} candidateName - Candidate's full name
   * @param {string} orgName - Organization name
   */
  async sendInvitationAcceptedEmail(employerEmail, employerName, candidateName, orgName) {
    const teamUrl = `${env.frontendUrl}/people`
    const displayName = employerName || 'there'
    const subject = `${candidateName} has joined your team on Talyn`

    if (!resend) {
      console.warn('[EmailService] Resend not configured, skipping email send')
      await this.logEmail(employerEmail, 'invitation_accepted', subject, null, 'mock', { employerName, candidateName, orgName })
      return { success: true, mock: true }
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation Accepted</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #3B82F6;">Talyn</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1a1a1a;">New Team Member!</h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi ${displayName},
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Great news! <strong>${candidateName}</strong> has accepted your invitation to join <strong>${orgName}</strong>.
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                They are now an active member of your team and can access their employee dashboard.
              </p>

              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${teamUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #3B82F6; text-decoration: none; border-radius: 6px;">
                      View Team
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                &copy; ${new Date().getFullYear()} Talyn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    const text = `
New Team Member!

Hi ${displayName},

Great news! ${candidateName} has accepted your invitation to join ${orgName}.

They are now an active member of your team and can access their employee dashboard.

View your team: ${teamUrl}

- The Talyn Team
    `.trim()

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [employerEmail],
        subject,
        html,
        text
      })

      if (error) {
        console.error('[EmailService] Resend error:', error)
        await this.logEmail(employerEmail, 'invitation_accepted', subject, null, 'failed', { employerName, candidateName, orgName }, error.message)
        return { success: false }
      }

      console.log('[EmailService] Invitation accepted email sent:', data?.id)
      await this.logEmail(employerEmail, 'invitation_accepted', subject, data?.id, 'sent', { employerName, candidateName, orgName })
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send notification email:', error)
      await this.logEmail(employerEmail, 'invitation_accepted', subject, null, 'failed', { employerName, candidateName, orgName }, error.message)
      return { success: false }
    }
  },

  /**
   * Send notification to employer when candidate declines invitation
   * @param {string} employerEmail - Employer's email
   * @param {string} employerName - Employer's first name
   * @param {string} candidateEmail - Declined candidate's email
   * @param {string} orgName - Organization name
   */
  async sendInvitationDeclinedEmail(employerEmail, employerName, candidateEmail, orgName) {
    const teamUrl = `${env.frontendUrl}/people`
    const displayName = employerName || 'there'
    const subject = `Invitation declined - ${orgName}`

    if (!resend) {
      console.warn('[EmailService] Resend not configured, skipping email send')
      await this.logEmail(employerEmail, 'invitation_declined', subject, null, 'mock', { employerName, candidateEmail, orgName })
      return { success: true, mock: true }
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation Declined</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #3B82F6;">Talyn</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1a1a1a;">Invitation Declined</h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi ${displayName},
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                We wanted to let you know that <strong>${candidateEmail}</strong> has declined the invitation to join <strong>${orgName}</strong>.
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                You can invite other candidates from your team management page.
              </p>

              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${teamUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #3B82F6; text-decoration: none; border-radius: 6px;">
                      View Team
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                &copy; ${new Date().getFullYear()} Talyn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    const text = `
Invitation Declined

Hi ${displayName},

We wanted to let you know that ${candidateEmail} has declined the invitation to join ${orgName}.

You can invite other candidates from your team management page.

View your team: ${teamUrl}

- The Talyn Team
    `.trim()

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [employerEmail],
        subject,
        html,
        text
      })

      if (error) {
        console.error('[EmailService] Resend error:', error)
        await this.logEmail(employerEmail, 'invitation_declined', subject, null, 'failed', { employerName, candidateEmail, orgName }, error.message)
        return { success: false }
      }

      console.log('[EmailService] Invitation declined email sent:', data?.id)
      await this.logEmail(employerEmail, 'invitation_declined', subject, data?.id, 'sent', { employerName, candidateEmail, orgName })
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send notification email:', error)
      await this.logEmail(employerEmail, 'invitation_declined', subject, null, 'failed', { employerName, candidateEmail, orgName }, error.message)
      return { success: false }
    }
  },

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} token - Reset token (unhashed)
   * @param {string} userName - User's name for personalization
   */
  async sendPasswordResetEmail(email, token, userName = 'there') {
    if (!resend) {
      console.warn('[EmailService] Resend not configured, skipping email send')
      console.log('[EmailService] Reset token for', email, ':', token)
      return { success: true, mock: true }
    }

    const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`
    const displayName = userName || 'there'

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #3B82F6;">Talyn</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1a1a1a;">Reset Your Password</h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi ${displayName},
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                We received a request to reset the password for your Talyn account. Click the button below to set a new password:
              </p>

              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #3B82F6; text-decoration: none; border-radius: 6px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                This link will expire in 1 hour for security reasons.
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>

              <!-- Fallback URL -->
              <p style="margin: 20px 0 0; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #3B82F6; word-break: break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                &copy; ${new Date().getFullYear()} Talyn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    const text = `
Hi ${displayName},

We received a request to reset the password for your Talyn account.

Reset your password by visiting: ${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

- The Talyn Team
    `.trim()

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [email],
        subject: 'Reset Your Password - Talyn',
        html,
        text
      })

      if (error) {
        console.error('[EmailService] Resend error:', error)
        throw new Error(error.message || 'Failed to send email')
      }

      console.log('[EmailService] Password reset email sent:', data?.id)
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error)
      throw error
    }
  },

  // ─── Payment & Payroll Emails ───────────────────────────────

  /**
   * Send payroll processing notification to employer
   */
  async sendPayrollProcessingEmail(email, name, amount, period) {
    const subject = `Payroll processing - ${amount}`
    const displayName = name || 'there'

    if (!resend) {
      console.log(`[EmailService] Mock: payroll processing email to ${email}`)
      await this.logEmail(email, 'payroll_processing', subject, null, 'mock')
      return { success: true, mock: true }
    }

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [email],
        subject,
        html: this._paymentEmailHtml('Payroll Processing', `Hi ${displayName},`, `Your payroll for <strong>${period}</strong> is being processed. <strong>${amount}</strong> will be debited from your linked bank account via ACH.`, 'This typically takes 1-3 business days.'),
        text: `Hi ${displayName},\n\nYour payroll for ${period} is being processed. ${amount} will be debited from your linked bank account via ACH.\n\nThis typically takes 1-3 business days.\n\n- The Talyn Team`
      })

      if (error) throw new Error(error.message)
      await this.logEmail(email, 'payroll_processing', subject, data?.id, 'sent')
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send payroll processing email:', error)
      await this.logEmail(email, 'payroll_processing', subject, null, 'failed', null, error.message)
      return { success: false }
    }
  },

  /**
   * Send payroll funded notification to employer
   */
  async sendPayrollFundedEmail(email, name, amount, period) {
    const subject = `Payroll funded - ${amount}`
    const displayName = name || 'there'

    if (!resend) {
      console.log(`[EmailService] Mock: payroll funded email to ${email}`)
      await this.logEmail(email, 'payroll_funded', subject, null, 'mock')
      return { success: true, mock: true }
    }

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [email],
        subject,
        html: this._paymentEmailHtml('Payroll Funded', `Hi ${displayName},`, `Great news! <strong>${amount}</strong> for payroll period <strong>${period}</strong> has been successfully debited from your bank account.`, 'Your funds have been received by Talyn.'),
        text: `Hi ${displayName},\n\nGreat news! ${amount} for payroll period ${period} has been successfully debited from your bank account.\n\nYour funds have been received by Talyn.\n\n- The Talyn Team`
      })

      if (error) throw new Error(error.message)
      await this.logEmail(email, 'payroll_funded', subject, data?.id, 'sent')
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send payroll funded email:', error)
      await this.logEmail(email, 'payroll_funded', subject, null, 'failed', null, error.message)
      return { success: false }
    }
  },

  /**
   * Send admin notification when payroll funds are received
   */
  async sendAdminPayrollFundedEmail(adminEmail, orgName, amount, period, runId) {
    const subject = `[Action Required] Payroll funded - ${orgName} - ${amount}`

    if (!resend) {
      console.log(`[EmailService] Mock: admin payroll funded email to ${adminEmail}`)
      await this.logEmail(adminEmail, 'admin_payroll_funded', subject, null, 'mock')
      return { success: true, mock: true }
    }

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [adminEmail],
        subject,
        html: this._paymentEmailHtml(
          'Payroll Funds Received',
          'Hello Admin,',
          `ACH payment of <strong>${amount}</strong> has been collected from <strong>${orgName}</strong> for period <strong>${period}</strong>.`,
          `<strong>Run ID:</strong> ${runId}<br><br>Please initiate employee payouts manually.`
        ),
        text: `ACH payment of ${amount} collected from ${orgName} for period ${period}. Run ID: ${runId}. Please initiate employee payouts manually.`
      })

      if (error) throw new Error(error.message)
      await this.logEmail(adminEmail, 'admin_payroll_funded', subject, data?.id, 'sent')
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send admin payroll funded email:', error)
      await this.logEmail(adminEmail, 'admin_payroll_funded', subject, null, 'failed', null, error.message)
      return { success: false }
    }
  },

  /**
   * Send payroll payment failed notification to employer
   */
  async sendPayrollFailedEmail(email, name, amount, period, errorReason) {
    const subject = `Payroll payment failed - action required`
    const displayName = name || 'there'

    if (!resend) {
      console.log(`[EmailService] Mock: payroll failed email to ${email}`)
      await this.logEmail(email, 'payroll_failed', subject, null, 'mock')
      return { success: true, mock: true }
    }

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [email],
        subject,
        html: this._paymentEmailHtml('Payment Failed', `Hi ${displayName},`, `The ACH debit of <strong>${amount}</strong> for payroll period <strong>${period}</strong> has failed.`, `<strong>Reason:</strong> ${errorReason || 'Unknown error'}<br><br>Your payroll run has been reverted to draft. Please check your bank account details and try again.`),
        text: `Hi ${displayName},\n\nThe ACH debit of ${amount} for payroll period ${period} has failed.\n\nReason: ${errorReason || 'Unknown error'}\n\nYour payroll run has been reverted to draft. Please check your bank account details and try again.\n\n- The Talyn Team`
      })

      if (error) throw new Error(error.message)
      await this.logEmail(email, 'payroll_failed', subject, data?.id, 'sent')
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send payroll failed email:', error)
      await this.logEmail(email, 'payroll_failed', subject, null, 'failed', null, error.message)
      return { success: false }
    }
  },

  /**
   * Send payroll payment disputed notification to employer
   */
  async sendPayrollDisputedEmail(email, name, amount, period, reason) {
    const subject = `Payroll payment disputed - action required`
    const displayName = name || 'there'

    if (!resend) {
      console.log(`[EmailService] Mock: payroll disputed email to ${email}`)
      await this.logEmail(email, 'payroll_disputed', subject, null, 'mock')
      return { success: true, mock: true }
    }

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [email],
        subject,
        html: this._paymentEmailHtml('Payment Disputed', `Hi ${displayName},`, `The ACH payment of <strong>${amount}</strong> for payroll period <strong>${period}</strong> has been disputed by your bank.`, `<strong>Reason:</strong> ${reason || 'Unknown'}<br><br>This means the funds have been reversed. Please contact your bank or reach out to our support team for next steps.`),
        text: `Hi ${displayName},\n\nThe ACH payment of ${amount} for payroll period ${period} has been disputed by your bank.\n\nReason: ${reason || 'Unknown'}\n\nThis means the funds have been reversed. Please contact your bank or reach out to our support team for next steps.\n\n- The Talyn Team`
      })

      if (error) throw new Error(error.message)
      await this.logEmail(email, 'payroll_disputed', subject, data?.id, 'sent')
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send payroll disputed email:', error)
      await this.logEmail(email, 'payroll_disputed', subject, null, 'failed', null, error.message)
      return { success: false }
    }
  },

  /**
   * Send admin notification when a payroll payment is disputed
   */
  async sendAdminPayrollDisputedEmail(adminEmail, orgName, amount, period, runId, reason, disputeId) {
    const subject = `[URGENT] Payment disputed - ${orgName} - ${amount}`

    if (!resend) {
      console.log(`[EmailService] Mock: admin payroll disputed email to ${adminEmail}`)
      await this.logEmail(adminEmail, 'admin_payroll_disputed', subject, null, 'mock')
      return { success: true, mock: true }
    }

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [adminEmail],
        subject,
        html: this._paymentEmailHtml(
          'ACH Payment Disputed',
          'Hello Admin,',
          `ACH payment of <strong>${amount}</strong> from <strong>${orgName}</strong> for period <strong>${period}</strong> has been disputed.`,
          `<strong>Run ID:</strong> ${runId}<br><strong>Dispute ID:</strong> ${disputeId || 'N/A'}<br><strong>Reason:</strong> ${reason || 'Unknown'}<br><br>Funds have been reversed. Please review in the Stripe Dashboard and take appropriate action.`
        ),
        text: `ACH payment of ${amount} from ${orgName} for period ${period} has been disputed. Run ID: ${runId}. Dispute ID: ${disputeId || 'N/A'}. Reason: ${reason || 'Unknown'}. Funds have been reversed. Please review in the Stripe Dashboard.`
      })

      if (error) throw new Error(error.message)
      await this.logEmail(adminEmail, 'admin_payroll_disputed', subject, data?.id, 'sent')
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send admin payroll disputed email:', error)
      await this.logEmail(adminEmail, 'admin_payroll_disputed', subject, null, 'failed', null, error.message)
      return { success: false }
    }
  },

  /**
   * Send payroll refund notification to employer
   */
  async sendPayrollRefundedEmail(email, name, amount, period) {
    const subject = `Payroll payment refunded`
    const displayName = name || 'there'

    if (!resend) {
      console.log(`[EmailService] Mock: payroll refunded email to ${email}`)
      await this.logEmail(email, 'payroll_refunded', subject, null, 'mock')
      return { success: true, mock: true }
    }

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [email],
        subject,
        html: this._paymentEmailHtml('Payment Refunded', `Hi ${displayName},`, `A refund of <strong>${amount}</strong> has been issued for payroll period <strong>${period}</strong>.`, 'The refunded amount will be returned to your bank account. This typically takes 5-10 business days.'),
        text: `Hi ${displayName},\n\nA refund of ${amount} has been issued for payroll period ${period}.\n\nThe refunded amount will be returned to your bank account. This typically takes 5-10 business days.\n\n- The Talyn Team`
      })

      if (error) throw new Error(error.message)
      await this.logEmail(email, 'payroll_refunded', subject, data?.id, 'sent')
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send payroll refunded email:', error)
      await this.logEmail(email, 'payroll_refunded', subject, null, 'failed', null, error.message)
      return { success: false }
    }
  },

  /**
   * Send admin notification when a payroll payment is refunded
   */
  async sendAdminPayrollRefundedEmail(adminEmail, orgName, amount, period, runId, chargeId) {
    const subject = `Payment refunded - ${orgName} - ${amount}`

    if (!resend) {
      console.log(`[EmailService] Mock: admin payroll refunded email to ${adminEmail}`)
      await this.logEmail(adminEmail, 'admin_payroll_refunded', subject, null, 'mock')
      return { success: true, mock: true }
    }

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [adminEmail],
        subject,
        html: this._paymentEmailHtml(
          'ACH Payment Refunded',
          'Hello Admin,',
          `A refund of <strong>${amount}</strong> has been issued for <strong>${orgName}</strong>, payroll period <strong>${period}</strong>.`,
          `<strong>Run ID:</strong> ${runId}<br><strong>Charge ID:</strong> ${chargeId || 'N/A'}<br><br>Please review in the Stripe Dashboard.`
        ),
        text: `A refund of ${amount} has been issued for ${orgName}, payroll period ${period}. Run ID: ${runId}. Charge ID: ${chargeId || 'N/A'}. Please review in the Stripe Dashboard.`
      })

      if (error) throw new Error(error.message)
      await this.logEmail(adminEmail, 'admin_payroll_refunded', subject, data?.id, 'sent')
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send admin payroll refunded email:', error)
      await this.logEmail(adminEmail, 'admin_payroll_refunded', subject, null, 'failed', null, error.message)
      return { success: false }
    }
  },

  /**
   * Send notification to employer when entity documents are submitted for review
   */
  async sendEntitySubmittedEmail(email, firstName, orgName) {
    const dashboardUrl = `${env.frontendUrl}/dashboard`
    const displayName = escapeHtml(firstName || 'there')
    const safeOrgName = escapeHtml(orgName)
    const subject = `Entity verification submitted - ${orgName}`

    if (!resend) {
      console.warn('[EmailService] Resend not configured, skipping email send')
      await this.logEmail(email, 'entity_submitted', subject, null, 'mock', { firstName, orgName })
      return { success: true, mock: true }
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Entity Verification Submitted</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #3B82F6;">Talyn</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1a1a1a;">Documents Submitted</h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi ${displayName},
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Your entity verification documents for <strong>${safeOrgName}</strong> have been submitted successfully and are now under review.
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Our team will review your documents within 1-2 business days. You will receive an email once the review is complete.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #3B82F6; text-decoration: none; border-radius: 6px;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                &copy; ${new Date().getFullYear()} Talyn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    const text = `
Documents Submitted

Hi ${displayName},

Your entity verification documents for ${orgName} have been submitted successfully and are now under review.

Our team will review your documents within 1-2 business days. You will receive an email once the review is complete.

Go to Dashboard: ${dashboardUrl}

- The Talyn Team
    `.trim()

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [email],
        subject,
        html,
        text
      })

      if (error) {
        console.error('[EmailService] Resend error:', error)
        await this.logEmail(email, 'entity_submitted', subject, null, 'failed', { firstName, orgName }, error.message)
        return { success: false }
      }

      console.log('[EmailService] Entity submitted email sent:', data?.id)
      await this.logEmail(email, 'entity_submitted', subject, data?.id, 'sent', { firstName, orgName })
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send entity submitted email:', error)
      await this.logEmail(email, 'entity_submitted', subject, null, 'failed', { firstName, orgName }, error.message)
      return { success: false }
    }
  },

  /**
   * Send notification to employer when entity is approved
   */
  async sendEntityApprovedEmail(email, firstName, orgName) {
    const dashboardUrl = `${env.frontendUrl}/dashboard`
    const displayName = escapeHtml(firstName || 'there')
    const safeOrgName = escapeHtml(orgName)
    const subject = `Entity verification approved - ${orgName}`

    if (!resend) {
      console.warn('[EmailService] Resend not configured, skipping email send')
      await this.logEmail(email, 'entity_approved', subject, null, 'mock', { firstName, orgName })
      return { success: true, mock: true }
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Entity Verification Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #3B82F6;">Talyn</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1a1a1a;">Entity Approved!</h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi ${displayName},
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Congratulations! Your entity verification for <strong>${safeOrgName}</strong> has been approved.
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                You can now proceed with setting up your payment method to start managing your team.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #10B981; text-decoration: none; border-radius: 6px;">
                      Continue Setup
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                &copy; ${new Date().getFullYear()} Talyn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    const text = `
Entity Approved!

Hi ${displayName},

Congratulations! Your entity verification for ${orgName} has been approved.

You can now proceed with setting up your payment method to start managing your team.

Continue Setup: ${dashboardUrl}

- The Talyn Team
    `.trim()

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [email],
        subject,
        html,
        text
      })

      if (error) {
        console.error('[EmailService] Resend error:', error)
        await this.logEmail(email, 'entity_approved', subject, null, 'failed', { firstName, orgName }, error.message)
        return { success: false }
      }

      console.log('[EmailService] Entity approved email sent:', data?.id)
      await this.logEmail(email, 'entity_approved', subject, data?.id, 'sent', { firstName, orgName })
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send entity approved email:', error)
      await this.logEmail(email, 'entity_approved', subject, null, 'failed', { firstName, orgName }, error.message)
      return { success: false }
    }
  },

  /**
   * Send notification to employer when entity is rejected
   */
  async sendEntityRejectedEmail(email, firstName, orgName, rejectionReason) {
    const dashboardUrl = `${env.frontendUrl}/dashboard`
    const displayName = escapeHtml(firstName || 'there')
    const safeOrgName = escapeHtml(orgName)
    const safeReason = escapeHtml(rejectionReason)
    const subject = `Entity verification requires attention - ${orgName}`

    if (!resend) {
      console.warn('[EmailService] Resend not configured, skipping email send')
      await this.logEmail(email, 'entity_rejected', subject, null, 'mock', { firstName, orgName, rejectionReason })
      return { success: true, mock: true }
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Entity Verification Requires Attention</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #3B82F6;">Talyn</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1a1a1a;">Verification Requires Attention</h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi ${displayName},
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Your entity verification for <strong>${safeOrgName}</strong> was not approved. Please review the feedback below and resubmit your documents.
              </p>
              <div style="margin: 0 0 20px; padding: 16px; background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #991B1B;">Reason:</p>
                <p style="margin: 8px 0 0; font-size: 14px; line-height: 1.5; color: #991B1B;">${safeReason}</p>
              </div>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                You can update your documents and resubmit from your dashboard.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #3B82F6; text-decoration: none; border-radius: 6px;">
                      Review Documents
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                &copy; ${new Date().getFullYear()} Talyn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    const text = `
Verification Requires Attention

Hi ${displayName},

Your entity verification for ${orgName} was not approved. Please review the feedback below and resubmit your documents.

Reason: ${rejectionReason}

You can update your documents and resubmit from your dashboard.

Review Documents: ${dashboardUrl}

- The Talyn Team
    `.trim()

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [email],
        subject,
        html,
        text
      })

      if (error) {
        console.error('[EmailService] Resend error:', error)
        await this.logEmail(email, 'entity_rejected', subject, null, 'failed', { firstName, orgName, rejectionReason }, error.message)
        return { success: false }
      }

      console.log('[EmailService] Entity rejected email sent:', data?.id)
      await this.logEmail(email, 'entity_rejected', subject, data?.id, 'sent', { firstName, orgName, rejectionReason })
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send entity rejected email:', error)
      await this.logEmail(email, 'entity_rejected', subject, null, 'failed', { firstName, orgName, rejectionReason }, error.message)
      return { success: false }
    }
  },

  /**
   * Send notification to admin when new entity documents are submitted for review
   */
  async sendAdminEntitySubmittedNotification(orgName, orgId) {
    const adminUrl = `${env.adminFrontendUrl}/organizations/${orgId}`
    const adminEmail = env.adminEmail
    const safeOrgName = escapeHtml(orgName)
    const subject = `New entity verification submission - ${orgName}`

    if (!resend) {
      console.warn('[EmailService] Resend not configured, skipping email send')
      await this.logEmail(adminEmail, 'admin_entity_submitted', subject, null, 'mock', { orgName, orgId })
      return { success: true, mock: true }
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Entity Verification Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #3B82F6;">Talyn Admin</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1a1a1a;">New Entity Verification</h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                <strong>${safeOrgName}</strong> has submitted their entity verification documents for review.
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Please review the submitted documents and approve or reject the verification.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${adminUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #3B82F6; text-decoration: none; border-radius: 6px;">
                      Review Entity
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                &copy; ${new Date().getFullYear()} Talyn. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    const text = `
New Entity Verification

${orgName} has submitted their entity verification documents for review.

Please review the submitted documents and approve or reject the verification.

Review Entity: ${adminUrl}

- Talyn System
    `.trim()

    try {
      const { data, error } = await resend.emails.send({
        from: env.emailFrom || 'Talyn <noreply@resend.dev>',
        to: [adminEmail],
        subject,
        html,
        text
      })

      if (error) {
        console.error('[EmailService] Resend error:', error)
        await this.logEmail(adminEmail, 'admin_entity_submitted', subject, null, 'failed', { orgName, orgId }, error.message)
        return { success: false }
      }

      console.log('[EmailService] Admin entity notification sent:', data?.id)
      await this.logEmail(adminEmail, 'admin_entity_submitted', subject, data?.id, 'sent', { orgName, orgId })
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send admin entity notification:', error)
      await this.logEmail(adminEmail, 'admin_entity_submitted', subject, null, 'failed', { orgName, orgId }, error.message)
      return { success: false }
    }
  },

  _paymentEmailHtml(title, greeting, body, footer) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f5f5f5;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 0;">
      <table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <tr><td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid #eee;">
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#3B82F6;">Talyn</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 20px;font-size:20px;font-weight:600;color:#1a1a1a;">${title}</h2>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4a4a4a;">${greeting}</p>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4a4a4a;">${body}</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#6a6a6a;">${footer}</p>
        </td></tr>
        <tr><td style="padding:20px 40px;background-color:#f9fafb;border-radius:0 0 8px 8px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#888;">&copy; ${new Date().getFullYear()} Talyn. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()
  }
}
