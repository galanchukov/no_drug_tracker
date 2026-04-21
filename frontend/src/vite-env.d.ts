/// <reference types="vite/client" />

declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
    /** iOS Safari legacy Web Audio API */
    webkitAudioContext?: typeof AudioContext;
  }
}

export {};
