import { useEffect, useState, useMemo } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, FolderOpen, Search } from 'lucide-react';
import { useSheetStore } from './store/useSheetStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorBanner } from './components/ErrorBanner';
import { EmptyState } from './components/EmptyState';
import { Header } from './components/Header';
import { TopicSection } from './components/TopicSection';
import { GlobalDndProvider } from './components/GlobalDndProvider';
import { Button, Input } from './components/ui';
import { Topic } from './types';

function AppContent() {
  const { 
    topicOrder,
    loading, 
    error,
    _hasHydrated,
    fetchData, 
    getTopics,
    addTopic, 
    reorderTopics,
    clearError,
  } = useSheetStore();
  
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');

  const topics = getTopics();
  
  // Register global keyboard shortcuts for undo/redo
  useKeyboardShortcuts();

  // Filter topics based on search and difficulty
  const filteredTopics = useMemo((): Topic[] => {
    const query = searchQuery.toLowerCase().trim();
    const hasFilter = query !== '' || difficultyFilter !== 'All';

    if (!hasFilter) return topics;

    return topics
      .map((topic) => {
        const filteredSubTopics = topic.subTopics
          .map((subTopic) => {
            const filteredQuestions = subTopic.questions.filter((question) => {
              const matchesSearch = query === '' || question.title.toLowerCase().includes(query);
              const matchesDifficulty = difficultyFilter === 'All' || question.difficulty === difficultyFilter;
              return matchesSearch && matchesDifficulty;
            });
            return { ...subTopic, questions: filteredQuestions };
          })
          .filter((subTopic) => subTopic.questions.length > 0);
        return { ...topic, subTopics: filteredSubTopics };
      })
      .filter((topic) => topic.subTopics.length > 0);
  }, [topics, searchQuery, difficultyFilter]);

  const hasActiveFilters = searchQuery !== '' || difficultyFilter !== 'All';
  const noResultsFound = hasActiveFilters && filteredTopics.length === 0 && topics.length > 0;

  // Fetch data only if hydrated and no persisted data exists
  useEffect(() => {
    if (_hasHydrated && topicOrder.length === 0) {
      fetchData();
    }
  }, [_hasHydrated, topicOrder.length, fetchData]);

  const handleAddTopic = () => {
    setAddError(null);
    const result = addTopic(newTopicName);
    if (result.success) {
      setNewTopicName('');
      setIsAddingTopic(false);
    } else {
      setAddError(result.error || 'Failed to add topic');
    }
  };

  const handleCancelAdd = () => {
    setIsAddingTopic(false);
    setNewTopicName('');
    setAddError(null);
  };

  // Show loading state while hydrating or fetching data
  if (!_hasHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4 shadow-xl">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-200 rounded-full animate-spin border-t-orange-600"></div>
          </div>
          <p className="text-slate-600 font-medium">Loading your questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        difficultyFilter={difficultyFilter}
        onDifficultyChange={setDifficultyFilter}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => { setSearchQuery(''); setDifficultyFilter('All'); }}
      />
      
      {error && (
        <ErrorBanner message={error} onDismiss={clearError} />
      )}

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* No results from search/filter */}
        {noResultsFound ? (
          <EmptyState
            icon={<Search className="h-12 w-12 text-orange-400 float-animation" />}
            title="No matching questions"
            description={`No questions found${searchQuery ? ` matching "${searchQuery}"` : ''}${difficultyFilter !== 'All' ? ` with ${difficultyFilter} difficulty` : ''}. Try adjusting your filters.`}
            size="lg"
            action={
              <Button
                variant="outline"
                onClick={() => { setSearchQuery(''); setDifficultyFilter('All'); }}
                className="codolio-btn-secondary border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                Clear Filters
              </Button>
            }
          />
        ) : filteredTopics.length > 0 ? (
          <GlobalDndProvider onTopicReorder={reorderTopics}>
            <SortableContext
              items={topicOrder}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {filteredTopics.map((topic) => (
                  <TopicSection key={topic.id} topic={topic} isFiltered={hasActiveFilters} />
                ))}
              </div>
            </SortableContext>
          </GlobalDndProvider>
        ) : topics.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-16 w-16 text-orange-400 float-animation" />}
            title="No topics yet"
            description="Get started by adding your first topic to organize your questions"
            size="lg"
            action={
              !isAddingTopic && (
                <Button onClick={() => setIsAddingTopic(true)} className="codolio-btn-primary">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Your First Topic
                </Button>
              )
            }
          />
        ) : null}

        {/* Add Topic Section */}
        <div className="mt-8">
          {isAddingTopic ? (
            <div className="p-6 glass rounded-2xl border border-orange-100 shadow-lg space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Add New Topic</h3>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Input
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Enter topic name..."
                  className="flex-1 border-2 border-orange-100 focus:ring-orange-500 rounded-xl"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTopic();
                    if (e.key === 'Escape') handleCancelAdd();
                  }}
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddTopic} className="codolio-btn-primary flex-1 sm:flex-initial">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Topic
                  </Button>
                  <Button variant="ghost" onClick={handleCancelAdd} className="hover:bg-slate-100">
                    Cancel
                  </Button>
                </div>
              </div>
              {addError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{addError}</p>
              )}
            </div>
          ) : topics.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setIsAddingTopic(true)}
              className="w-full py-8 border-dashed border-2 border-orange-200 text-orange-400 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-300 rounded-2xl transition-all group"
            >
              <Plus className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
              Add New Topic
            </Button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/90 backdrop-blur-lg mt-auto">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center">
                <FolderOpen className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-semibold text-slate-700">Codolio Sheet</span>
            </div>
            <p className="text-xs text-slate-500">
              Built with React, TypeScript, and Tailwind CSS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
