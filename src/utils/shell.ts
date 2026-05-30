import React from 'react';
import * as bin from './bin';
import { snapshotPrompt, getPromptSnapshot } from './vfs';
import {
  isAgentActive,
  streamAgent,
  exitAgent,
  resetAgent,
} from './agentSession';

export const shell = async (
  command: string,
  setHistory: (value: string) => void,
  clearHistory: () => void,
  setCommand: React.Dispatch<React.SetStateAction<string>>,
  appendEntry: (command: string, output: string, ps1: string) => number,
  updateEntry: (id: number, output: string) => void,
) => {
  // Capture the prompt's directory BEFORE running the command, so the history
  // line shows where the command was typed (a `cd` only affects later lines).
  snapshotPrompt();

  // In agent mode, input is a chat message (not a command) until `exit`.
  if (isAgentActive()) {
    const msg = command.trim();
    const lower = msg.toLowerCase();
    if (msg === '') {
      setHistory('');
    } else if (lower === 'clear') {
      clearHistory();
    } else if (lower === 'exit' || lower === 'quit') {
      exitAgent();
      setHistory("Left agent mode. Type 'help' for commands.");
    } else if (lower === 'reset') {
      resetAgent();
      setHistory('(conversation cleared — starting fresh)');
    } else {
      // Stream the reply token-by-token into a single history entry.
      const ps1 = getPromptSnapshot();
      const id = appendEntry(
        command,
        '<span style="color:#627e99">thinking…</span>',
        ps1,
      );
      setCommand('');
      await streamAgent(command, (html) => updateEntry(id, html));
      return;
    }
    setCommand('');
    return;
  }

  const args = command.split(' ');
  args[0] = args[0].toLowerCase();

  if (args[0] === 'clear') {
    clearHistory();
  } else if (command === '') {
    setHistory('');
  } else if (Object.keys(bin).indexOf(args[0]) === -1) {
    setHistory(
      `shell: command not found: ${args[0]}. Try 'help' to get started.`,
    );
  } else {
    const output = await bin[args[0]](args.slice(1));
    setHistory(output);
  }

  setCommand('');
};
