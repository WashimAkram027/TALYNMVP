import { Resend } from 'resend'
import { supabase } from '../config/supabase.js'
import { env } from '../config/env.js'

// Initialize Resend client
const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null

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
    const signupUrl = `${env.frontendUrl}/sign-up?email=${encodeURIComponent(email)}&invite=true`
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
  }
}
