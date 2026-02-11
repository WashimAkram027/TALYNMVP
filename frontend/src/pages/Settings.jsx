import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { profileAPI, authAPI } from '../services/api'

export default function Settings() {
  const { profile, fetchProfile } = useAuthStore()
  const isCandidate = profile?.role === 'candidate'

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    linkedinUrl: ''
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  // Avatar state
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const avatarInputRef = useRef(null)

  // Resume state (candidates only)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeSuccess, setResumeSuccess] = useState('')
  const resumeInputRef = useRef(null)

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setProfileForm({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || '',
        linkedinUrl: profile.linkedin_url || ''
      })
      setAvatarPreview(profile.avatar_url || null)
    }
  }, [profile])

  // Clear success messages after delay
  useEffect(() => {
    if (profileSuccess) {
      const timer = setTimeout(() => setProfileSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [profileSuccess])

  useEffect(() => {
    if (passwordSuccess) {
      const timer = setTimeout(() => setPasswordSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [passwordSuccess])

  useEffect(() => {
    if (resumeSuccess) {
      const timer = setTimeout(() => setResumeSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [resumeSuccess])

  // Handle profile form submit
  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileError('')
    setProfileSuccess('')

    try {
      await profileAPI.update({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
        linkedinUrl: profileForm.linkedinUrl || null
      })
      await fetchProfile()
      setProfileSuccess('Profile updated successfully')
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  // Handle avatar upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setProfileError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image must be less than 5MB')
      return
    }

    setAvatarLoading(true)
    setProfileError('')

    try {
      const result = await profileAPI.uploadAvatar(file)
      if (result.success && result.data?.avatarUrl) {
        setAvatarPreview(result.data.avatarUrl)
        await fetchProfile()
        setProfileSuccess('Avatar updated successfully')
      }
    } catch (err) {
      setProfileError(err.message || 'Failed to upload avatar')
    } finally {
      setAvatarLoading(false)
    }
  }

  // Handle resume upload
  const handleResumeChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!validTypes.includes(file.type)) {
      setProfileError('Please select a PDF or Word document')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setProfileError('Resume must be less than 10MB')
      return
    }

    setResumeLoading(true)
    setProfileError('')

    try {
      await profileAPI.uploadResume(file)
      await fetchProfile()
      setResumeSuccess('Resume updated successfully')
    } catch (err) {
      setProfileError(err.message || 'Failed to upload resume')
    } finally {
      setResumeLoading(false)
    }
  }

  // Handle password change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordError('')
    setPasswordSuccess('')

    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match')
      setPasswordLoading(false)
      return
    }

    // Validate password strength
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      setPasswordLoading(false)
      return
    }

    if (!/[A-Z]/.test(passwordForm.newPassword)) {
      setPasswordError('Password must contain at least one uppercase letter')
      setPasswordLoading(false)
      return
    }

    if (!/[a-z]/.test(passwordForm.newPassword)) {
      setPasswordError('Password must contain at least one lowercase letter')
      setPasswordLoading(false)
      return
    }

    if (!/\d/.test(passwordForm.newPassword)) {
      setPasswordError('Password must contain at least one number')
      setPasswordLoading(false)
      return
    }

    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
      setPasswordSuccess('Password changed successfully')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Settings</h1>
        <p className="text-subtext-light dark:text-subtext-dark mt-1">
          Manage your profile and account settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Information Section */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
          <div className="p-6 border-b border-border-light dark:border-border-dark">
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Profile Information</h2>
            <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">
              Update your personal details
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} className="p-6">
            {/* Messages */}
            {profileError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <span className="material-icons text-sm">check_circle</span>
                {profileSuccess}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-icons text-4xl text-gray-400 dark:text-gray-500">person</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarLoading}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-primary hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
                  >
                    {avatarLoading ? (
                      <span className="material-icons text-sm animate-spin">refresh</span>
                    ) : (
                      <span className="material-icons text-sm">edit</span>
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-subtext-light dark:text-subtext-dark mt-2 text-center">
                  Max 5MB
                </p>
              </div>

              {/* Form Fields */}
              <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-primary focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-primary focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={profileForm.linkedinUrl}
                    onChange={(e) => setProfileForm({ ...profileForm, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-4 py-2 bg-primary hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {profileLoading && <span className="material-icons text-sm animate-spin">refresh</span>}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Resume Section (Candidates Only) */}
        {isCandidate && (
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
            <div className="p-6 border-b border-border-light dark:border-border-dark">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Resume</h2>
              <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">
                Upload your resume for job applications
              </p>
            </div>

            <div className="p-6">
              {resumeSuccess && (
                <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <span className="material-icons text-sm">check_circle</span>
                  {resumeSuccess}
                </div>
              )}

              <div className="flex items-center gap-4">
                {profile?.resume_url ? (
                  <div className="flex items-center gap-3 flex-grow">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <span className="material-icons text-red-600 dark:text-red-400">description</span>
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm font-medium text-text-light dark:text-text-dark">
                        {profile.resume_filename || 'Resume uploaded'}
                      </p>
                      <a
                        href={profile.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View resume
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-grow text-subtext-light dark:text-subtext-dark">
                    <span className="material-icons">description</span>
                    <span className="text-sm">No resume uploaded</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => resumeInputRef.current?.click()}
                  disabled={resumeLoading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {resumeLoading ? (
                    <span className="material-icons text-sm animate-spin">refresh</span>
                  ) : (
                    <span className="material-icons text-sm">upload</span>
                  )}
                  {profile?.resume_url ? 'Replace' : 'Upload'}
                </button>
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeChange}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-subtext-light dark:text-subtext-dark mt-3">
                PDF or Word document, max 10MB
              </p>
            </div>
          </div>
        )}

        {/* Change Password Section */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
          <div className="p-6 border-b border-border-light dark:border-border-dark">
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Change Password</h2>
            <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">
              Update your password to keep your account secure
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="p-6">
            {/* Messages */}
            {passwordError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <span className="material-icons text-sm">check_circle</span>
                {passwordSuccess}
              </div>
            )}

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-primary focus:border-primary"
                  required
                />
                <p className="text-xs text-subtext-light dark:text-subtext-dark mt-1">
                  Min 8 characters with uppercase, lowercase, and number
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-primary focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-4 py-2 bg-primary hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {passwordLoading && <span className="material-icons text-sm animate-spin">refresh</span>}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
