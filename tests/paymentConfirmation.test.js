// tests/paymentConfirmation.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PAYMENT_STATUSES } from '../src/lib/businessHelpers';

describe('Payment Confirmation Flow, Statuses & Trigger Audit', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../supabase/migrations/20261105091000_fix_payment_confirmation_status.sql'
  );
  const testSqlPath = path.resolve(
    __dirname,
    '../supabase/tests/payment_confirmation_test.sql'
  );
  const confirmDialogPath = path.resolve(
    __dirname,
    '../src/components/dashboard/business/ConfirmPaymentDialog.jsx'
  );

  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
  const testSql = fs.readFileSync(testSqlPath, 'utf-8');
  const confirmDialogCode = fs.readFileSync(confirmDialogPath, 'utf-8');

  describe('Canonical Status Alignment with UI and Business Domain', () => {
    it('defines paid as the canonical status in businessHelpers and UI', () => {
      const paidStatus = PAYMENT_STATUSES.find((s) => s.key === 'paid');
      expect(paidStatus).toBeDefined();
      expect(paidStatus?.label.en).toBe('Paid');
      expect(paidStatus?.label.ar).toContain('مدفوع');
    });

    it('ConfirmPaymentDialog sends status paid, paid_at, confirmed_at, and confirmed_by', () => {
      expect(confirmDialogCode).toContain("status: 'paid'");
      expect(confirmDialogCode).toContain('paid_at: nowIso');
      expect(confirmDialogCode).toContain('confirmed_at: nowIso');
      expect(confirmDialogCode).toContain('confirmed_by: user?.id');
    });
  });

  describe('Database Migration (20261105091000_fix_payment_confirmation_status.sql)', () => {
    it('timestamp is later than previous migrations', () => {
      const filename = path.basename(migrationPath);
      const timestamp = Number(filename.split('_')[0]);
      expect(timestamp).toBeGreaterThan(20261105090000);
    });

    it('enforces table check constraints with required paid_at and confirmed_at timestamps', () => {
      expect(migrationSql).toMatch(/payments_status_check\s+check\s*\(status in \('pending', 'paid', 'confirmed', 'overdue', 'cancelled'\)\)/i);
      expect(migrationSql).toMatch(/payments_paid_timestamps_check/i);
      expect(migrationSql).toMatch(/paid_at is not null and confirmed_at is not null/i);
    });

    it('provides a normalization trigger populating audit timestamps and canonical paid status', () => {
      expect(migrationSql).toContain('trg_payments_normalize_confirmation');
      expect(migrationSql).toMatch(/new\.status\s*:=\s*'paid'/i);
      expect(migrationSql).toMatch(/coalesce\(new\.paid_at,\s*new\.confirmed_at,\s*now\(\)\)/i);
      expect(migrationSql).toMatch(/coalesce\(new\.confirmed_at,\s*new\.paid_at,\s*now\(\)\)/i);
    });

    it('updates agreement_balances view to compute paid_total from paid payments', () => {
      expect(migrationSql).toContain('create or replace view public.agreement_balances');
      expect(migrationSql).toMatch(/where\s+p\.status\s+in\s+\('paid',\s*'confirmed'\)/i);
      expect(migrationSql).toContain('as paid_total');
    });

    it('corrects payment-confirmed notification trigger to listen to paid status and fire correctly', () => {
      expect(migrationSql).toContain('trg_notify_payment_confirmed');
      expect(migrationSql).toMatch(/new\.status\s+in\s+\('paid',\s*'confirmed'\)/i);
      expect(migrationSql).toContain("'payment_confirmed'");
      expect(migrationSql).toContain("'/dashboard/finance'");
      expect(migrationSql).toContain('after insert or update of status, confirmed_at, paid_at on public.payments');
    });
  });

  describe('SQL Test Script (payment_confirmation_test.sql)', () => {
    it('is transactional with begin and rollback', () => {
      const uncommented = testSql.replace(/--.*$/gm, '').trim().toLowerCase();
      expect(uncommented.startsWith('begin;')).toBe(true);
      expect(uncommented.endsWith('rollback;')).toBe(true);
    });

    it('tests transition from pending to paid and verifies notification creation', () => {
      expect(testSql).toMatch(/Initial payment recorded with status pending/i);
      expect(testSql).toMatch(/Payment status confirmed as paid/i);
      expect(testSql).toMatch(/Notification dispatched to recording PR officer/i);
      expect(testSql).toMatch(/Notification dispatched to PR leadership admin/i);
      expect(testSql).toMatch(/Notification type is payment_confirmed/i);
      expect(testSql).toMatch(/Notification link points to \/dashboard\/finance/i);
    });

    it('fails with a non-zero SQL error if any recorded check fails', () => {
      expect(testSql).toMatch(/raise\s+exception\s+.*Payment Confirmation Test FAILED/i);
    });
  });
});

