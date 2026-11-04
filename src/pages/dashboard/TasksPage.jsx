import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import TaskDrawer from '../../components/dashboard/TaskDrawer';
import TaskFormDrawer from '../../components/dashboard/TaskFormDrawer';
import KanbanBoard from '../../components/dashboard/KanbanBoard';
import { useToast } from '../../components/dashboard/Toast';
import {
  isTaskOverdue,
  formatDueDate,
} from '../../lib/taskHelpers';
import {
  CheckSquare,
  Kanban,
  ListTodo,
  Layers,
  Plus,
  User,
} from 'lucide-react';

const PAGE_SIZE = 10;

export default function TasksPage() {
  const { user, roles, isSuperAdmin, hasRole } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const toast = useToast();
  const queryClient = useQueryClient();

  // Access checks
  const isHrOrExec = isSuperAdmin || hasRole(['hr_admin', 'president', 'vice_president', 'coordinator']);
  const isHead = hasRole('committee_head');
  const headRoleObj = roles.find((r) => r.role === 'committee_head');
  const headCommitteeId = headRoleObj?.committee_id;
  const canCreateTask = isHrOrExec || isHead;

  // Active Tab: 'my' | 'kanban' | 'all'
  const [activeTab, setActiveTab] = useState('my');

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState('all'); // 'all' | 'overdue' | 'today' | 'week'
  const [committeeFilter, setCommitteeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Kanban selected committee
  const [kanbanCommitteeId, setKanbanCommitteeId] = useState(headCommitteeId || '');

  // Drawers state
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  // 1. Fetch Active Season
  const { data: activeSeason } = useQuery({
    queryKey: ['dashboard', 'active-season'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, is_active')
        .eq('is_active', true)
        .maybeSingle();
      if (error || !data) {
        const { data: fallback, error: fbErr } = await supabase
          .from('seasons')
          .select('id, name, is_active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fbErr) throw fbErr;
        return fallback ? { ...fallback, name_ar: fallback.name, name_en: fallback.name } : null;
      }
      return { ...data, name_ar: data.name, name_en: data.name };
    },
    staleTime: 10 * 60 * 1000,
  });

  // 2. Fetch Committees
  const { data: committees = [] } = useQuery({
    queryKey: ['dashboard', 'committees-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committees')
        .select('id, slug, name_ar, name_en, color')
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Set default kanban committee if empty
  React.useEffect(() => {
    if (!kanbanCommitteeId && committees.length > 0) {
      setKanbanCommitteeId(headCommitteeId || committees[0].id);
    }
  }, [committees, headCommitteeId, kanbanCommitteeId]);

  // 3. Query Tasks for "My Tasks" and "All Tasks" with server-side pagination & RLS
  const { data: tasksData, isLoading, error } = useQuery({
    queryKey: [
      'dashboard',
      'tasks',
      activeTab,
      user?.id,
      page,
      search,
      statusFilter,
      priorityFilter,
      dueFilter,
      committeeFilter,
      sortBy,
      sortOrder,
    ],
    queryFn: async () => {
      if (activeTab === 'kanban') return { rows: [], total: 0 };

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('tasks')
        .select(
          `
          id,
          title,
          description,
          status,
          priority,
          due_date,
          points_value,
          created_at,
          completed_at,
          committee_id,
          assignee_id,
          created_by,
          profiles!tasks_assignee_id_fkey(
            id,
            full_name_ar,
            full_name_en,
            avatar_url
          ),
          committees!inner(
            id,
            slug,
            name_ar,
            name_en,
            color
          )
        `,
          { count: 'exact' }
        );

      // Tab scoping
      if (activeTab === 'my') {
        query = query.eq('assignee_id', user.id);
      }

      // Filter: Committee
      if (committeeFilter !== 'all') {
        query = query.eq('committee_id', committeeFilter);
      }

      // Filter: Status
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Filter: Priority
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      // Filter: Due Date
      const now = new Date();
      if (dueFilter === 'overdue') {
        query = query
          .lt('due_date', now.toISOString())
          .not('status', 'in', '("done","cancelled")');
      } else if (dueFilter === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
        query = query.gte('due_date', startOfDay).lte('due_date', endOfDay);
      } else if (dueFilter === 'week') {
        const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('due_date', now.toISOString()).lte('due_date', endOfWeek);
      }

      // Filter: Search
      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`);
      }

      const ascending = sortOrder === 'asc';
      query = query.order(sortBy, { ascending });
      query = query.range(from, to);

      const { data, error: qError, count } = await query;
      if (qError) throw qError;

      return {
        rows: data || [],
        total: count || 0,
      };
    },
    enabled: Boolean(user?.id && activeTab !== 'kanban'),
    keepPreviousData: true,
  });

  // 4. Query Tasks for "Committee Board" (Kanban)
  const { data: kanbanTasks = [], isLoading: loadingKanban } = useQuery({
    queryKey: ['dashboard', 'kanban_tasks', kanbanCommitteeId],
    queryFn: async () => {
      if (!kanbanCommitteeId) return [];
      const { data, error: kError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          points_value,
          created_at,
          completed_at,
          committee_id,
          assignee_id,
          created_by,
          profiles!tasks_assignee_id_fkey(
            id,
            full_name_ar,
            full_name_en,
            avatar_url
          ),
          committees!inner(
            id,
            slug,
            name_ar,
            name_en,
            color
          )
        `)
        .eq('committee_id', kanbanCommitteeId)
        .order('created_at', { ascending: false });

      if (kError) throw kError;
      return data || [];
    },
    enabled: Boolean(activeTab === 'kanban' && kanbanCommitteeId),
  });

  // Status Change Mutation (for kanban drag & drop)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }) => {
      const { data, error: upErr } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();
      if (upErr) throw upErr;
      return data;
    },
    onSuccess: () => {
      toast.show(isAr ? 'تم تحديث حالة المهمة' : 'Task status updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'kanban_tasks'] });
    },
    onError: (err) => {
      toast.show(
        err.message || (isAr ? 'غير مصرح بتغيير حالة المهمة' : 'Not permitted to move task'),
        'error'
      );
    },
  });

  const handleOpenTask = (task) => {
    setSelectedTask(task);
    setIsTaskDrawerOpen(true);
  };

  const handleEditTask = (task) => {
    setTaskToEdit(task);
    setIsFormDrawerOpen(true);
  };

  // Columns for List / Table view
  const columns = [
    {
      key: 'title',
      label: isAr ? 'المهمة' : 'Task',
      render: (row) => {
        const isOverdue = isTaskOverdue(row);
        return (
          <div>
            <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{row.title}</div>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', alignItems: 'center' }}>
              <StatusBadge status={row.priority} />
              {row.points_value > 0 && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: '#ffd54f',
                    background: 'rgba(255,184,0,0.1)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                  }}
                >
                  +{row.points_value} {isAr ? 'نقطة' : 'pts'}
                </span>
              )}
              {isOverdue && (
                <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>
                  ({isAr ? 'متأخرة' : 'Overdue'})
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: isAr ? 'الحالة' : 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'committee',
      label: isAr ? 'اللجنة' : 'Committee',
      render: (row) => (
        <StatusBadge
          label={isAr ? row.committees?.name_ar : row.committees?.name_en}
          color={row.committees?.color}
        />
      ),
    },
    {
      key: 'assignee',
      label: isAr ? 'المُعيّن' : 'Assignee',
      render: (row) => {
        const name = isAr
          ? row.profiles?.full_name_ar || row.profiles?.full_name_en
          : row.profiles?.full_name_en || row.profiles?.full_name_ar;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(255, 184, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {row.profiles?.avatar_url ? (
                <img src={row.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={12} color="#ffb800" />
              )}
            </div>
            <span style={{ fontSize: '0.85rem', color: '#ddd' }}>
              {name || (isAr ? 'بدون تعيين' : 'Unassigned')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'due_date',
      label: isAr ? 'موعد التسليم' : 'Due Date',
      render: (row) => {
        const isOverdue = isTaskOverdue(row);
        return (
          <span style={{ fontSize: '0.82rem', color: isOverdue ? '#ef4444' : '#aaa', fontWeight: isOverdue ? 700 : 400 }}>
            {formatDueDate(row.due_date, lang)}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare size={24} color="#ffd54f" />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffd54f', margin: 0 }}>
              {isAr ? 'إدارة المهام والعمليات' : 'Tasks & Operations'}
            </h1>
          </div>
          <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
            {isAr
              ? 'متابعة المهام المسندة، لوحة الكانبان التفاعلية، ونظام احتساب النقاط التلقائي'
              : 'Track tasks, interactive committee Kanban board, and automated points awarding'}
          </p>
        </div>

        {canCreateTask && (
          <button
            type="button"
            onClick={() => {
              setTaskToEdit(null);
              setIsFormDrawerOpen(true);
            }}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
            }}
          >
            <Plus size={18} />
            <span>{isAr ? 'إنشاء مهمة جديدة' : 'Create New Task'}</span>
          </button>
        )}
      </div>

      {/* Tabs Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255, 184, 0, 0.2)',
          marginBottom: '1.25rem',
          paddingBottom: '0.25rem',
          overflowX: 'auto',
        }}
      >
        {/* Tab 1: My Tasks */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('my');
            setPage(1);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'my' ? '2px solid #ffb800' : '2px solid transparent',
            color: activeTab === 'my' ? '#ffd54f' : '#888',
            fontWeight: activeTab === 'my' ? 700 : 500,
            padding: '0.6rem 1rem',
            cursor: 'pointer',
            fontSize: '0.92rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.2s',
          }}
        >
          <ListTodo size={17} />
          <span>{isAr ? 'مهامي المعينة' : 'My Tasks'}</span>
        </button>

        {/* Tab 2: Committee Board (Kanban) */}
        <button
          type="button"
          onClick={() => setActiveTab('kanban')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'kanban' ? '2px solid #ffb800' : '2px solid transparent',
            color: activeTab === 'kanban' ? '#ffd54f' : '#888',
            fontWeight: activeTab === 'kanban' ? 700 : 500,
            padding: '0.6rem 1rem',
            cursor: 'pointer',
            fontSize: '0.92rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.2s',
          }}
        >
          <Kanban size={17} />
          <span>{isAr ? 'لوحة اللجنة (كانبان)' : 'Committee Board'}</span>
        </button>

        {/* Tab 3: All Tasks (Leadership) */}
        {isHrOrExec && (
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setPage(1);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'all' ? '2px solid #ffb800' : '2px solid transparent',
              color: activeTab === 'all' ? '#ffd54f' : '#888',
              fontWeight: activeTab === 'all' ? 700 : 500,
              padding: '0.6rem 1rem',
              cursor: 'pointer',
              fontSize: '0.92rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.2s',
            }}
          >
            <Layers size={17} />
            <span>{isAr ? 'كل المهام (الإدارة)' : 'All Tasks (Leadership)'}</span>
          </button>
        )}
      </div>

      {/* Tab 1 & 3: Table / List View */}
      {activeTab !== 'kanban' && (
        <>
          {/* Filters Bar */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginBottom: '1rem',
            }}
          >
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: '#fff',
                fontSize: '0.85rem',
              }}
            >
              <option value="all" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'كل الحالات' : 'All Statuses'}
              </option>
              <option value="todo" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'قيد الانتظار (To Do)' : 'To Do'}
              </option>
              <option value="in_progress" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'قيد التنفيذ (In Progress)' : 'In Progress'}
              </option>
              <option value="review" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'قيد المراجعة (Review)' : 'Review'}
              </option>
              <option value="done" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'مكتملة (Done)' : 'Done'}
              </option>
              <option value="cancelled" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'ملغاة (Cancelled)' : 'Cancelled'}
              </option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: '#fff',
                fontSize: '0.85rem',
              }}
            >
              <option value="all" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'كل الأولويات' : 'All Priorities'}
              </option>
              <option value="low" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'منخفضة' : 'Low'}
              </option>
              <option value="normal" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'عادية' : 'Normal'}
              </option>
              <option value="high" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'مرتفعة' : 'High'}
              </option>
              <option value="urgent" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'عاجلة' : 'Urgent'}
              </option>
            </select>

            {/* Due Filter */}
            <select
              value={dueFilter}
              onChange={(e) => {
                setDueFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: '#fff',
                fontSize: '0.85rem',
              }}
            >
              <option value="all" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'كل المواعيد' : 'All Due Dates'}
              </option>
              <option value="overdue" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'المتأخرة فقط (Overdue)' : 'Overdue'}
              </option>
              <option value="today" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'تستحق اليوم (Due Today)' : 'Due Today'}
              </option>
              <option value="week" style={{ background: '#181920', color: '#fff' }}>
                {isAr ? 'خلال هذا الأسبوع (This Week)' : 'This Week'}
              </option>
            </select>

            {/* Committee Filter (All Tasks tab only) */}
            {activeTab === 'all' && (
              <select
                value={committeeFilter}
                onChange={(e) => {
                  setCommitteeFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                  color: '#fff',
                  fontSize: '0.85rem',
                }}
              >
                <option value="all" style={{ background: '#181920', color: '#fff' }}>
                  {isAr ? 'كل اللجان' : 'All Committees'}
                </option>
                {committees.map((c) => (
                  <option key={c.id} value={c.id} style={{ background: '#181920', color: '#fff' }}>
                    {isAr ? c.name_ar : c.name_en}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* DataTable */}
          <DataTable
            columns={columns}
            data={tasksData?.rows || []}
            total={tasksData?.total || 0}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            isLoading={isLoading}
            error={error}
            search={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            searchPlaceholder={isAr ? 'بحث بعنوان المهمة...' : 'Search task title...'}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={(col) => {
              if (sortBy === col) {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy(col);
                setSortOrder('asc');
              }
            }}
            onRowClick={handleOpenTask}
            emptyTitle={isAr ? 'لا توجد مهام' : 'No tasks found'}
            emptyDescription={
              isAr
                ? 'لم يتم العثور على أي مهام تطابق معايير الفلترة المحددة.'
                : 'No tasks match the selected filters.'
            }
          />
        </>
      )}

      {/* Tab 2: Kanban Board View */}
      {activeTab === 'kanban' && (
        <div>
          {/* Committee Selector for Kanban */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: '#ffd54f', fontWeight: 600 }}>
              {isAr ? 'اختر اللجنة لعرض لوحتها:' : 'Select Committee Board:'}
            </span>

            <select
              value={kanbanCommitteeId}
              onChange={(e) => setKanbanCommitteeId(e.target.value)}
              disabled={!isHrOrExec && isHead} // heads are fixed to their own committee
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: '#fff',
                fontSize: '0.88rem',
                minWidth: '200px',
              }}
            >
              {committees.map((c) => (
                <option key={c.id} value={c.id} style={{ background: '#181920', color: '#fff' }}>
                  {isAr ? c.name_ar : c.name_en}
                </option>
              ))}
            </select>
          </div>

          {loadingKanban ? (
            <div style={{ color: '#ffd54f', padding: '2rem', textAlign: 'center' }}>
              {isAr ? 'جاري تحميل لوحة الكانبان...' : 'Loading Kanban board...'}
            </div>
          ) : (
            <KanbanBoard
              tasks={kanbanTasks}
              onStatusChange={(taskId, newStatus) =>
                updateStatusMutation.mutate({ taskId, newStatus })
              }
              onTaskClick={handleOpenTask}
              user={user}
              roles={roles}
              isSuperAdmin={isSuperAdmin}
            />
          )}
        </div>
      )}

      {/* Task Details Drawer */}
      <TaskDrawer
        task={selectedTask}
        isOpen={isTaskDrawerOpen}
        onClose={() => {
          setIsTaskDrawerOpen(false);
          setSelectedTask(null);
        }}
        onEditTask={handleEditTask}
      />

      {/* Create / Edit Task Drawer */}
      <TaskFormDrawer
        isOpen={isFormDrawerOpen}
        onClose={() => {
          setIsFormDrawerOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        activeSeasonId={activeSeason?.id}
        committees={committees}
      />
    </div>
  );
}
