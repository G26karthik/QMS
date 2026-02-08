import { useState, ChangeEvent, KeyboardEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { GripVertical, Pencil, Trash2, ExternalLink, Check, X } from 'lucide-react';
import { Question } from '../types';
import { Button, Input, ConfirmModal, Select } from './ui';
import { useSheetStore } from '../store/useSheetStore';

interface QuestionItemProps {
  question: Question;
  topicId: string;
  subTopicId: string;
}

const difficultyColors: Record<'Easy' | 'Medium' | 'Hard', string> = {
  Easy: 'difficulty-easy',
  Medium: 'difficulty-medium',
  Hard: 'difficulty-hard',
};

export function QuestionItem({ question, topicId, subTopicId }: QuestionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editTitle, setEditTitle] = useState(question.title);
  const [editDifficulty, setEditDifficulty] = useState(question.difficulty || '');
  const [editLink, setEditLink] = useState(question.link || '');
  const [editError, setEditError] = useState<string | null>(null);

  const { updateQuestion, deleteQuestion } = useSheetStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    setEditError(null);
    const result = updateQuestion(topicId, subTopicId, question.id, {
      title: editTitle,
      difficulty: editDifficulty || undefined,
      link: editLink || undefined,
    });
    if (result.success) {
      setIsEditing(false);
    } else {
      setEditError(result.error || 'Failed to update question');
    }
  };

  const handleCancel = () => {
    setEditTitle(question.title);
    setEditDifficulty(question.difficulty || '');
    setEditLink(question.link || '');
    setIsEditing(false);
    setEditError(null);
  };

  const handleDelete = () => {
    deleteQuestion(topicId, subTopicId, question.id);
  };

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex flex-col gap-3 p-4 bg-white rounded-xl border-2 border-orange-100"
      >
        <Input
          value={editTitle}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
          placeholder="Question title"
          className="border-2 border-orange-100 rounded-lg focus:ring-orange-500"
          autoFocus
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <div className="flex gap-3">
          <Select
            value={editDifficulty}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setEditDifficulty(e.target.value)}
            options={[
              { value: '', label: 'Select difficulty' },
              { value: 'Easy', label: 'Easy' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Hard', label: 'Hard' },
            ]}
            className="w-40 border-2 border-orange-100 rounded-lg"
          />
          <Input
            value={editLink}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditLink(e.target.value)}
            placeholder="External link (optional)"
            className="flex-1 border-2 border-orange-100 rounded-lg"
          />
        </div>
        {editError && <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{editError}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={handleCancel} aria-label="Cancel" className="hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSave} aria-label="Save" className="hover:bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={clsx(
          'question-item group flex items-center gap-2',
          isDragging && 'opacity-50 shadow-lg ring-2 ring-orange-300'
        )}
      >
        <button
          {...attributes}
          {...listeners}
          className="drag-handle p-1 text-slate-300 hover:text-orange-500 cursor-grab active:cursor-grabbing rounded hover:bg-orange-50 flex-shrink-0 transition-colors"
          aria-label="Drag to reorder question"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm text-slate-700 truncate">{question.title}</span>
          {question.link && (
            <a
              href={question.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-600 transition-colors flex-shrink-0 p-0.5 rounded hover:bg-orange-50"
              onClick={(e) => e.stopPropagation()}
              aria-label="Open external link"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {question.difficulty && (
          <span
            className={clsx(
              'px-2.5 py-0.5 text-xs font-medium rounded-full flex-shrink-0 min-w-[55px] text-center',
              difficultyColors[question.difficulty]
            )}
          >
            {question.difficulty}
          </span>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
            className="h-6 w-6 hover:bg-orange-100"
            aria-label="Edit question"
          >
            <Pencil className="h-3 w-3 text-orange-400" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteModal(true)}
            className="h-6 w-6 hover:bg-red-100"
            aria-label="Delete question"
          >
            <Trash2 className="h-3 w-3 text-slate-400 hover:text-red-500" />
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Question"
        message={`Are you sure you want to delete "${question.title}"?`}
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
}
