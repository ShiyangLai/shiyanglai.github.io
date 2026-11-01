import React from 'react';

// Command output: an HTML string (rendered via dangerouslySetInnerHTML), or a
// React element for interactive output (e.g. the photo viewer from `cat`).
export type Output = string | React.ReactElement;

export interface History {
  id: number;
  date: Date;
  command: string;
  output: Output;
  ps1: string;
}
