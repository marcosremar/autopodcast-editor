import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

export const EDITOR_SHORTCUTS: Omit<KeyboardShortcut, 'action'>[] = [
  { key: 'e', ctrl: true, description: 'Export podcast' },
  { key: 's', ctrl: true, description: 'Save changes (auto-save already enabled)' },
  { key: 'a', ctrl: true, description: 'Select all segments' },
  { key: 'a', ctrl: true, shift: true, description: 'Deselect all segments' },
  { key: ' ', description: 'Play/Pause audio' },
  { key: '?', shift: true, description: 'Show keyboard shortcuts' },
];
