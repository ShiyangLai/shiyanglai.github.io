import React from 'react';
import * as bin from './bin';
import { snapshotPrompt } from './vfs';
import {
  isAgentActive,
  isSecret,
  streamAgent,
  exitAgent,
  resetAgent,
  thinkingHtml,
  AGENT_TURN,
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
    const sec = isSecret(); // capture before exit/reset can clear it
    const msg = command.trim();
    const lower = msg.toLowerCase();
    if (msg === '') {
      setHistory('');
    } else if (lower === 'clear' || msg === '清空') {
      clearHistory();
    } else if (lower === 'exit' || lower === 'quit' || msg === '退出') {
      exitAgent();
      setHistory(
        sec
          ? "已退出秘密模式。输入 'help' 查看命令。"
          : "Left agent mode. Type 'help' for commands.",
      );
    } else if (lower === 'reset' || msg === '重置') {
      resetAgent();
      setHistory(
        sec ? '（对话已清空，重新开始）' : '(conversation cleared — starting fresh)',
      );
    } else {
      // Stream the reply into a chat-styled turn (you › … / shiyang-ai › …).
      const id = appendEntry(command, thinkingHtml(), AGENT_TURN);
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
