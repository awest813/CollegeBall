/// <reference types="vite/client" />

declare global {
  interface Window {
    render_game_to_text?: () => string | null;
    advanceTime?: (ms: number) => Promise<void> | void;
    toggleCollegeBallFullscreen?: () => Promise<void> | void;
  }
}

export {};
