import { useEffect } from 'react';
import { useSheetStore } from '../store/useSheetStore';

/**
 * Hook that registers global keyboard shortcuts for undo/redo.
 * 
 * Shortcuts:
 * - Ctrl/Cmd + Z: Undo
 * - Ctrl/Cmd + Shift + Z: Redo
 * 
 * These shortcuts work globally unless focus is in an input/textarea
 * where the browser's native undo should take precedence.
 */
export function useKeyboardShortcuts() {
  const { undo, redo, canUndo, canRedo } = useSheetStore();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl (Windows/Linux) or Cmd (Mac)
      const isMod = e.ctrlKey || e.metaKey;
      
      if (!isMod) return;
      
      // Don't intercept when typing in form fields
      // Let browser handle native undo in inputs
      const target = e.target as HTMLElement;
      const isInputField = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;
      
      if (isInputField) return;
      
      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          // Redo: Ctrl/Cmd + Shift + Z
          if (canRedo()) {
            e.preventDefault();
            redo();
          }
        } else {
          // Undo: Ctrl/Cmd + Z
          if (canUndo()) {
            e.preventDefault();
            undo();
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);
}
