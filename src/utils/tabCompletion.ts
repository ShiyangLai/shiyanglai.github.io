import * as bin from './bin';
import { complete } from './vfs';

// Longest common prefix of a list of strings.
const commonPrefix = (arr: string[]): string => {
  if (arr.length === 0) return '';
  let prefix = arr[0];
  for (const s of arr) {
    while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
};

export const handleTabCompletion = async (
  command: string,
  setCommand: React.Dispatch<React.SetStateAction<string>>,
) => {
  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();

  // Complete folder / file names for filesystem commands.
  if (parts.length > 1 && ['cd', 'cat', 'ls'].includes(cmd)) {
    const token = parts[parts.length - 1];
    const matches = await complete(token);

    let completion = '';
    if (matches.length === 1) {
      completion = matches[0];
    } else if (matches.length > 1) {
      const prefix = commonPrefix(matches);
      if (prefix.length > token.length) completion = prefix;
    }

    if (completion) {
      parts[parts.length - 1] = completion;
      setCommand(parts.join(' '));
    }
    return;
  }

  // Otherwise complete command names (original behaviour).
  const commands = Object.keys(bin).filter((entry) => entry.startsWith(command));
  if (commands.length === 1) {
    setCommand(commands[0]);
  }
};
