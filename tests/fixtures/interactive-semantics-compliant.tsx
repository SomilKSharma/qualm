import React from 'react';
import { SomeIcon } from './icon';

// Compliant: img with alt, button with aria-label or text
export const GoodInteractive = () => {
  return (
    <div>
      <img src="/logo.png" alt="Company logo" />
      <img src="/banner.jpg" alt="" />
      <button aria-label="Close dialog">
        <SomeIcon />
      </button>
      <button>Submit</button>
    </div>
  );
};
