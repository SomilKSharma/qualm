import React from 'react';

// Violating: div and span with interactive handlers and no role
export const BadComponent = () => {
  const handleClick = () => {};

  return (
    <div>
      <div onClick={handleClick}>Click me</div>
      <span onClick={handleClick}>Also clickable</span>
      <div onKeyDown={handleClick}>Key handler</div>
    </div>
  );
};
