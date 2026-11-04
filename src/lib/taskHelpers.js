// src/lib/taskHelpers.js

/**
 * Checks whether a task is overdue.
 * A task is overdue if due_date is in the past and its status is neither 'done' nor 'cancelled'.
 */
export function isTaskOverdue(task) {
  if (!task || !task.due_date) return false;
  if (task.status === 'done' || task.status === 'cancelled') return false;
  return new Date(task.due_date).getTime() < Date.now();
}

/**
 * Checks if a task is due today.
 */
export function isTaskDueToday(task) {
  if (!task || !task.due_date) return false;
  const dueDate = new Date(task.due_date);
  const now = new Date();
  return (
    dueDate.getFullYear() === now.getFullYear() &&
    dueDate.getMonth() === now.getMonth() &&
    dueDate.getDate() === now.getDate()
  );
}

/**
 * Checks if a task is due within the next 7 days (or today).
 */
export function isTaskDueThisWeek(task) {
  if (!task || !task.due_date) return false;
  const due = new Date(task.due_date).getTime();
  const now = Date.now();
  const weekInMs = 7 * 24 * 60 * 60 * 1000;
  return due >= now && due <= now + weekInMs;
}

/**
 * Filter tasks array by due status (overdue, today, week, all).
 */
export function filterTasksByDue(tasks, filter) {
  if (!Array.isArray(tasks) || filter === 'all' || !filter) return tasks;

  if (filter === 'overdue') {
    return tasks.filter((t) => isTaskOverdue(t));
  }
  if (filter === 'today') {
    return tasks.filter((t) => isTaskDueToday(t));
  }
  if (filter === 'week') {
    return tasks.filter((t) => isTaskDueThisWeek(t));
  }
  return tasks;
}

/**
 * Determines if the current user can create / fully edit / delete the task.
 * Permitted: Super Admin, President, Vice President, HR Admin, Coordinator,
 * or Committee Head of the task's committee.
 */
export function canUserManageTask(committeeId, user, roles = [], isSuperAdmin = false) {
  if (isSuperAdmin) return true;
  if (!user) return false;

  const roleNames = roles.map((r) => (typeof r === 'string' ? r : r.role));
  const leadershipRoles = ['president', 'vice_president', 'hr_admin', 'coordinator'];
  if (roleNames.some((r) => leadershipRoles.includes(r))) return true;

  // Check if head of this specific committee
  return roles.some((r) => r.role === 'committee_head' && r.committee_id === committeeId);
}

/**
 * Determines if the user can move/change the status of a task (or drag in kanban).
 * Allowed if user can manage the task OR if user is the assigned member.
 */
export function canUserChangeStatus(task, user, roles = [], isSuperAdmin = false) {
  if (!task || !user) return false;
  if (isSuperAdmin) return true;
  if (task.assignee_id === user.id) return true;
  return canUserManageTask(task.committee_id, user, roles, isSuperAdmin);
}

/**
 * Format due date nicely with locale.
 */
export function formatDueDate(dateString, lang = 'ar') {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

