import React from 'react';

// macOS-style window buttons, drawn as a tab on the terminal's top-left border
// (mirroring the day/night tab on the right). Desktop-sized screens only.
//   red / yellow: put the terminal away (reopen from the desktop icon)
//   green: toggle full screen <-> window over the research desktop
export const WindowControls: React.FC<{
  fullscreen: boolean;
  onHide: () => void;
  onToggleFullscreen: () => void;
}> = ({ fullscreen, onHide, onToggleFullscreen }) => {
  const dot =
    'w-3 h-3 rounded-full opacity-80 hover:opacity-100 focus:outline-none';
  return (
    <div className="hidden md:flex absolute top-0 left-6 -translate-y-1/2 px-2 space-x-2 items-center bg-light-background dark:bg-dark-background">
      <button
        type="button"
        className={dot}
        style={{ background: '#E0605A' }}
        onClick={onHide}
        title="Close terminal"
        aria-label="Close terminal"
      />
      <button
        type="button"
        className={dot}
        style={{ background: '#E0B13C' }}
        onClick={onHide}
        title="Minimize terminal"
        aria-label="Minimize terminal"
      />
      <button
        type="button"
        className={dot}
        style={{ background: '#56BF6B' }}
        onClick={onToggleFullscreen}
        title={fullscreen ? 'Exit full screen: see my research' : 'Full screen'}
        aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}
      />
    </div>
  );
};

export default WindowControls;
