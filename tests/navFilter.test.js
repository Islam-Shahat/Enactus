// tests/navFilter.test.js
import { describe, it, expect } from 'vitest';
import { DASHBOARD_NAV, ROLES, filterNavItems } from '../src/lib/roles.js';

describe('Dashboard Navigation Filter Logic (RBAC)', () => {
  it('allows plain member to see only allow:null items', () => {
    const memberRoles = [{ role: ROLES.MEMBER }];
    const visible = filterNavItems(DASHBOARD_NAV, memberRoles, false);
    const visibleKeys = visible.map((i) => i.key);

    expect(visibleKeys).toEqual(['home', 'announcements', 'notifications', 'tasks', 'attendance', 'points', 'leaderboard']);
    expect(visibleKeys).not.toContain('applications');
    expect(visibleKeys).not.toContain('members');
    expect(visibleKeys).not.toContain('settings');
    expect(visibleKeys).not.toContain('roles');
  });

  it('allows committee_head to see applications, members, posts, and events', () => {
    const headRoles = [{ role: ROLES.COMMITTEE_HEAD, committee_id: 'comm-123' }];
    const visible = filterNavItems(DASHBOARD_NAV, headRoles, false);
    const visibleKeys = visible.map((i) => i.key);

    expect(visibleKeys).toContain('applications');
    expect(visibleKeys).toContain('members');
    expect(visibleKeys).toContain('posts');
    expect(visibleKeys).toContain('events');
    // Cannot see president-only or HR-only or super-admin-only
    expect(visibleKeys).not.toContain('settings');
    expect(visibleKeys).not.toContain('audit');
    expect(visibleKeys).not.toContain('roles');
  });

  it('allows hr_admin to see applications, members, settings, site, events', () => {
    const hrRoles = [{ role: ROLES.HR }];
    const visible = filterNavItems(DASHBOARD_NAV, hrRoles, false);
    const visibleKeys = visible.map((i) => i.key);

    expect(visibleKeys).toContain('applications');
    expect(visibleKeys).toContain('members');
    expect(visibleKeys).toContain('settings');
    expect(visibleKeys).toContain('site');
    expect(visibleKeys).toContain('events');
    expect(visibleKeys).not.toContain('audit');
    expect(visibleKeys).not.toContain('roles');
  });

  it('allows president to see audit log and executive pages, but not roles', () => {
    const presRoles = [{ role: ROLES.PRESIDENT }];
    const visible = filterNavItems(DASHBOARD_NAV, presRoles, false);
    const visibleKeys = visible.map((i) => i.key);

    expect(visibleKeys).toContain('audit');
    expect(visibleKeys).toContain('settings');
    expect(visibleKeys).toContain('applications');
    expect(visibleKeys).toContain('members');
    expect(visibleKeys).not.toContain('roles');
  });

  it('allows super_admin to see ALL items including roles (allow: [])', () => {
    const visible = filterNavItems(DASHBOARD_NAV, [], true);
    expect(visible.length).toBe(DASHBOARD_NAV.length);

    const visibleKeys = visible.map((i) => i.key);
    expect(visibleKeys).toContain('roles');
    expect(visibleKeys).toContain('audit');
    expect(visibleKeys).toContain('settings');
  });

  it('handles role strings as well as role objects gracefully', () => {
    const stringRoles = ['hr_admin'];
    const visible = filterNavItems(DASHBOARD_NAV, stringRoles, false);
    const visibleKeys = visible.map((i) => i.key);

    expect(visibleKeys).toContain('applications');
    expect(visibleKeys).toContain('settings');
  });

  it('handles empty or unrecognized roles by showing only allow:null', () => {
    const empty = filterNavItems(DASHBOARD_NAV, [], false);
    const emptyKeys = empty.map((i) => i.key);
    expect(emptyKeys).toEqual(['home', 'announcements', 'notifications', 'tasks', 'attendance', 'points', 'leaderboard']);

    const unknown = filterNavItems(DASHBOARD_NAV, ['unknown_guest'], false);
    const unknownKeys = unknown.map((i) => i.key);
    expect(unknownKeys).toEqual(['home', 'announcements', 'notifications', 'tasks', 'attendance', 'points', 'leaderboard']);
  });
});

