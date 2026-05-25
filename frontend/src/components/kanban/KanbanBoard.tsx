import { useState, useCallback } from 'react';
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import type { Board, Task } from '@/types';

interface Props {
  board: Board;
  projectId: string;
}

export function KanbanBoard({ board, projectId }: Props) {
  const { data: tasks = [], isLoading } = useTasks(projectId, board.boardId);
  const updateTask = useUpdateTask(projectId, board.boardId);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const getTasksByColumn = useCallback(
    (columnId: string) => tasks.filter(t => t.columnId === columnId).sort((a, b) => a.order - b.order),
    [tasks]
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = tasks.find(t => t.taskId === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) return;
    const activeTask = tasks.find(t => t.taskId === active.id);
    if (!activeTask) return;

    const overColumn = board.columns.find(c => c.columnId === over.id);
    if (overColumn && activeTask.columnId !== overColumn.columnId) {
      updateTask.mutate({ taskId: activeTask.taskId, data: { columnId: overColumn.columnId } });
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find(t => t.taskId === active.id);
    const overTask = tasks.find(t => t.taskId === over.id);

    if (activeTask && overTask && activeTask.columnId === overTask.columnId) {
      updateTask.mutate({
        taskId: activeTask.taskId,
        data: { order: overTask.order },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 p-6">
        {board.columns.map(col => (
          <div key={col.columnId} className="w-72 shrink-0 h-48 bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-6 overflow-x-auto h-full">
        <SortableContext
          items={board.columns.map(c => c.columnId)}
          strategy={horizontalListSortingStrategy}
        >
          {board.columns
            .slice()
            .sort((a, b) => a.order - b.order)
            .map(column => (
              <KanbanColumn
                key={column.columnId}
                column={column}
                tasks={getTasksByColumn(column.columnId)}
                projectId={projectId}
                boardId={board.boardId}
              />
            ))}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
