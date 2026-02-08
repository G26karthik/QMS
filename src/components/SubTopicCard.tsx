import { useState, ChangeEvent, KeyboardEvent } from 'react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
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
  FileQuestion
} from 'lucide-react';
import { SubTopic } from '../types';
import { Button, Input, ConfirmModal, Select } from './ui';
import { QuestionItem } from './QuestionItem';
import { EmptyState } from './EmptyState';
import { useSheetStore } from '../store/useSheetStore';
import { useDragSensors } from '../hooks/useDragSensors';

interface SubTopicCardProps {
  subTopic: SubTopic;
  topicId: string;
  isFiltered?: boolean;
}

export function SubTopicCard({ subTopic, topicId, isFiltered: _isFiltered = false }: SubTopicCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editName, setEditName] = useState(subTopic.name);
  const [editError, setEditError] = useState<string | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionDifficulty, setNewQuestionDifficulty] = useState('');
  const [newQuestionLink, setNewQuestionLink] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const { 
    isSubTopicExpanded, 
    toggleSubTopic,
    updateSubTopic,
    deleteSubTopic,
    addQuestion,
    reorderQuestions,
    subTopicsById,
  } = useSheetStore();

  const subTopicEntity = subTopicsById[subTopic.id];
  const questionIds = subTopicEntity?.questionIds ?? [];
  const isExpanded = isSubTopicExpanded(subTopic.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subTopic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sensors = useDragSensors();

  const handleSave = () => {
    setEditError(null);
    const result = updateSubTopic(topicId, subTopic.id, editName);
    if (result.success) {
      setIsEditing(false);
    } else {
      setEditError(result.error || 'Failed to update sub-topic');
    }
  };

  const handleCancel = () => {
    setEditName(subTopic.name);
    setIsEditing(false);
    setEditError(null);
  };

  const handleAddQuestion = () => {
    setAddError(null);
    const result = addQuestion(topicId, subTopic.id, {
      title: newQuestionTitle,
      difficulty: newQuestionDifficulty || undefined,
      link: newQuestionLink || undefined,
    });
    if (result.success) {
      setNewQuestionTitle('');
      setNewQuestionDifficulty('');
      setNewQuestionLink('');
      setIsAddingQuestion(false);
    } else {
      setAddError(result.error || 'Failed to add question');
    }
  };

  const handleCancelAddQuestion = () => {
    setIsAddingQuestion(false);
    setNewQuestionTitle('');
    setNewQuestionDifficulty('');
    setNewQuestionLink('');
    setAddError(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = questionIds.findIndex((id) => id === active.id);
      const newIndex = questionIds.findIndex((id) => id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderQuestions(topicId, subTopic.id, oldIndex, newIndex);
      }
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={clsx(
          'subtopic-card',
          isDragging && 'opacity-50 shadow-lg ring-2 ring-orange-300'
        )}
      >
        {/* SubTopic Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
          <button
            {...attributes}
            {...listeners}
            className="drag-handle p-1 text-slate-400 hover:text-orange-600 cursor-grab active:cursor-grabbing rounded hover:bg-orange-50 transition-colors"
            aria-label="Drag to reorder sub-topic"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => toggleSubTopic(subTopic.id)}
            className="p-1 text-slate-400 hover:text-orange-600 transition-colors rounded hover:bg-orange-50"
            aria-label={isExpanded ? 'Collapse sub-topic' : 'Expand sub-topic'}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>

          {isEditing ? (
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                  className="h-7 text-sm border border-slate-300 rounded focus:ring-orange-500"
                  autoFocus
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                />
                <Button variant="ghost" size="icon" onClick={handleSave} className="h-7 w-7 hover:bg-green-50" aria-label="Save">
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancel} className="h-7 w-7 hover:bg-slate-100" aria-label="Cancel">
                  <X className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
              {editError && <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{editError}</p>}
            </div>
          ) : (
            <>
              <span className="flex-1 font-medium text-slate-700 text-sm truncate">
                {subTopic.name}
              </span>
              <span className="text-xs text-orange-600 font-medium flex-shrink-0">
                {subTopic.questions.length} questions
              </span>
              {/* Action buttons */}
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  className="h-6 w-6 hover:bg-orange-100"
                  aria-label="Edit sub-topic"
                >
                  <Pencil className="h-3.5 w-3.5 text-orange-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteModal(true)}
                  className="h-6 w-6 hover:bg-red-100"
                  aria-label="Delete sub-topic"
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Questions List */}
        {isExpanded && (
          <div className="px-3 py-3 space-y-2 bg-white">
            {subTopic.questions.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={questionIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {subTopic.questions.map((question) => (
                      <QuestionItem
                        key={question.id}
                        question={question}
                        topicId={topicId}
                        subTopicId={subTopic.id}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              !isAddingQuestion && (
                <EmptyState
                  icon={<FileQuestion className="h-5 w-5 text-orange-400" />}
                  title="No questions"
                  description="Add questions to this sub-topic"
                  size="sm"
                />
              )
            )}

            {/* Add Question Form */}
            {isAddingQuestion ? (
              <div className="p-4 bg-white rounded-xl border-2 border-orange-100 space-y-3">
                <Input
                  value={newQuestionTitle}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewQuestionTitle(e.target.value)}
                  placeholder="Question title"
                  className="border-2 border-orange-100 rounded-lg focus:ring-orange-500"
                  autoFocus
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter' && !e.shiftKey) handleAddQuestion();
                    if (e.key === 'Escape') handleCancelAddQuestion();
                  }}
                />
                <div className="flex gap-3">
                  <Select
                    value={newQuestionDifficulty}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewQuestionDifficulty(e.target.value)}
                    options={[
                      { value: '', label: 'Difficulty' },
                      { value: 'Easy', label: 'Easy' },
                      { value: 'Medium', label: 'Medium' },
                      { value: 'Hard', label: 'Hard' },
                    ]}
                    className="w-36 border-2 border-orange-100 rounded-lg"
                  />
                  <Input
                    value={newQuestionLink}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewQuestionLink(e.target.value)}
                    placeholder="External link (optional)"
                    className="flex-1 border-2 border-orange-100 rounded-lg"
                  />
                </div>
                {addError && <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{addError}</p>}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancelAddQuestion}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddQuestion} className="codolio-btn-primary">
                    Add Question
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingQuestion(true)}
                className="w-full text-orange-400 hover:text-orange-600 border-dashed border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50 py-3 rounded-lg transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => deleteSubTopic(topicId, subTopic.id)}
        title="Delete Sub-topic"
        message={`Are you sure you want to delete "${subTopic.name}"? This will also delete all ${subTopic.questions.length} questions within it.`}
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
}
