import React from 'react';

// Violating: invalid boolean ARIA attribute values
export const BadAria = () => {
  return (
    <div>
      <button aria-expanded="yes">Toggle</button>
      <div aria-hidden="1">Hidden content</div>
      <input aria-required="required" />
      <div aria-pressed="on">Button</div>
    </div>
  );
};
