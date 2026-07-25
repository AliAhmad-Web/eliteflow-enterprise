-- Phase 19.4 — Sync Engine cancel status
ALTER TYPE "integration_sync_status" ADD VALUE IF NOT EXISTS 'CANCELLED';
