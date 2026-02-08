import { create } from 'zustand';
import { Topic, SubTopic, Question } from '../types';
import { mockData } from '../data/mockData';
import { generateId, validateName, validateQuestionTitle, validateUrl, validateDifficulty } from '../utils/validation';
import { transformApiResponse } from '../utils/apiTransformer';

const API_URL = 'https://node.codolio.com/api/question-tracker/v1/sheet/public/get-sheet-by-slug/striver-sde-sheet';

// Normalized entity maps for O(1) lookups
interface TopicEntity {
  id: string;
  name: string;
  subTopicIds: string[];
}

interface SubTopicEntity {
  id: string;
  name: string;
  topicId: string;
  questionIds: string[];
}

interface QuestionEntity {
  id: string;
  title: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  link?: string;
}

interface NormalizedState {
  // Entity maps for O(1) lookups
  topicsById: Record<string, TopicEntity>;
  subTopicsById: Record<string, SubTopicEntity>;
  questionsById: Record<string, QuestionEntity>;
  
  // Ordered array of top-level topic IDs
  topicOrder: string[];
  
  // UI state (using plain objects, not Sets)
  expandedTopics: Record<string, boolean>;
  expandedSubTopics: Record<string, boolean>;
  
  // Loading/error state
  loading: boolean;
  error: string | null;
}

interface SheetStore extends NormalizedState {
  // Computed selectors
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
  
  // UI operations
  toggleTopic: (topicId: string) => void;
  toggleSubTopic: (subTopicId: string) => void;
  expandAllTopics: () => void;
  collapseAllTopics: () => void;
  isTopicExpanded: (topicId: string) => boolean;
  isSubTopicExpanded: (subTopicId: string) => boolean;
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

export const useSheetStore = create<SheetStore>((set, get) => ({
  // Initial state
  topicsById: {},
  subTopicsById: {},
  questionsById: {},
  topicOrder: [],
  expandedTopics: {},
  expandedSubTopics: {},
  loading: false,
  error: null,
  
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
}));
