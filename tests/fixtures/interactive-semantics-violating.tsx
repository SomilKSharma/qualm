import React from 'react';
import { SomeIcon } from './icon';

// Violating: img without alt, button with only icon child and no aria-label
export const BadInteractive = () => {
  return (
    <div>
      <img src="/logo.png" />
      <button>
        <SomeIcon />
      </button>
      <img src="/banner.jpg" />
    </div>
  );
};
