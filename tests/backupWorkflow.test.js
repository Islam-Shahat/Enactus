// tests/backupWorkflow.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Backup Workflow & Disaster Recovery Verification', () => {
  const backupWorkflowPath = path.join(rootDir, '.github', 'workflows', 'backup.yml');
  const backupDocPath = path.join(rootDir, 'docs', 'BACKUPS.md');

  const workflowContent = fs.readFileSync(backupWorkflowPath, 'utf8');
  const docContent = fs.readFileSync(backupDocPath, 'utf8');

  describe('.github/workflows/backup.yml', () => {
    it('exists and configures scheduled weekly runs and manual dispatch', () => {
      expect(fs.existsSync(backupWorkflowPath)).toBe(true);
      expect(workflowContent).toMatch(/cron:\s*['"]0 2 \* \* 0['"]/);
      expect(workflowContent).toContain('workflow_dispatch:');
    });

    it('enforces GPG symmetric AES256 encryption on database dumps', () => {
      expect(workflowContent).toContain('--symmetric');
      expect(workflowContent).toContain('--cipher-algo AES256');
    });

    it('verifies that the encrypted file is created, non-empty, and decryptable', () => {
      expect(workflowContent).toContain('gpg --batch --yes --passphrase "$BACKUP_PASSPHRASE" \\\n            --decrypt');
      expect(workflowContent).toContain('PostgreSQL database dump');
      expect(workflowContent).toContain('[ ! -s "$DRILL_SQL" ]');
    });

    it('automates a safe restore drill strictly against an isolated ephemeral database', () => {
      // Must define an ephemeral service container
      expect(workflowContent).toContain('ephemeral-postgres:');
      expect(workflowContent).toContain('image: postgres:16-alpine');
      expect(workflowContent).toContain('5433:5432');

      // Drill must connect strictly to isolated localhost:5433, NEVER to SUPABASE_DB_URL
      expect(workflowContent).toMatch(/DRILL_DB_URL:\s*postgresql:\/\/drill_user:drill_password_safe@127\.0\.0\.1:5433\/restore_drill/);
      expect(workflowContent).toContain('psql "$DRILL_DB_URL" < "$DRILL_SQL"');

      // Must validate that tables exist in the isolated database
      expect(workflowContent).toContain('SELECT count(*) FROM information_schema.tables');
    });

    it('immediately scrubs and removes all unencrypted plain-text dump files', () => {
      expect(workflowContent).toContain('rm -f "$DUMP_FILE"');
      expect(workflowContent).toContain('rm -f "$DRILL_SQL"');
    });

    it('configures maximum 90-day GitHub Artifact retention', () => {
      expect(workflowContent).toMatch(/retention-days:\s*90/);
    });

    it('never prints or exposes secret values', () => {
      expect(workflowContent).not.toMatch(/echo.*\$BACKUP_PASSPHRASE/);
      expect(workflowContent).not.toMatch(/echo.*\$SUPABASE_DB_URL/);
    });
  });

  describe('docs/BACKUPS.md', () => {
    it('documents the automated backup and two-phase verification process', () => {
      expect(docContent).toContain('.github/workflows/backup.yml');
      expect(docContent).toContain('pg_dump');
      expect(docContent).toContain('AES256');
    });

    it('reviews the 30-day retention limitation and establishes a 3-tier retention policy', () => {
      expect(docContent).toContain('90 يوماً');
      expect(docContent).toContain('365 يوماً');
      expect(docContent).toContain('3 إلى 5 سنوات');
      expect(docContent).toMatch(/Cloudflare R2|AWS S3/i);
    });

    it('provides an isolated local Docker restore drill runbook with safety warnings', () => {
      expect(docContent).toContain('docker run --name pg-drill-isolated');
      expect(docContent).toContain('5433:5432');
      expect(docContent).toContain('قاعدة الأمان الذهبية');
      expect(docContent).toContain('drill_restore.sql');
    });

    it('explicitly warns against executing drills against production', () => {
      expect(docContent).toMatch(/لا تقم إطلاقاً بتنفيذ أي تدريب استعادة.*قاعدة بيانات الإنتاج/i);
    });
  });
});

