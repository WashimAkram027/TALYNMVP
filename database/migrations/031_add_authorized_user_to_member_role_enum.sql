-- Migration 031: Add 'authorized_user' to member_role enum
-- member_role is a Postgres enum, not TEXT. The authorized user feature
-- requires this value for the .neq('member_role', 'authorized_user') filter
-- in members.service.js to work.

ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'authorized_user';
