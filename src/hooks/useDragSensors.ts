import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Consistent drag activation distance across all hierarchy levels
 */
const ACTIVATION_DISTANCE = 8;

/**
 * Shared, memoized drag sensors for all sortable contexts.
 * Uses consistent activation constraints to prevent accidental drags.
 */
export function useDragSensors() {
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: ACTIVATION_DISTANCE },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { 
      delay: 250,
      tolerance: 5,
    },
  });
  
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  return useSensors(pointerSensor, touchSensor, keyboardSensor);
}
