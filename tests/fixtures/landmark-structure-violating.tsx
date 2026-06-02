import React from 'react';

// Violating: divs with className that indicate landmark roles
export const BadLandmarks = () => {
  return (
    <div>
      <div className="navbar">Navigation here</div>
      <div className="main-content">Main content</div>
      <div className="sidebar">Sidebar content</div>
      <div className="footer">Footer content</div>
    </div>
  );
};
