# Talyn

A modern workforce management platform for employers and employees.

## Version

**v1.0.0-mvp**

## About

Talyn is a comprehensive workforce management solution that streamlines employee onboarding, team management, and HR operations. Built with a modern tech stack, it provides separate dashboards for employers and employees with role-based access control.

## Features

### For Employers
- **Dashboard** - Overview of team statistics, active members, and pending actions
- **Team Management** - View, invite, and manage team members
- **Employee Onboarding** - Invite candidates and track invitation status
- **Organization Settings** - Manage company profile and departments

### For Employees
- **Personal Dashboard** - View employment details and company information
- **Invitation System** - Accept or decline organization invitations
- **Profile Management** - Update personal information and documents

### Core Functionality
- **Authentication** - Secure JWT-based login with role validation
- **Role-Based Access** - Separate flows for employers and candidates
- **Real-time Status** - Track member status (invited, active, offboarded)

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Zustand
- **Backend:** Node.js, Express
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Custom JWT
- **Deployment:** Vercel (frontend), Railway (backend)

## Getting Started

### Prerequisites
- Node.js 20+
- npm
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/talyn.git

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Setup

Copy the example environment files and configure:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### Running Locally

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## License

Proprietary - All rights reserved.
