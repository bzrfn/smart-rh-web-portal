import {
  useEffect,
  useState,
} from 'react';


export type TerminalTheme =
  | 'light'
  | 'dark';


const STORAGE_KEY =
  'smarth-terminal-theme';


function resolveInitialTheme():
  TerminalTheme {
  if (
    typeof window ===
    'undefined'
  ) {
    return 'light';
  }

  try {
    const saved =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (
      saved ===
        'light' ||
      saved ===
        'dark'
    ) {
      return saved;
    }
  } catch {
    // La preferencia visual puede funcionar
    // aunque el navegador bloquee storage.
  }

  if (
    typeof window.matchMedia ===
      'function' &&
    window
      .matchMedia(
        '(prefers-color-scheme: dark)'
      )
      .matches
  ) {
    return 'dark';
  }

  return 'light';
}


export function useTerminalTheme() {
  const [
    theme,
    setTheme,
  ] =
    useState<TerminalTheme>(
      resolveInitialTheme
    );

  useEffect(
    () => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          theme
        );
      } catch {
        // Sin persistencia, el tema continúa
        // funcionando durante la vista actual.
      }
    },
    [
      theme,
    ]
  );

  function toggleTheme() {
    setTheme(
      current =>
        current ===
        'dark'
          ? 'light'
          : 'dark'
    );
  }

  return {
    theme,
    toggleTheme,
  };
}
