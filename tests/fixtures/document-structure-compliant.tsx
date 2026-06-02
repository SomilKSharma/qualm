import React from 'react';

// Compliant: semantic elements or explicit role attributes
export const GoodComponent = () => {
  const handleClick = () => {};

  return (
    <div>
      <button onClick={handleClick}>Click me</button>
      <div onClick={handleClick} role="button" tabIndex={0}>Role button</div>
      <a href="/page" onClick={handleClick}>Link</a>
    </div>
  );
};
