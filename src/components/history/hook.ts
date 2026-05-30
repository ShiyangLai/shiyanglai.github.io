import React from 'react';
import { History } from './interface';
import { getPromptSnapshot } from '../../utils/vfs';

export const useHistory = (defaultValue: Array<History>) => {
  const [history, setHistory] = React.useState<Array<History>>(defaultValue);
  const [command, setCommand] = React.useState<string>('');
  const [lastCommandIndex, setLastCommandIndex] = React.useState<number>(0);
  const idRef = React.useRef<number>(defaultValue.length);

  // Append an entry and return its id (so streaming output can update it later).
  const append = (cmd: string, output: string, ps1: string): number => {
    const id = idRef.current++;
    setHistory((prev) => [
      ...prev,
      { id, date: new Date(), command: cmd, output, ps1 },
    ]);
    return id;
  };

  return {
    history,
    command,
    lastCommandIndex,
    setHistory: (value: string) => append(command, value, getPromptSnapshot()),
    appendEntry: (cmd: string, output: string, ps1: string) =>
      append(cmd, output, ps1),
    updateEntry: (id: number, output: string) =>
      setHistory((prev) =>
        prev.map((e) => (e.id === id ? { ...e, output } : e)),
      ),
    setCommand,
    setLastCommandIndex,
    clearHistory: () => setHistory([]),
  };
};
