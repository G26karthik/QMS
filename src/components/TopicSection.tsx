import { useState, ChangeEvent, KeyboardEvent } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { 
  GripVertical, 
  Pencil, 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronRight,
  Check,
  X,
  Layers
} from 'lucide-react';
import { Topic } from '../types';
import { Button, Input, ConfirmModal } from './ui';
import { SubTopicCard } from './SubTopicCard';
import { EmptyState } from './EmptyState';
import { useSheetStore } from '../store/useSheetStore';

interface TopicSectionProps {
  topic: Topic;
  isFiltered?: boolean;
}

export function TopicSection({ topic, isFiltered = false }: TopicSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editName, setEditName] = useState(topic.name);
  const [editError, setEditError] = useState<string | null>(null);
  const [isAddingSubTopic, setIsAddingSubTopic] = useState(false);
  const [newSubTopicName, setNewSubTopicName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const { 
    isTopicExpanded, 
    toggleTopic,
    updateTopic,
    deleteTopic,
    addSubTopic,
    topicsById,
  } = useSheetStore();

  const topicEntity = topicsById[topic.id];
  const subTopicIds = topicEntity?.subTopicIds ?? [];
  const isExpanded = isTopicExpanded(topic.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    setEditError(null);
    const result = updateTopic(topic.id, editName);
    if (result.success) {
      setIsEditing(false);
    } else {
      setEditError(result.error || 'Failed to update topic');
    }
  };

  const handleCancel = () => {
    setEditName(topic.name);
    setIsEditing(false);
    setEditError(null);
  };

  const handleAddSubTopic = () => {
    setAddError(null);
    const result = addSubTopic(topic.id, newSubTopicName);
    if (result.success) {
      setNewSubTopicName('');
      setIsAddingSubTopic(false);
    } else {
      setAddError(result.error || 'Failed to add sub-topic');
    }
  };

  const handleCancelAddSubTopic = () => {
    setIsAddingSubTopic(false);
    setNewSubTopicName('');
    setAddError(null);
  };

  const totalQuestions = topic.subTopics.reduce(
    (acc, st) => acc + st.questions.length,
    0
  );

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={clsx(
          'topic-section transition-all',
          isDragging && 'opacity-50 shadow-2xl ring-2 ring-orange-400'
        )}
      >
        {/* Topic Header */}
        <div className="topic-header flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="drag-handle p-1.5 text-slate-400 hover:text-orange-600 cursor-grab active:cursor-grabbing rounded-md hover:bg-orange-50 transition-colors"
            aria-label="Drag to reorder topic"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <button
            onClick={() => toggleTopic(topic.id)}
            className="p-1.5 text-slate-500 hover:text-orange-600 transition-colors rounded-md hover:bg-orange-50"
            aria-label={isExpanded ? 'Collapse topic' : 'Expand topic'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {isEditing ? (
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                  className="h-9 border border-slate-300 focus:ring-orange-500 rounded-lg text-sm"
                  autoFocus
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                />
                <Button variant="ghost" size="icon" onClick={handleSave} aria-label="Save" className="hover:bg-green-50">
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancel} aria-label="Cancel" className="hover:bg-slate-100">
                  <X className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
              {editError && <p className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-lg">{editError}</p>}
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-slate-800 truncate">{topic.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-orange-600 font-medium">
                  {topic.subTopics.length} sub-topics
                </span>
                <span className="text-xs text-orange-500 font-medium">
                  {totalQuestions} questions
                </span>
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit topic"
                  className="h-7 w-7 hover:bg-orange-100"
                >
                  <Pencil className="h-3.5 w-3.5 text-orange-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteModal(true)}
                  aria-label="Delete topic"
                  className="h-7 w-7 hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* SubTopics List */}
        {isExpanded && (
          <div className="px-4 py-4 space-y-3 bg-orange-50/10">
            {topic.subTopics.length > 0 ? (
              <SortableContext
                items={subTopicIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {topic.subTopics.map((subTopic) => (
                    <SubTopicCard
                      key={subTopic.id}
                      subTopic={subTopic}
                      topicId={topic.id}
                      isFiltered={isFiltered}
                    />
                  ))}
                </div>
              </SortableContext>
            ) : (
              !isAddingSubTopic && (
                <EmptyState
                  icon={<Layers className="h-6 w-6 text-orange-400" />}
                  title="No sub-topics"
                  description="Add sub-topics to organize questions"
                  size="sm"
                />
              )
            )}

            {/* Add SubTopic Form */}
            {isAddingSubTopic ? (
              <div className="p-4 bg-white rounded-xl border-2 border-orange-100 space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    value={newSubTopicName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewSubTopicName(e.target.value)}
                    placeholder="Sub-topic name"
                    className="flex-1 border-2 border-orange-100 rounded-xl focus:ring-orange-500"
                    autoFocus
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') handleAddSubTopic();
                      if (e.key === 'Escape') handleCancelAddSubTopic();
                    }}
                  />
                  <Button size="sm" onClick={handleAddSubTopic} className="codolio-btn-primary">
                    Add
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancelAddSubTopic}>
                    Cancel
                  </Button>
                </div>
                {addError && <p className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-lg">{addError}</p>}
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setIsAddingSubTopic(true)}
                className="w-full text-orange-400 hover:text-orange-600 border-dashed border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50 py-5 rounded-xl transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Sub-topic
              </Button>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => deleteTopic(topic.id)}
        title="Delete Topic"
        message={`Are you sure you want to delete "${topic.name}"? This will also delete all ${topic.subTopics.length} sub-topics and ${totalQuestions} questions within it.`}
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
}
