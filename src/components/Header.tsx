import { BookOpen, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Button, Select } from './ui';
import { useSheetStore } from '../store/useSheetStore';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  difficultyFilter: 'All' | 'Easy' | 'Medium' | 'Hard';
  onDifficultyChange: (value: 'All' | 'Easy' | 'Medium' | 'Hard') => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function Header({ 
  searchQuery, 
  onSearchChange, 
  difficultyFilter, 
  onDifficultyChange, 
  hasActiveFilters,
  onClearFilters 
}: HeaderProps) {
  const { expandAllTopics, collapseAllTopics, getTopics } = useSheetStore();
  const topics = getTopics();

  const totalSubTopics = topics.reduce((acc, t) => acc + t.subTopics.length, 0);
  const totalQuestions = topics.reduce(
    (acc, t) => acc + t.subTopics.reduce((a, st) => a + st.questions.length, 0),
    0
  );

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-orange-500 to-orange-600 shadow-xl">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header Row */}
        <div className="flex items-center justify-between h-14">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-white">
                Codolio Sheet
              </h1>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-orange-100">
                <span>{topics.length} Topics</span>
                <span className="text-orange-200">•</span>
                <span>{totalSubTopics} Sub-topics</span>
                <span className="text-orange-200">•</span>
                <span>{totalQuestions} Questions</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAllTopics}
              className="h-8 px-3 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white text-xs font-medium rounded-md"
            >
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAllTopics}
              className="h-8 px-3 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white text-xs font-medium rounded-md"
            >
              <ChevronUp className="h-3.5 w-3.5 mr-1" />
              Collapse All
            </Button>
          </div>
        </div>
      </div>
      
      {/* Search and Filter Bar - Separate Row */}
      <div className="w-full border-t border-orange-400 bg-orange-600">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search questions by title..."
                style={{ paddingLeft: '2.5rem' }}
                className="w-full h-10 pr-4 bg-white rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300 border-0 shadow-sm"
                aria-label="Search questions"
              />
            </div>
            
            {/* Difficulty Filter */}
            <div className="flex items-center gap-3">
              <Select
                value={difficultyFilter}
                onChange={(e) => onDifficultyChange(e.target.value as 'All' | 'Easy' | 'Medium' | 'Hard')}
                options={[
                  { value: 'All', label: 'All Difficulties' },
                  { value: 'Easy', label: 'Easy' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'Hard', label: 'Hard' },
                ]}
                className="w-40 h-10 bg-white border-0 rounded-lg text-sm text-slate-700 focus:ring-orange-300 shadow-sm"
                aria-label="Filter by difficulty"
              />
              
              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={onClearFilters}
                  className="px-3 h-10 rounded-lg bg-orange-700 text-white text-xs font-medium hover:bg-orange-800 transition-colors whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
