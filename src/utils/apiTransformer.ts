import { Topic, SubTopic, Question } from '../types';

/**
 * API Response Interfaces
 * These represent the actual shape of data from the Codolio API
 */
interface ApiQuestionDetails {
  _id: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  problemUrl?: string;
  name?: string;
}

interface ApiQuestionEntry {
  _id: string;
  topic: string;
  subTopic: string | null;
  title: string;
  questionId?: ApiQuestionDetails;
  resource?: string;
}

interface ApiSheetConfig {
  topicOrder?: string[];
  subTopicOrder?: Record<string, string[]>;
  questionOrder?: string[];
}

interface ApiSheet {
  config?: ApiSheetConfig;
  name?: string;
  _id?: string;
}

interface ApiResponse {
  data?: {
    sheet?: ApiSheet;
    questions?: ApiQuestionEntry[];
  };
}

// Default sub-topic name when subTopic is null
const DEFAULT_SUBTOPIC_NAME = 'Questions';

/**
 * Transforms API response to the application's internal Topic[] format.
 * Handles missing/partial fields gracefully.
 */
export function transformApiResponse(response: unknown): Topic[] | null {
  try {
    // Validate basic response structure
    if (!response || typeof response !== 'object') {
      return null;
    }

    const apiResponse = response as ApiResponse;
    const data = apiResponse.data;
    
    if (!data) {
      return null;
    }

    const questions = data.questions;
    const sheet = data.sheet;

    // Must have questions array to proceed
    if (!Array.isArray(questions) || questions.length === 0) {
      return null;
    }

    // Extract ordering configuration (with defaults)
    const topicOrder = sheet?.config?.topicOrder ?? [];
    const questionOrder = sheet?.config?.questionOrder ?? [];
    const subTopicOrder = sheet?.config?.subTopicOrder ?? {};

    // Create a map for question order lookup (O(1) access)
    const questionOrderMap = new Map<string, number>();
    questionOrder.forEach((id, index) => {
      questionOrderMap.set(id, index);
    });

    // Group questions by topic -> subTopic
    const topicMap = new Map<string, Map<string, ApiQuestionEntry[]>>();

    for (const q of questions) {
      // Skip malformed entries
      if (!q || typeof q.topic !== 'string' || !q.topic.trim()) {
        continue;
      }

      const topicName = q.topic.trim();
      const subTopicName = q.subTopic?.trim() || DEFAULT_SUBTOPIC_NAME;

      if (!topicMap.has(topicName)) {
        topicMap.set(topicName, new Map());
      }

      const subTopicMap = topicMap.get(topicName)!;
      if (!subTopicMap.has(subTopicName)) {
        subTopicMap.set(subTopicName, []);
      }

      subTopicMap.get(subTopicName)!.push(q);
    }

    // Build ordered topic list
    const topicNames = Array.from(topicMap.keys());
    
    // Sort topics: those in topicOrder first (by order), then remaining alphabetically
    topicNames.sort((a, b) => {
      const aIndex = topicOrder.indexOf(a);
      const bIndex = topicOrder.indexOf(b);
      
      // Both in topicOrder - use specified order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // Only a in topicOrder - a comes first
      if (aIndex !== -1) return -1;
      // Only b in topicOrder - b comes first
      if (bIndex !== -1) return 1;
      // Neither in topicOrder - alphabetical
      return a.localeCompare(b);
    });

    // Transform to Topic[] format
    const topics: Topic[] = topicNames.map((topicName, topicIndex) => {
      const subTopicMap = topicMap.get(topicName)!;
      const subTopicNames = Array.from(subTopicMap.keys());

      // Sort sub-topics using subTopicOrder if available, else alphabetically
      // But keep DEFAULT_SUBTOPIC_NAME first if present and no explicit order
      const topicSubOrder = subTopicOrder[topicName];
      if (topicSubOrder && Array.isArray(topicSubOrder)) {
        subTopicNames.sort((a, b) => {
          const aIdx = topicSubOrder.indexOf(a);
          const bIdx = topicSubOrder.indexOf(b);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return a.localeCompare(b);
        });
      } else {
        // Default sort: put DEFAULT_SUBTOPIC_NAME first, then alphabetical
        subTopicNames.sort((a, b) => {
          if (a === DEFAULT_SUBTOPIC_NAME) return -1;
          if (b === DEFAULT_SUBTOPIC_NAME) return 1;
          return a.localeCompare(b);
        });
      }

      const subTopics: SubTopic[] = subTopicNames.map((subTopicName, stIndex) => {
        const apiQuestions = subTopicMap.get(subTopicName)!;

        // Sort questions by questionOrder
        apiQuestions.sort((a, b) => {
          const aOrder = questionOrderMap.get(a._id) ?? Number.MAX_SAFE_INTEGER;
          const bOrder = questionOrderMap.get(b._id) ?? Number.MAX_SAFE_INTEGER;
          return aOrder - bOrder;
        });

        const questions: Question[] = apiQuestions.map((q, qIndex) => ({
          id: q._id || generateFallbackId(topicName, subTopicName, qIndex),
          title: q.title || q.questionId?.name || 'Untitled Question',
          order: qIndex,
          difficulty: normalizeDifficulty(q.questionId?.difficulty),
          link: q.questionId?.problemUrl || q.resource || undefined,
        }));

        return {
          id: generateSubTopicId(topicName, subTopicName),
          name: subTopicName,
          order: stIndex,
          questions,
        };
      });

      return {
        id: generateTopicId(topicName),
        name: topicName,
        order: topicIndex,
        subTopics,
      };
    });

    return topics.length > 0 ? topics : null;
  } catch (error) {
    // Silent failure - return null to trigger fallback
    console.debug('API transformation failed:', error);
    return null;
  }
}

/**
 * Normalize difficulty to expected enum values
 */
function normalizeDifficulty(difficulty: string | undefined): 'Easy' | 'Medium' | 'Hard' | undefined {
  if (!difficulty) return undefined;
  const normalized = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
  if (normalized === 'Easy' || normalized === 'Medium' || normalized === 'Hard') {
    return normalized;
  }
  return undefined;
}

/**
 * Generate a stable ID for topics based on name
 */
function generateTopicId(name: string): string {
  return `topic-${slugify(name)}`;
}

/**
 * Generate a stable ID for sub-topics based on topic and sub-topic names
 */
function generateSubTopicId(topicName: string, subTopicName: string): string {
  return `subtopic-${slugify(topicName)}-${slugify(subTopicName)}`;
}

/**
 * Generate a fallback ID for questions when _id is missing
 */
function generateFallbackId(topicName: string, subTopicName: string, index: number): string {
  return `q-${slugify(topicName)}-${slugify(subTopicName)}-${index}`;
}

/**
 * Convert a string to a URL-friendly slug
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Validate if the API response is usable (for logging/debugging purposes)
 */
export function isValidApiResponse(response: unknown): boolean {
  if (!response || typeof response !== 'object') return false;
  const r = response as ApiResponse;
  return !!(r.data?.questions && Array.isArray(r.data.questions) && r.data.questions.length > 0);
}
