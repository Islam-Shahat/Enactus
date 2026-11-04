import React from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import StatusBadge from './StatusBadge';
import { useLanguage } from '../../context/LanguageContext';
import { isTaskOverdue, formatDueDate } from '../../lib/taskHelpers';
import { Clock, AlertTriangle, Award, User, GripVertical } from 'lucide-react';

const COLUMNS = [
  { id: 'todo', label: { ar: 'قيد الانتظار', en: 'To Do' }, color: '#94a3b8' },
  { id: 'in_progress', label: { ar: 'قيد التنفيذ', en: 'In Progress' }, color: '#60a5fa' },
  { id: 'review', label: { ar: 'قيد المراجعة', en: 'In Review' }, color: '#facc15' },
  { id: 'done', label: { ar: 'مكتملة', en: 'Done' }, color: '#4ade80' },
];

function DroppableColumn({ col, tasks = [], children }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        minWidth: '260px',
        maxWidth: '360px',
        background: isOver ? 'rgba(255, 184, 0, 0.08)' : 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${isOver ? 'rgba(255, 184, 0, 0.45)' : 'rgba(255, 184, 0, 0.15)'}`,
        borderRadius: '14px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '520px',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      {/* Column Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          paddingBottom: '0.65rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: col.color,
            }}
          />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
            {isAr ? col.label.ar : col.label.en}
          </h3>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#ffd54f',
            background: 'rgba(255, 184, 0, 0.1)',
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
          }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Task Cards Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

function DraggableCard({ task, canDrag, onClick }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: canDrag ? 'grab' : 'pointer',
    touchAction: 'none',
  };

  const isOverdue = isTaskOverdue(task);
  const assigneeName = isAr
    ? task.profiles?.full_name_ar || task.profiles?.full_name_en
    : task.profiles?.full_name_en || task.profiles?.full_name_ar;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) {
          onClick(task);
        }
      }}
      className="glass-panel card-shine"
      style={{
        ...style,
        background: 'rgba(255, 255, 255, 0.035)',
        border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 184, 0, 0.2)'}`,
        borderRadius: '10px',
        padding: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Top row: Priority & Points & Drag indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <StatusBadge status={task.priority} />
          {task.points_value > 0 && (
            <span
              style={{
                fontSize: '0.7rem',
                color: '#ffd54f',
                fontWeight: 700,
                background: 'rgba(255, 184, 0, 0.1)',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <Award size={11} />
              <span>+{task.points_value}</span>
            </span>
          )}
        </div>

        {canDrag && (
          <div style={{ color: '#666', display: 'flex', alignItems: 'center' }} title={isAr ? 'اسحب لنقل الحالة' : 'Drag to change status'}>
            <GripVertical size={14} />
          </div>
        )}
      </div>

      {/* Title */}
      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem', lineHeight: 1.4 }}>
        {task.title}
      </div>

      {/* Due Date & Overdue Badge */}
      {task.due_date && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem' }}>
          {isOverdue ? (
            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}>
              <AlertTriangle size={12} />
              <span>{isAr ? 'متأخرة: ' : 'Overdue: '}{formatDueDate(task.due_date, lang)}</span>
            </span>
          ) : (
            <span style={{ color: '#aaa', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={12} />
              <span>{formatDueDate(task.due_date, lang)}</span>
            </span>
          )}
        </div>
      )}

      {/* Bottom row: Assignee avatar & name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: '0.45rem',
          marginTop: '0.2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'rgba(255, 184, 0, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {task.profiles?.avatar_url ? (
              <img src={task.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={11} color="#ffb800" />
            )}
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#ccc',
              maxWidth: '130px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {assigneeName || (isAr ? 'بدون تعيين' : 'Unassigned')}
          </span>
        </div>

        {task.committees && (
          <span style={{ fontSize: '0.68rem', color: task.committees.color || '#ffb800' }}>
            {isAr ? task.committees.name_ar : task.committees.name_en}
          </span>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  tasks = [],
  onStatusChange,
  onTaskClick,
  user,
  roles = [],
  isSuperAdmin = false,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6, // 6px threshold to keep click events responsive
      },
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const targetStatus = over.id; // 'todo' | 'in_progress' | 'review' | 'done'
    const draggedTask = active.data?.current?.task;

    if (draggedTask && draggedTask.status !== targetStatus) {
      onStatusChange(draggedTask.id, targetStatus);
    }
  };

  // Group tasks by status
  const tasksByCol = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    review: tasks.filter((t) => t.status === 'review'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          overflowX: 'auto',
          paddingBottom: '1rem',
          alignItems: 'flex-start',
        }}
      >
        {COLUMNS.map((col) => {
          const colTasks = tasksByCol[col.id] || [];
          return (
            <DroppableColumn key={col.id} col={col} tasks={colTasks}>
              {colTasks.map((t) => {
                // Rule: assignees can drag only their own cards (or leadership/heads can drag)
                const isLeader =
                  isSuperAdmin ||
                  roles.some((r) =>
                    ['president', 'vice_president', 'hr_admin', 'coordinator'].includes(r.role) ||
                    (r.role === 'committee_head' && r.committee_id === t.committee_id)
                  );
                const canDrag = isLeader || t.assignee_id === user?.id;

                return (
                  <DraggableCard
                    key={t.id}
                    task={t}
                    canDrag={canDrag}
                    onClick={onTaskClick}
                  />
                );
              })}
            </DroppableColumn>
          );
        })}
      </div>
    </DndContext>
  );
}
