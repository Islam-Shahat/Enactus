// tests/taskHelpers.test.js
import { describe, it, expect } from 'vitest';
import {
  isTaskOverdue,
  isTaskDueToday,
  isTaskDueThisWeek,
  filterTasksByDue,
  canUserManageTask,
  canUserChangeStatus,
  formatDueDate,
} from '../src/lib/taskHelpers.js';

describe('Phase 7 Tasks Module Logic & RBAC', () => {
  describe('Overdue & Due Date Calculations', () => {
    it('identifies overdue tasks when deadline is in the past and status is not done or cancelled', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      expect(isTaskOverdue({ due_date: pastDate, status: 'todo' })).toBe(true);
      expect(isTaskOverdue({ due_date: pastDate, status: 'in_progress' })).toBe(true);
      expect(isTaskOverdue({ due_date: pastDate, status: 'review' })).toBe(true);
    });

    it('does NOT flag done or cancelled tasks as overdue even if past deadline', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      expect(isTaskOverdue({ due_date: pastDate, status: 'done' })).toBe(false);
      expect(isTaskOverdue({ due_date: pastDate, status: 'cancelled' })).toBe(false);
    });

    it('does NOT flag future tasks as overdue', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      expect(isTaskOverdue({ due_date: futureDate, status: 'todo' })).toBe(false);
      expect(isTaskOverdue({ due_date: null, status: 'todo' })).toBe(false);
    });

    it('filters tasks by due status accurately', () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      // Set to today (same year, month, date)
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const sample = [
        { id: '1', title: 'Task 1', due_date: past, status: 'todo' }, // overdue
        { id: '2', title: 'Task 2', due_date: today, status: 'todo' }, // today
        { id: '3', title: 'Task 3', due_date: inThreeDays, status: 'in_progress' }, // week
        { id: '4', title: 'Task 4', due_date: nextMonth, status: 'todo' }, // later
        { id: '5', title: 'Task 5', due_date: past, status: 'done' }, // done, not overdue
      ];

      expect(filterTasksByDue(sample, 'all')).toHaveLength(5);
      expect(filterTasksByDue(sample, 'overdue')).toEqual([sample[0]]);
      expect(filterTasksByDue(sample, 'today')).toEqual([sample[1]]);
      expect(filterTasksByDue(sample, 'week')).toEqual([sample[1], sample[2]]);
    });

    it('formats due date without throwing', () => {
      expect(formatDueDate(null, 'ar')).toBe('—');
      const validDate = '2026-11-15T12:00:00Z';
      expect(typeof formatDueDate(validDate, 'en')).toBe('string');
      expect(typeof formatDueDate(validDate, 'ar')).toBe('string');
    });
  });

  describe('Task RBAC & Management Permissions', () => {
    const user = { id: 'usr-1' };
    const committeeId = 'comm-pm';

    it('allows super_admin to manage any committee task', () => {
      expect(canUserManageTask(committeeId, user, [], true)).toBe(true);
    });

    it('allows executive and coordinator roles to manage tasks', () => {
      expect(canUserManageTask(committeeId, user, [{ role: 'president' }], false)).toBe(true);
      expect(canUserManageTask(committeeId, user, [{ role: 'vice_president' }], false)).toBe(true);
      expect(canUserManageTask(committeeId, user, [{ role: 'hr_admin' }], false)).toBe(true);
      expect(canUserManageTask(committeeId, user, [{ role: 'coordinator' }], false)).toBe(true);
    });

    it('allows committee_head to manage tasks ONLY for their committee', () => {
      const myHeadRole = [{ role: 'committee_head', committee_id: committeeId }];
      const otherHeadRole = [{ role: 'committee_head', committee_id: 'comm-other' }];

      expect(canUserManageTask(committeeId, user, myHeadRole, false)).toBe(true);
      expect(canUserManageTask(committeeId, user, otherHeadRole, false)).toBe(false);
    });

    it('disallows plain members from managing task details or creation', () => {
      const memberRole = [{ role: 'member' }];
      expect(canUserManageTask(committeeId, user, memberRole, false)).toBe(false);
      expect(canUserManageTask(committeeId, user, [], false)).toBe(false);
    });

    it('allows assignees to change task status even if plain member', () => {
      const task = {
        id: 't-1',
        committee_id: committeeId,
        assignee_id: user.id,
      };

      // Assignee (member) can change status
      expect(canUserChangeStatus(task, user, [{ role: 'member' }], false)).toBe(true);

      // Non-assignee member CANNOT change status
      const otherUser = { id: 'usr-2' };
      expect(canUserChangeStatus(task, otherUser, [{ role: 'member' }], false)).toBe(false);

      // But leadership and committee head CAN change status
      expect(canUserChangeStatus(task, otherUser, [{ role: 'president' }], false)).toBe(true);
      expect(
        canUserChangeStatus(task, otherUser, [{ role: 'committee_head', committee_id: committeeId }], false)
      ).toBe(true);
    });
  });
});
