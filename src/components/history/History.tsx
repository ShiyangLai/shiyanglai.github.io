import React from 'react';
import { History as HistoryInterface } from './interface';
import { Ps1 } from '../Ps1';
import { VisitorMap, MAP_TOKEN } from '../VisitorMap';

export const History: React.FC<{ history: Array<HistoryInterface> }> = ({
  history,
}) => {
  return (
    <>
      {history.map((entry: HistoryInterface, index: number) => (
        <div key={entry.command + index}>
          <div className="flex flex-row space-x-2">
            <div className="flex-shrink">
              <Ps1 path={entry.ps1} />
            </div>

            <div className="flex-grow">{entry.command}</div>
          </div>

          {entry.output === MAP_TOKEN ? (
            <VisitorMap />
          ) : (
            <p
              className="whitespace-pre-wrap mb-2"
              style={{ lineHeight: 'normal' }}
              dangerouslySetInnerHTML={{ __html: entry.output }}
            />
          )}
        </div>
      ))}
    </>
  );
};

export default History;
