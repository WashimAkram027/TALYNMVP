import { quoteService } from '../services/quote.service.js'
import { membersService } from '../services/members.service.js'
import { supabase } from '../config/supabase.js'
import {
  successResponse,
  createdResponse,
  errorResponse,
  badRequestResponse,
  notFoundResponse
} from '../utils/response.js'

export const quoteController = {
  /**
   * GET /api/quotes/cost-config
   * Get active cost configuration
   */
  async getCostConfig(req, res) {
    try {
      const countryCode = req.query.country || 'NPL'
      const config = await quoteService.getCostConfig(countryCode)
      return successResponse(res, config)
    } catch (error) {
      console.error('Get cost config error:', error)
      if (error.statusCode === 404) {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to get cost config', 500, error)
    }
  },

  /**
   * POST /api/quotes/generate
   * Generate a cost quote for an employee
   */
  async generateQuote(req, res) {
    try {
      const {
        email, firstName, lastName, jobTitle, department,
        employmentType, salaryAmount, salaryCurrency,
        payFrequency, startDate
      } = req.body

      if (!email) {
        return badRequestResponse(res, 'Email is required')
      }
      if (!salaryAmount || salaryAmount <= 0) {
        return badRequestResponse(res, 'A positive annual salary is required to generate a quote')
      }

      const quote = await quoteService.generateQuote(
        req.user.id,
        req.user.organizationId,
        {
          email, firstName, lastName, jobTitle, department,
          employmentType, salaryAmount, salaryCurrency,
          payFrequency, startDate
        }
      )

      return createdResponse(res, quote, 'Quote generated successfully')
    } catch (error) {
      console.error('Generate quote error:', error)
      if (error.statusCode === 400) {
        return badRequestResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to generate quote', 500, error)
    }
  },

  /**
   * POST /api/quotes/:quoteId/accept-and-invite
   * Accept the quote and send the member invitation
   */
  async acceptQuoteAndInvite(req, res) {
    try {
      const { quoteId } = req.params

      // 1. Accept the quote
      const quote = await quoteService.acceptQuote(quoteId, req.user.id)

      // 2. Invite the member using existing members service
      const member = await membersService.invite(
        req.user.organizationId,
        req.user.id,
        {
          email: quote.employee_email,
          firstName: quote.employee_first_name,
          lastName: quote.employee_last_name,
          jobTitle: quote.job_title,
          department: quote.department,
          employmentType: quote.employment_type,
          salaryAmount: quote.annual_salary / 100, // convert back from minor units
          salaryCurrency: quote.salary_currency,
          payFrequency: quote.pay_frequency,
          startDate: quote.start_date
        }
      )

      // 3. Link quote_id to the member record
      const { error: linkError } = await supabase
        .from('organization_members')
        .update({ quote_id: quote.id })
        .eq('id', member.id)

      if (linkError) {
        console.error('Failed to link quote to member:', linkError)
      }

      return createdResponse(res, { quote, member }, 'Quote accepted and invitation sent')
    } catch (error) {
      console.error('Accept quote and invite error:', error)
      if (error.statusCode === 400 || error.message?.includes('already')) {
        return badRequestResponse(res, error.message)
      }
      if (error.statusCode === 404) {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to accept quote', 500, error)
    }
  },

  /**
   * DELETE /api/quotes/:quoteId
   * Delete a draft quote
   */
  async deleteQuote(req, res) {
    try {
      const { quoteId } = req.params
      await quoteService.deleteQuote(quoteId, req.user.organizationId)
      return successResponse(res, null, 'Quote deleted')
    } catch (error) {
      console.error('Delete quote error:', error)
      if (error.statusCode === 404) return notFoundResponse(res, error.message)
      if (error.statusCode === 400) return badRequestResponse(res, error.message)
      return errorResponse(res, 'Failed to delete quote', 500, error)
    }
  },

  /**
   * GET /api/quotes/:quoteId
   * Get a single quote
   */
  async getQuote(req, res) {
    try {
      const { quoteId } = req.params
      const quote = await quoteService.getQuoteById(quoteId, req.user.organizationId)
      return successResponse(res, quote)
    } catch (error) {
      console.error('Get quote error:', error)
      if (error.statusCode === 404) {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to get quote', 500, error)
    }
  },

  /**
   * GET /api/quotes/:quoteId/pdf
   * Generate and download quote PDF
   */
  async downloadQuotePdf(req, res) {
    try {
      const { quoteId } = req.params

      const { pdfBuffer, quoteNumber } = await quoteService.generateQuotePdf(
        quoteId,
        req.user.organizationId
      )

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${quoteNumber}.pdf"`)
      res.setHeader('Content-Length', pdfBuffer.length)
      return res.send(pdfBuffer)
    } catch (error) {
      console.error('Download quote PDF error:', error)
      if (error.statusCode === 404) {
        return notFoundResponse(res, error.message)
      }
      if (error.statusCode === 400) {
        return badRequestResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to generate quote PDF', 500, error)
    }
  },

  /**
   * GET /api/quotes
   * List quotes for the organization
   */
  async listQuotes(req, res) {
    try {
      const filters = { status: req.query.status }
      const quotes = await quoteService.getQuotesByOrg(req.user.organizationId, filters)
      return successResponse(res, quotes)
    } catch (error) {
      console.error('List quotes error:', error)
      return errorResponse(res, 'Failed to list quotes', 500, error)
    }
  }
}
