export interface Question {
  id: string;
  title: string;
  order: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  link?: string;
}

export interface SubTopic {
  id: string;
  name: string;
  order: number;
  questions: Question[];
}

export interface Topic {
  id: string;
  name: string;
  order: number;
  subTopics: SubTopic[];
}

export interface SheetData {
  topics: Topic[];
}
