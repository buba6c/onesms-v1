import { useRef, useCallback, useState } from 'react';

interface SwipeToCloseOptions {
  onClose: () => void;
  threshold?: number; // Distance in pixels to trigger close (default 100)
  direction?: 'down' | 'up' | 'left' | 'right';
  enabled?: boolean;
}

interface SwipeState {
  startY: number;
  startX: number;
  currentY: number;
  currentX: number;
  isDragging: boolean;
}

export function useSwipeToClose({
  onClose,
  threshold = 100,
  direction = 'down',
  enabled = true
}: SwipeToCloseOptions) {
  const [translateY, setTranslateY] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const swipeState = useRef<SwipeState>({
    startY: 0,
    startX: 0,
    currentY: 0,
    currentX: 0,
    isDragging: false
  });

  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    swipeState.current = {
      startY: touch.clientY,
      startX: touch.clientX,
      currentY: touch.clientY,
      currentX: touch.clientX,
      isDragging: true
    };
    setIsDragging(true);
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (!enabled || !swipeState.current.isDragging) return;
    
    const touch = e.touches[0];
    swipeState.current.currentY = touch.clientY;
    swipeState.current.currentX = touch.clientX;
    
    const deltaY = touch.clientY - swipeState.current.startY;
    const deltaX = touch.clientX - swipeState.current.startX;
    
    // Only allow dragging in the specified direction
    if (direction === 'down' && deltaY > 0) {
      setTranslateY(deltaY);
      // Prevent scroll when dragging
      e.preventDefault();
    } else if (direction === 'up' && deltaY < 0) {
      setTranslateY(deltaY);
      e.preventDefault();
    } else if (direction === 'left' && deltaX < 0) {
      setTranslateX(deltaX);
      e.preventDefault();
    } else if (direction === 'right' && deltaX > 0) {
      setTranslateX(deltaX);
      e.preventDefault();
    }
  }, [enabled, direction]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !swipeState.current.isDragging) return;
    
    const deltaY = swipeState.current.currentY - swipeState.current.startY;
    const deltaX = swipeState.current.currentX - swipeState.current.startX;
    
    let shouldClose = false;
    
    if (direction === 'down' && deltaY > threshold) {
      shouldClose = true;
    } else if (direction === 'up' && deltaY < -threshold) {
      shouldClose = true;
    } else if (direction === 'left' && deltaX < -threshold) {
      shouldClose = true;
    } else if (direction === 'right' && deltaX > threshold) {
      shouldClose = true;
    }
    
    if (shouldClose) {
      onClose();
    }
    
    // Reset state
    swipeState.current.isDragging = false;
    setIsDragging(false);
    setTranslateY(0);
    setTranslateX(0);
  }, [enabled, direction, threshold, onClose]);

  // Return handlers and state
  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    style: {
      transform: isDragging 
        ? `translate(${translateX}px, ${translateY}px)` 
        : undefined,
      transition: isDragging ? 'none' : 'transform 0.3s ease-out'
    },
    isDragging,
    translateY,
    translateX
  };
}
