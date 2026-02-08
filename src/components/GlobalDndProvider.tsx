import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import { useDragSensors } from '../hooks/useDragSensors';
import { useSheetStore } from '../store/useSheetStore';
import { clsx } from 'clsx';

/**
 * Drag item types for cross-level DnD.
 * IDs are prefixed to identify type:
 * - topic-{id}: Topic being dragged
 * - subtopic-{id}: SubTopic being dragged  
 * - question-{id}: Question being dragged
 * 
 * Drop containers use similar prefixes:
 * - topic-container-{topicId}: Drop zone for subtopics within a topic
 * - subtopic-container-{subTopicId}: Drop zone for questions within a subtopic
 */

interface DragState {
  type: 'topic' | 'subtopic' | 'question' | null;
  id: string | null;
  sourceContainerId: string | null;
}

interface DndState {
  dragState: DragState;
  overId: string | null;
}

const DndStateContext = createContext<DndState>({
  dragState: { type: null, id: null, sourceContainerId: null },
  overId: null,
});

export function useDndState() {
  return useContext(DndStateContext);
}

/**
 * Custom collision detection that prioritizes containers when dragging cross-level.
 * Uses pointer-within for more precise detection during cross-container drags.
 */
const customCollisionDetection: CollisionDetection = (args) => {
  // First check pointer within (more precise)
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  
  // Fall back to rect intersection
  return rectIntersection(args);
};

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

interface GlobalDndProviderProps {
  children: ReactNode;
  onTopicReorder: (sourceIndex: number, destIndex: number) => void;
}

/**
 * Global DnD provider that enables cross-level drag operations.
 * This replaces the nested DndContexts for a unified drag experience.
 */
export function GlobalDndProvider({ children, onTopicReorder }: GlobalDndProviderProps) {
  const sensors = useDragSensors();
  const {
    topicOrder,
    topicsById,
    subTopicsById,
    reorderSubTopics,
    moveSubTopicToTopic,
    reorderQuestions,
    moveQuestionToSubTopic,
  } = useSheetStore();
  
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    id: null,
    sourceContainerId: null,
  });
  const [overId, setOverId] = useState<string | null>(null);
  
  /**
   * Determine the type and container of a dragged item by checking
   * which entity collection contains it.
   */
  const determineDragType = useCallback((id: string): DragState => {
    // Check if it's a topic
    if (topicsById[id]) {
      return { type: 'topic', id, sourceContainerId: null };
    }
    
    // Check if it's a subtopic
    if (subTopicsById[id]) {
      return { type: 'subtopic', id, sourceContainerId: subTopicsById[id].topicId };
    }
    
    // Check if it's a question (search through subtopics)
    for (const subTopic of Object.values(subTopicsById)) {
      if (subTopic.questionIds.includes(id)) {
        return { type: 'question', id, sourceContainerId: subTopic.id };
      }
    }
    
    return { type: null, id: null, sourceContainerId: null };
  }, [topicsById, subTopicsById]);
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const state = determineDragType(active.id as string);
    setDragState(state);
  }, [determineDragType]);
  
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string ?? null);
  }, []);
  
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    // Reset state
    setDragState({ type: null, id: null, sourceContainerId: null });
    setOverId(null);
    
    if (!over || active.id === over.id) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    const activeType = determineDragType(activeId);
    
    // Handle topic reordering
    if (activeType.type === 'topic') {
      const oldIndex = topicOrder.indexOf(activeId);
      const newIndex = topicOrder.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        onTopicReorder(oldIndex, newIndex);
      }
      return;
    }
    
    // Handle subtopic drag
    if (activeType.type === 'subtopic' && activeType.sourceContainerId) {
      const overType = determineDragType(overId);
      
      // Dropped on another subtopic - reorder within same topic or move to different topic
      if (overType.type === 'subtopic' && overType.sourceContainerId) {
        if (activeType.sourceContainerId === overType.sourceContainerId) {
          // Same topic - reorder
          const topic = topicsById[activeType.sourceContainerId];
          if (topic) {
            const oldIndex = topic.subTopicIds.indexOf(activeId);
            const newIndex = topic.subTopicIds.indexOf(overId);
            if (oldIndex !== -1 && newIndex !== -1) {
              reorderSubTopics(activeType.sourceContainerId, oldIndex, newIndex);
            }
          }
        } else {
          // Different topic - move subtopic
          const destTopic = topicsById[overType.sourceContainerId];
          if (destTopic) {
            const destIndex = destTopic.subTopicIds.indexOf(overId);
            moveSubTopicToTopic(activeId, activeType.sourceContainerId, overType.sourceContainerId, destIndex);
          }
        }
      }
      // Dropped on a topic (move subtopic to end of that topic)
      else if (overType.type === 'topic') {
        const destTopic = topicsById[overId];
        if (destTopic && activeType.sourceContainerId !== overId) {
          moveSubTopicToTopic(activeId, activeType.sourceContainerId, overId, destTopic.subTopicIds.length);
        }
      }
      return;
    }
    
    // Handle question drag
    if (activeType.type === 'question' && activeType.sourceContainerId) {
      const overType = determineDragType(overId);
      
      // Dropped on another question
      if (overType.type === 'question' && overType.sourceContainerId) {
        if (activeType.sourceContainerId === overType.sourceContainerId) {
          // Same subtopic - reorder
          const subTopic = subTopicsById[activeType.sourceContainerId];
          if (subTopic) {
            const oldIndex = subTopic.questionIds.indexOf(activeId);
            const newIndex = subTopic.questionIds.indexOf(overId);
            if (oldIndex !== -1 && newIndex !== -1) {
              // Find the topicId for the subtopic
              const topicId = subTopic.topicId;
              reorderQuestions(topicId, activeType.sourceContainerId, oldIndex, newIndex);
            }
          }
        } else {
          // Different subtopic - move question
          const destSubTopic = subTopicsById[overType.sourceContainerId];
          if (destSubTopic) {
            const destIndex = destSubTopic.questionIds.indexOf(overId);
            moveQuestionToSubTopic(activeId, activeType.sourceContainerId, overType.sourceContainerId, destIndex);
          }
        }
      }
      // Dropped on a subtopic header (move question to end of that subtopic)
      else if (overType.type === 'subtopic') {
        if (activeType.sourceContainerId !== overId) {
          const destSubTopic = subTopicsById[overId];
          if (destSubTopic) {
            moveQuestionToSubTopic(activeId, activeType.sourceContainerId, overId, destSubTopic.questionIds.length);
          }
        }
      }
      return;
    }
  }, [
    topicOrder,
    topicsById,
    subTopicsById,
    determineDragType,
    onTopicReorder,
    reorderSubTopics,
    moveSubTopicToTopic,
    reorderQuestions,
    moveQuestionToSubTopic,
  ]);
  
  return (
    <DndStateContext.Provider value={{ dragState, overId }}>
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {children}
        <DragOverlay dropAnimation={dropAnimationConfig}>
          {dragState.id ? (
            <div className="px-4 py-2 bg-white shadow-xl rounded-lg border-2 border-orange-400 text-sm font-medium text-slate-700 max-w-xs truncate opacity-90">
              Moving {dragState.type}...
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </DndStateContext.Provider>
  );
}

interface DropIndicatorProps {
  isOver: boolean;
  position?: 'top' | 'bottom' | 'inside';
}

/**
 * Visual indicator shown when an item can be dropped.
 */
export function DropIndicator({ isOver, position = 'inside' }: DropIndicatorProps) {
  if (!isOver) return null;
  
  return (
    <div
      className={clsx(
        'absolute left-0 right-0 h-1 bg-orange-500 rounded-full z-10',
        position === 'top' && 'top-0 -translate-y-1/2',
        position === 'bottom' && 'bottom-0 translate-y-1/2',
        position === 'inside' && 'top-1/2 -translate-y-1/2 opacity-30 h-full'
      )}
    />
  );
}
