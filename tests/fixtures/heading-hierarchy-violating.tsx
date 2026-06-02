import React from 'react';

// Violating: h1 followed by h3 (skips h2), and h2 followed by h5 (skips h3, h4)
export const BadHeadings = () => {
  return (
    <main>
      <h1>Page Title</h1>
      <h3>Skipped a level</h3>
      <h2>Back to h2</h2>
      <h5>Skipped three levels</h5>
    </main>
  );
};
