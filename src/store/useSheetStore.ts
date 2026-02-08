import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import { Topic, SubTopic, Question } from '../types';
import { mockData } from '../data/mockData';
import { generateId, validateName, validateQuestionTitle, validateUrl, validateDifficulty } from '../utils/validation';
import { transformApiResponse } from '../utils/apiTransformer';

const API_URL = 'https://node.codolio.com/api/question-tracker/v1/sheet/public/get-sheet-by-slug/striver-sde-sheet';

// ============================================================================
// PERSISTENCE CONFIGURATION
// ============================================================================
const STORAGE_KEY = 'codolio-sheet';
const SCHEMA_VERSION = 1; // Increment when making breaking changes to persisted state

// Maximum number of undo/redo states to keep in history
const MAX_HISTORY_SIZE = 20;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Normalized entity types for O(1) lookups.
 * This normalized structure:
 * - Eliminates deeply nested arrays
 * - Makes updates O(1) instead of O(n)
 * - Simplifies cascade deletes
 * - Makes drag-and-drop operations cleaner (just update ID arrays)
 */
interface TopicEntity {
  id: string;
  name: string;
  subTopicIds: string[];
}

interface SubTopicEntity {
  id: string;
  name: string;
  topicId: string; // Reference to parent topic
  questionIds: string[];
}

interface QuestionEntity {
  id: string;
  title: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  link?: string;
}

/**
 * Core persisted state - only data that needs to survive page refresh.
 * UI state like expanded sections is also persisted for UX continuity.
 */
interface PersistedState {
  topicsById: Record<string, TopicEntity>;
  subTopicsById: Record<string, SubTopicEntity>;
  questionsById: Record<string, QuestionEntity>;
  topicOrder: string[];
  expandedTopics: Record<string, boolean>;
  expandedSubTopics: Record<string, boolean>;
}

/**
 * Snapshot of state for undo/redo history.
 * Only includes the data portion, not UI or history state.
 */
type HistorySnapshot = PersistedState;

/**
 * Full normalized state including transient UI state.
 */
interface NormalizedState extends PersistedState {
  // Loading/error state (not persisted)
  loading: boolean;
  error: string | null;
  
  // Hydration flag - true once initial data is loaded
  _hasHydrated: boolean;
  
  // Undo/Redo history
  _history: HistorySnapshot[];
  _historyIndex: number; // Current position in history, -1 means at present
  _isUndoRedo: boolean; // Flag to prevent recording during undo/redo
}

interface SheetStore extends NormalizedState {
  // Computed selectors (denormalize for component consumption)
  getTopics: () => Topic[];
  getTopic: (id: string) => Topic | null;
  getSubTopic: (topicId: string, subTopicId: string) => SubTopic | null;
  getTopicNames: (excludeId?: string) => string[];
  getSubTopicNames: (topicId: string, excludeId?: string) => string[];
  getQuestionTitles: (subTopicId: string, excludeId?: string) => string[];
  
  // Data fetching
  fetchData: () => Promise<void>;
  clearError: () => void;
  
  // Topic operations
  addTopic: (name: string) => { success: boolean; error?: string };
  updateTopic: (id: string, name: string) => { success: boolean; error?: string };
  deleteTopic: (id: string) => void;
  reorderTopics: (sourceIndex: number, destinationIndex: number) => void;
  
  // SubTopic operations
  addSubTopic: (topicId: string, name: string) => { success: boolean; error?: string };
  updateSubTopic: (topicId: string, subTopicId: string, name: string) => { success: boolean; error?: string };
  deleteSubTopic: (topicId: string, subTopicId: string) => void;
  reorderSubTopics: (topicId: string, sourceIndex: number, destinationIndex: number) => void;
  
  // Cross-level drag: Move sub-topic to a different topic
  moveSubTopicToTopic: (subTopicId: string, fromTopicId: string, toTopicId: string, destinationIndex: number) => void;
  
  // Question operations
  addQuestion: (
    topicId: string,
    subTopicId: string,
    question: { title: string; difficulty?: string; link?: string }
  ) => { success: boolean; error?: string };
  updateQuestion: (
    topicId: string,
    subTopicId: string,
    questionId: string,
    updates: { title?: string; difficulty?: string; link?: string }
  ) => { success: boolean; error?: string };
  deleteQuestion: (topicId: string, subTopicId: string, questionId: string) => void;
  reorderQuestions: (topicId: string, subTopicId: string, sourceIndex: number, destinationIndex: number) => void;
  
  // Cross-level drag: Move question to a different sub-topic
  moveQuestionToSubTopic: (
    questionId: string,
    fromSubTopicId: string,
    toSubTopicId: string,
    destinationIndex: number
  ) => void;
  
  // UI operations
  toggleTopic: (topicId: string) => void;
  toggleSubTopic: (subTopicId: string) => void;
  expandAllTopics: () => void;
  collapseAllTopics: () => void;
  isTopicExpanded: (topicId: string) => boolean;
  isSubTopicExpanded: (subTopicId: string) => boolean;
  
  // Undo/Redo operations
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Internal: Record state for undo
  _recordHistory: () => void;
  
  // Hydration
  setHasHydrated: (state: boolean) => void;
}

/**
 * Normalizes nested topic data into flat entity maps
 */
function normalizeData(nestedTopics: Topic[]): Pick<NormalizedState, 'topicsById' | 'subTopicsById' | 'questionsById' | 'topicOrder' | 'expandedTopics' | 'expandedSubTopics'> {
  const topicsById: Record<string, TopicEntity> = {};
  const subTopicsById: Record<string, SubTopicEntity> = {};
  const questionsById: Record<string, QuestionEntity> = {};
  const topicOrder: string[] = [];
  const expandedTopics: Record<string, boolean> = {};
  const expandedSubTopics: Record<string, boolean> = {};
  
  for (const topic of nestedTopics) {
    const subTopicIds: string[] = [];
    
    for (const subTopic of topic.subTopics) {
      const questionIds: string[] = [];
      
      for (const question of subTopic.questions) {
        questionsById[question.id] = {
          id: question.id,
          title: question.title,
          difficulty: question.difficulty,
          link: question.link,
        };
        questionIds.push(question.id);
      }
      
      subTopicsById[subTopic.id] = {
        id: subTopic.id,
        name: subTopic.name,
        topicId: topic.id,
        questionIds,
      };
      subTopicIds.push(subTopic.id);
      expandedSubTopics[subTopic.id] = true;
    }
    
    topicsById[topic.id] = {
      id: topic.id,
      name: topic.name,
      subTopicIds,
    };
    topicOrder.push(topic.id);
    expandedTopics[topic.id] = true;
  }
  
  return { topicsById, subTopicsById, questionsById, topicOrder, expandedTopics, expandedSubTopics };
}

/**
 * Denormalizes data back to nested Topic structure for components
 */
function denormalizeTopic(
  topicId: string,
  topicsById: Record<string, TopicEntity>,
  subTopicsById: Record<string, SubTopicEntity>,
  questionsById: Record<string, QuestionEntity>
): Topic | null {
  const topic = topicsById[topicId];
  if (!topic) return null;
  
  const subTopics: SubTopic[] = topic.subTopicIds
    .map(stId => {
      const st = subTopicsById[stId];
      if (!st) return null;
      
      const questions: Question[] = st.questionIds
        .map((qId, index) => {
          const q = questionsById[qId];
          if (!q) return null;
          return { ...q, order: index };
        })
        .filter((q): q is Question => q !== null);
      
      return {
        id: st.id,
        name: st.name,
        order: topic.subTopicIds.indexOf(stId),
        questions,
      };
    })
    .filter((st): st is SubTopic => st !== null);
  
  return {
    id: topic.id,
    name: topic.name,
    order: 0, // Will be set by caller
    subTopics,
  };
}

// ============================================================================
// PERSISTENCE HELPERS
// ============================================================================

/**
 * Validates persisted state structure to detect corruption.
 * Returns true if the state has the expected shape and basic integrity.
 */
function isValidPersistedState(state: unknown): state is PersistedState {
  if (!state || typeof state !== 'object') return false;
  
  const s = state as Record<string, unknown>;
  
  // Check required properties exist and are objects/arrays
  if (typeof s.topicsById !== 'object' || s.topicsById === null) return false;
  if (typeof s.subTopicsById !== 'object' || s.subTopicsById === null) return false;
  if (typeof s.questionsById !== 'object' || s.questionsById === null) return false;
  if (!Array.isArray(s.topicOrder)) return false;
  if (typeof s.expandedTopics !== 'object' || s.expandedTopics === null) return false;
  if (typeof s.expandedSubTopics !== 'object' || s.expandedSubTopics === null) return false;
  
  // Basic integrity: all topic IDs in topicOrder should exist in topicsById
  const topicsById = s.topicsById as Record<string, unknown>;
  for (const id of s.topicOrder) {
    if (typeof id !== 'string' || !topicsById[id]) return false;
  }
  
  return true;
}

/**
 * Creates a snapshot of the current state for undo history.
 * Only captures data that can be undone, not UI state like loading.
 */
function createSnapshot(state: NormalizedState): HistorySnapshot {
  return {
    topicsById: JSON.parse(JSON.stringify(state.topicsById)),
    subTopicsById: JSON.parse(JSON.stringify(state.subTopicsById)),
    questionsById: JSON.parse(JSON.stringify(state.questionsById)),
    topicOrder: [...state.topicOrder],
    expandedTopics: { ...state.expandedTopics },
    expandedSubTopics: { ...state.expandedSubTopics },
  };
}

/**
 * Applies a history snapshot to restore state.
 */
function applySnapshot(snapshot: HistorySnapshot): Partial<NormalizedState> {
  return {
    topicsById: JSON.parse(JSON.stringify(snapshot.topicsById)),
    subTopicsById: JSON.parse(JSON.stringify(snapshot.subTopicsById)),
    questionsById: JSON.parse(JSON.stringify(snapshot.questionsById)),
    topicOrder: [...snapshot.topicOrder],
    expandedTopics: { ...snapshot.expandedTopics },
    expandedSubTopics: { ...snapshot.expandedSubTopics },
  };
}

// ============================================================================
// STORE DEFINITION
// ============================================================================

/**
 * Store creator function that will be wrapped with persist middleware.
 */
const storeCreator: StateCreator<SheetStore, [], []> = (set, get) => ({
  // Initial state
  topicsById: {},
  subTopicsById: {},
  questionsById: {},
  topicOrder: [],
  expandedTopics: {},
  expandedSubTopics: {},
  loading: false,
  error: null,
  _hasHydrated: false,
  _history: [],
  _historyIndex: -1,
  _isUndoRedo: false,
  
  // Hydration setter for persist middleware
  setHasHydrated: (state: boolean) => {
    set({ _hasHydrated: state });
  },
  
  /**
   * Records current state to history before making changes.
   * Called by all CRUD operations that should be undoable.
   */
  _recordHistory: () => {
    const state = get();
    // Don't record if we're in the middle of undo/redo
    if (state._isUndoRedo) return;
    
    const snapshot = createSnapshot(state);
    
    // If we're not at the end of history (user undid then made new change),
    // discard the redo stack by slicing history up to current index
    let newHistory = state._historyIndex >= 0
      ? state._history.slice(0, state._historyIndex + 1)
      : [...state._history];
    
    // Add new snapshot
    newHistory.push(snapshot);
    
    // Trim history if it exceeds max size
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory = newHistory.slice(newHistory.length - MAX_HISTORY_SIZE);
    }
    
    set({
      _history: newHistory,
      _historyIndex: -1, // Reset to "at present" state
    });
  },
  
  // Undo/Redo operations
  undo: () => {
    const state = get();
    if (!get().canUndo()) return;
    
    // If at present (-1), save current state first so we can redo back to it
    if (state._historyIndex === -1) {
      const currentSnapshot = createSnapshot(state);
      set({
        _isUndoRedo: true,
        _history: [...state._history, currentSnapshot],
        _historyIndex: state._history.length - 1, // Point to the state before current
      });
    } else {
      set({
        _isUndoRedo: true,
        _historyIndex: state._historyIndex - 1,
      });
    }
    
    // Apply the snapshot at the new index
    const newState = get();
    const snapshot = newState._history[newState._historyIndex];
    if (snapshot) {
      set({
        ...applySnapshot(snapshot),
        _isUndoRedo: false,
      });
    } else {
      set({ _isUndoRedo: false });
    }
  },
  
  redo: () => {
    const state = get();
    if (!get().canRedo()) return;
    
    set({
      _isUndoRedo: true,
      _historyIndex: state._historyIndex + 1,
    });
    
    const newState = get();
    const snapshot = newState._history[newState._historyIndex];
    if (snapshot) {
      // If we've redone all the way to present, reset index to -1
      const atPresent = newState._historyIndex === newState._history.length - 1;
      set({
        ...applySnapshot(snapshot),
        _isUndoRedo: false,
        _historyIndex: atPresent ? -1 : newState._historyIndex,
        // If at present, remove the "current" snapshot we added during undo
        _history: atPresent ? newState._history.slice(0, -1) : newState._history,
      });
    } else {
      set({ _isUndoRedo: false });
    }
  },
  
  canUndo: () => {
    const state = get();
    // Can undo if there's history and we're not at the beginning
    if (state._historyIndex === -1) {
      return state._history.length > 0;
    }
    return state._historyIndex > 0;
  },
  
  canRedo: () => {
    const state = get();
    // Can redo only if we've undone something (not at -1 and not at end)
    return state._historyIndex >= 0 && state._historyIndex < state._history.length - 1;
  },
  
  // Computed selectors
  getTopics: () => {
    const { topicOrder, topicsById, subTopicsById, questionsById } = get();
    return topicOrder
      .map((id, index) => {
        const topic = denormalizeTopic(id, topicsById, subTopicsById, questionsById);
        if (topic) topic.order = index;
        return topic;
      })
      .filter((t): t is Topic => t !== null);
  },
  
  getTopic: (id: string) => {
    const { topicsById, subTopicsById, questionsById, topicOrder } = get();
    const topic = denormalizeTopic(id, topicsById, subTopicsById, questionsById);
    if (topic) topic.order = topicOrder.indexOf(id);
    return topic;
  },
  
  getSubTopic: (topicId: string, subTopicId: string) => {
    const { topicsById, subTopicsById, questionsById } = get();
    const topic = topicsById[topicId];
    const subTopic = subTopicsById[subTopicId];
    if (!topic || !subTopic) return null;
    
    const questions: Question[] = subTopic.questionIds
      .map((qId, index) => {
        const q = questionsById[qId];
        if (!q) return null;
        return { ...q, order: index };
      })
      .filter((q): q is Question => q !== null);
    
    return {
      id: subTopic.id,
      name: subTopic.name,
      order: topic.subTopicIds.indexOf(subTopicId),
      questions,
    };
  },
  
  getTopicNames: (excludeId?: string) => {
    const { topicsById } = get();
    return Object.values(topicsById)
      .filter(t => t.id !== excludeId)
      .map(t => t.name);
  },
  
  getSubTopicNames: (topicId: string, excludeId?: string) => {
    const { topicsById, subTopicsById } = get();
    const topic = topicsById[topicId];
    if (!topic) return [];
    return topic.subTopicIds
      .filter(id => id !== excludeId)
      .map(id => subTopicsById[id]?.name)
      .filter((name): name is string => !!name);
  },
  
  getQuestionTitles: (subTopicId: string, excludeId?: string) => {
    const { subTopicsById, questionsById } = get();
    const subTopic = subTopicsById[subTopicId];
    if (!subTopic) return [];
    return subTopic.questionIds
      .filter(id => id !== excludeId)
      .map(id => questionsById[id]?.title)
      .filter((title): title is string => !!title);
  },
  
  // Data fetching
  fetchData: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform API response to internal format
      const topics = transformApiResponse(data);
      
      if (topics && topics.length > 0) {
        // Successfully transformed API data
        const normalized = normalizeData(topics);
        set({ ...normalized, loading: false, error: null });
      } else {
        // API returned valid response but no usable data - use mock silently
        const normalized = normalizeData(mockData);
        set({ ...normalized, loading: false, error: null });
      }
    } catch (err) {
      // Network or parsing error - fallback to mock data
      const normalized = normalizeData(mockData);
      set({ 
        ...normalized, 
        loading: false, 
        error: null  // Silent fallback for network issues
      });
    }
  },
  
  clearError: () => set({ error: null }),
  
  // Topic operations - O(1) lookups, O(n) for order array
  addTopic: (name: string) => {
    const existingNames = get().getTopicNames();
    const validation = validateName(name, existingNames, 'Topic name');
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Record history before mutation for undo support
    get()._recordHistory();
    
    const id = generateId();
    const newTopic: TopicEntity = {
      id,
      name: name.trim(),
      subTopicIds: [],
    };
    
    set(state => ({
      topicsById: { ...state.topicsById, [id]: newTopic },
      topicOrder: [...state.topicOrder, id],
      expandedTopics: { ...state.expandedTopics, [id]: true },
    }));
    
    return { success: true };
  },
  
  updateTopic: (id: string, name: string) => {
    const { topicsById } = get();
    if (!topicsById[id]) {
      return { success: false, error: 'Topic not found' };
    }
    
    const existingNames = get().getTopicNames(id);
    const validation = validateName(name, existingNames, 'Topic name');
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Record history before mutation for undo support
    get()._recordHistory();
    
    set(state => ({
      topicsById: {
        ...state.topicsById,
        [id]: { ...state.topicsById[id], name: name.trim() },
      },
    }));
    
    return { success: true };
  },
  
  deleteTopic: (id: string) => {
    const { topicsById, subTopicsById, questionsById } = get();
    const topic = topicsById[id];
    if (!topic) return;
    
    // Record history before mutation for undo support
    get()._recordHistory();
    
    // Collect all IDs to delete
    const subTopicIdsToDelete = topic.subTopicIds;
    const questionIdsToDelete: string[] = [];
    
    for (const stId of subTopicIdsToDelete) {
      const st = subTopicsById[stId];
      if (st) {
        questionIdsToDelete.push(...st.questionIds);
      }
    }
    
    // Create new state objects without deleted entities
    const newTopicsById = { ...topicsById };
    delete newTopicsById[id];
    
    const newSubTopicsById = { ...subTopicsById };
    for (const stId of subTopicIdsToDelete) {
      delete newSubTopicsById[stId];
    }
    
    const newQuestionsById = { ...questionsById };
    for (const qId of questionIdsToDelete) {
      delete newQuestionsById[qId];
    }
    
    set(state => {
      const newExpandedTopics = { ...state.expandedTopics };
      delete newExpandedTopics[id];
      
      const newExpandedSubTopics = { ...state.expandedSubTopics };
      for (const stId of subTopicIdsToDelete) {
        delete newExpandedSubTopics[stId];
      }
      
      return {
        topicsById: newTopicsById,
        subTopicsById: newSubTopicsById,
        questionsById: newQuestionsById,
        topicOrder: state.topicOrder.filter(tId => tId !== id),
        expandedTopics: newExpandedTopics,
        expandedSubTopics: newExpandedSubTopics,
      };
    });
  },
  
  reorderTopics: (sourceIndex: number, destinationIndex: number) => {
    // Record history before mutation for undo support
    get()._recordHistory();
    
    set(state => {
      const newOrder = [...state.topicOrder];
      const [removed] = newOrder.splice(sourceIndex, 1);
      newOrder.splice(destinationIndex, 0, removed);
      return { topicOrder: newOrder };
    });
  },
  
  // SubTopic operations
  addSubTopic: (topicId: string, name: string) => {
    const { topicsById } = get();
    if (!topicsById[topicId]) {
      return { success: false, error: 'Topic not found' };
    }
    
    const existingNames = get().getSubTopicNames(topicId);
    const validation = validateName(name, existingNames, 'Sub-topic name');
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Record history before mutation for undo support
    get()._recordHistory();
    
    const id = generateId();
    const newSubTopic: SubTopicEntity = {
      id,
      name: name.trim(),
      topicId,
      questionIds: [],
    };
    
    set(state => ({
      subTopicsById: { ...state.subTopicsById, [id]: newSubTopic },
      topicsById: {
        ...state.topicsById,
        [topicId]: {
          ...state.topicsById[topicId],
          subTopicIds: [...state.topicsById[topicId].subTopicIds, id],
        },
      },
      expandedSubTopics: { ...state.expandedSubTopics, [id]: true },
    }));
    
    return { success: true };
  },
  
  updateSubTopic: (topicId: string, subTopicId: string, name: string) => {
    const { subTopicsById } = get();
    if (!subTopicsById[subTopicId]) {
      return { success: false, error: 'Sub-topic not found' };
    }
    
    const existingNames = get().getSubTopicNames(topicId, subTopicId);
    const validation = validateName(name, existingNames, 'Sub-topic name');
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Record history before mutation for undo support
    get()._recordHistory();
    
    set(state => ({
      subTopicsById: {
        ...state.subTopicsById,
        [subTopicId]: { ...state.subTopicsById[subTopicId], name: name.trim() },
      },
    }));
    
    return { success: true };
  },
  
  deleteSubTopic: (topicId: string, subTopicId: string) => {
    const { topicsById, subTopicsById, questionsById } = get();
    const topic = topicsById[topicId];
    const subTopic = subTopicsById[subTopicId];
    if (!topic || !subTopic) return;
    
    // Record history before mutation for undo support
    get()._recordHistory();
    
    // Delete all questions in this sub-topic
    const newQuestionsById = { ...questionsById };
    for (const qId of subTopic.questionIds) {
      delete newQuestionsById[qId];
    }
    
    const newSubTopicsById = { ...subTopicsById };
    delete newSubTopicsById[subTopicId];
    
    set(state => {
      const newExpandedSubTopics = { ...state.expandedSubTopics };
      delete newExpandedSubTopics[subTopicId];
      
      return {
        subTopicsById: newSubTopicsById,
        questionsById: newQuestionsById,
        topicsById: {
          ...state.topicsById,
          [topicId]: {
            ...state.topicsById[topicId],
            subTopicIds: state.topicsById[topicId].subTopicIds.filter(id => id !== subTopicId),
          },
        },
        expandedSubTopics: newExpandedSubTopics,
      };
    });
  },
  
  reorderSubTopics: (topicId: string, sourceIndex: number, destinationIndex: number) => {
    // Record history before mutation for undo support
    get()._recordHistory();
    
    set(state => {
      const topic = state.topicsById[topicId];
      if (!topic) return state;
      
      const newSubTopicIds = [...topic.subTopicIds];
      const [removed] = newSubTopicIds.splice(sourceIndex, 1);
      newSubTopicIds.splice(destinationIndex, 0, removed);
      
      return {
        topicsById: {
          ...state.topicsById,
          [topicId]: { ...topic, subTopicIds: newSubTopicIds },
        },
      };
    });
  },
  
  // Question operations
  addQuestion: (_topicId: string, subTopicId: string, question) => {
    const { subTopicsById } = get();
    if (!subTopicsById[subTopicId]) {
      return { success: false, error: 'Sub-topic not found' };
    }
    
    const existingTitles = get().getQuestionTitles(subTopicId);
    const titleValidation = validateQuestionTitle(question.title, existingTitles);
    
    if (!titleValidation.valid) {
      return { success: false, error: titleValidation.error };
    }
    
    if (question.link) {
      const urlValidation = validateUrl(question.link);
      if (!urlValidation.valid) {
        return { success: false, error: urlValidation.error };
      }
    }
    
    if (question.difficulty) {
      const diffValidation = validateDifficulty(question.difficulty);
      if (!diffValidation.valid) {
        return { success: false, error: diffValidation.error };
      }
    }
    
    const id = generateId();
    const newQuestion: QuestionEntity = {
      id,
      title: question.title.trim(),
      difficulty: question.difficulty as Question['difficulty'],
      link: question.link?.trim() || undefined,
    };
    
    // Record history before mutation for undo support
    get()._recordHistory();
    
    set(state => ({
      questionsById: { ...state.questionsById, [id]: newQuestion },
      subTopicsById: {
        ...state.subTopicsById,
        [subTopicId]: {
          ...state.subTopicsById[subTopicId],
          questionIds: [...state.subTopicsById[subTopicId].questionIds, id],
        },
      },
    }));
    
    return { success: true };
  },
  
  updateQuestion: (_topicId: string, subTopicId: string, questionId: string, updates) => {
    const { questionsById } = get();
    const question = questionsById[questionId];
    if (!question) {
      return { success: false, error: 'Question not found' };
    }
    
    if (updates.title !== undefined) {
      const existingTitles = get().getQuestionTitles(subTopicId, questionId);
      const titleValidation = validateQuestionTitle(updates.title, existingTitles);
      
      if (!titleValidation.valid) {
        return { success: false, error: titleValidation.error };
      }
    }
    
    if (updates.link !== undefined && updates.link) {
      const urlValidation = validateUrl(updates.link);
      if (!urlValidation.valid) {
        return { success: false, error: urlValidation.error };
      }
    }
    
    if (updates.difficulty !== undefined && updates.difficulty) {
      const diffValidation = validateDifficulty(updates.difficulty);
      if (!diffValidation.valid) {
        return { success: false, error: diffValidation.error };
      }
    }
    
    // Record history before mutation for undo support
    get()._recordHistory();
    
    set(state => ({
      questionsById: {
        ...state.questionsById,
        [questionId]: {
          ...state.questionsById[questionId],
          title: updates.title?.trim() ?? state.questionsById[questionId].title,
          difficulty: updates.difficulty as Question['difficulty'] ?? state.questionsById[questionId].difficulty,
          link: updates.link?.trim() || undefined,
        },
      },
    }));
    
    return { success: true };
  },
  
  deleteQuestion: (_topicId: string, subTopicId: string, questionId: string) => {
    const { questionsById, subTopicsById } = get();
    if (!questionsById[questionId] || !subTopicsById[subTopicId]) return;
    
    // Record history before mutation for undo support
    get()._recordHistory();
    
    const newQuestionsById = { ...questionsById };
    delete newQuestionsById[questionId];
    
    set(state => ({
      questionsById: newQuestionsById,
      subTopicsById: {
        ...state.subTopicsById,
        [subTopicId]: {
          ...state.subTopicsById[subTopicId],
          questionIds: state.subTopicsById[subTopicId].questionIds.filter(id => id !== questionId),
        },
      },
    }));
  },
  
  reorderQuestions: (_topicId: string, subTopicId: string, sourceIndex: number, destinationIndex: number) => {
    // Record history before mutation for undo support
    get()._recordHistory();
    
    set(state => {
      const subTopic = state.subTopicsById[subTopicId];
      if (!subTopic) return state;
      
      const newQuestionIds = [...subTopic.questionIds];
      const [removed] = newQuestionIds.splice(sourceIndex, 1);
      newQuestionIds.splice(destinationIndex, 0, removed);
      
      return {
        subTopicsById: {
          ...state.subTopicsById,
          [subTopicId]: { ...subTopic, questionIds: newQuestionIds },
        },
      };
    });
  },
  
  /**
   * Cross-level drag: Move a sub-topic from one topic to another.
   * This updates the parent reference and both topics' subTopicIds arrays.
   */
  moveSubTopicToTopic: (subTopicId: string, fromTopicId: string, toTopicId: string, destinationIndex: number) => {
    const { topicsById, subTopicsById } = get();
    const fromTopic = topicsById[fromTopicId];
    const toTopic = topicsById[toTopicId];
    const subTopic = subTopicsById[subTopicId];
    
    // Validate: all entities must exist
    if (!fromTopic || !toTopic || !subTopic) return;
    
    // Validate: sub-topic must belong to fromTopic
    if (subTopic.topicId !== fromTopicId) return;
    
    // Record history before mutation for undo support
    get()._recordHistory();
    
    set(state => {
      // Remove from source topic
      const newFromSubTopicIds = state.topicsById[fromTopicId].subTopicIds.filter(id => id !== subTopicId);
      
      // Add to destination topic at specified index
      const newToSubTopicIds = [...state.topicsById[toTopicId].subTopicIds];
      newToSubTopicIds.splice(destinationIndex, 0, subTopicId);
      
      return {
        topicsById: {
          ...state.topicsById,
          [fromTopicId]: { ...state.topicsById[fromTopicId], subTopicIds: newFromSubTopicIds },
          [toTopicId]: { ...state.topicsById[toTopicId], subTopicIds: newToSubTopicIds },
        },
        subTopicsById: {
          ...state.subTopicsById,
          [subTopicId]: { ...state.subTopicsById[subTopicId], topicId: toTopicId },
        },
      };
    });
  },
  
  /**
   * Cross-level drag: Move a question from one sub-topic to another.
   * This updates both sub-topics' questionIds arrays.
   */
  moveQuestionToSubTopic: (questionId: string, fromSubTopicId: string, toSubTopicId: string, destinationIndex: number) => {
    const { subTopicsById, questionsById } = get();
    const fromSubTopic = subTopicsById[fromSubTopicId];
    const toSubTopic = subTopicsById[toSubTopicId];
    const question = questionsById[questionId];
    
    // Validate: all entities must exist
    if (!fromSubTopic || !toSubTopic || !question) return;
    
    // Validate: question must belong to fromSubTopic
    if (!fromSubTopic.questionIds.includes(questionId)) return;
    
    // Record history before mutation for undo support
    get()._recordHistory();
    
    set(state => {
      // Remove from source sub-topic
      const newFromQuestionIds = state.subTopicsById[fromSubTopicId].questionIds.filter(id => id !== questionId);
      
      // Add to destination sub-topic at specified index
      const newToQuestionIds = [...state.subTopicsById[toSubTopicId].questionIds];
      newToQuestionIds.splice(destinationIndex, 0, questionId);
      
      return {
        subTopicsById: {
          ...state.subTopicsById,
          [fromSubTopicId]: { ...state.subTopicsById[fromSubTopicId], questionIds: newFromQuestionIds },
          [toSubTopicId]: { ...state.subTopicsById[toSubTopicId], questionIds: newToQuestionIds },
        },
      };
    });
  },
  
  // UI operations
  toggleTopic: (topicId: string) => {
    set(state => ({
      expandedTopics: {
        ...state.expandedTopics,
        [topicId]: !state.expandedTopics[topicId],
      },
    }));
  },
  
  toggleSubTopic: (subTopicId: string) => {
    set(state => ({
      expandedSubTopics: {
        ...state.expandedSubTopics,
        [subTopicId]: !state.expandedSubTopics[subTopicId],
      },
    }));
  },
  
  expandAllTopics: () => {
    const { topicOrder, topicsById } = get();
    const expandedTopics: Record<string, boolean> = {};
    const expandedSubTopics: Record<string, boolean> = {};
    
    for (const topicId of topicOrder) {
      expandedTopics[topicId] = true;
      const topic = topicsById[topicId];
      if (topic) {
        for (const stId of topic.subTopicIds) {
          expandedSubTopics[stId] = true;
        }
      }
    }
    
    set({ expandedTopics, expandedSubTopics });
  },
  
  collapseAllTopics: () => {
    set({ expandedTopics: {}, expandedSubTopics: {} });
  },
  
  isTopicExpanded: (topicId: string) => {
    return get().expandedTopics[topicId] ?? false;
  },
  
  isSubTopicExpanded: (subTopicId: string) => {
    return get().expandedSubTopics[subTopicId] ?? false;
  },
});

// ============================================================================
// PERSIST CONFIGURATION
// ============================================================================

type SheetPersist = (
  config: StateCreator<SheetStore>,
  options: PersistOptions<SheetStore, Partial<PersistedState>>
) => StateCreator<SheetStore>;

/**
 * Zustand store with localStorage persistence.
 * 
 * Persistence strategy:
 * - Only core data (entities + ordering + UI expand state) is persisted
 * - Schema is versioned to handle migrations
 * - Corrupted or invalid data falls back to empty state (API will reload)
 * - Hydration completes synchronously before first render
 */
export const useSheetStore = create<SheetStore>()(
  (persist as SheetPersist)(
    storeCreator,
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      
      // Only persist core data, not loading/error/history state
      partialize: (state) => ({
        topicsById: state.topicsById,
        subTopicsById: state.subTopicsById,
        questionsById: state.questionsById,
        topicOrder: state.topicOrder,
        expandedTopics: state.expandedTopics,
        expandedSubTopics: state.expandedSubTopics,
      }),
      
      // Handle schema migrations (currently just validates structure)
      migrate: (persistedState, version) => {
        // For now, we only have version 1
        // Future versions would add migration logic here
        if (version === 0) {
          // Version 0 -> 1: Initial schema, no migration needed
          return persistedState as PersistedState;
        }
        return persistedState as PersistedState;
      },
      
      // Called when rehydration completes
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('Failed to rehydrate from localStorage, starting fresh:', error);
        }
        
        // Validate the rehydrated state structure
        if (state && !isValidPersistedState(state)) {
          console.warn('Corrupted localStorage data detected, clearing...');
          localStorage.removeItem(STORAGE_KEY);
          // State will be empty, fetchData will load from API or mock
        }
        
        // Mark hydration as complete
        state?.setHasHydrated(true);
      },
    }
  )
);
