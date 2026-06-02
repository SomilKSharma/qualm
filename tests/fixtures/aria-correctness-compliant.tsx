import React from 'react';

// Compliant: valid boolean ARIA attribute values — no form controls to avoid form-semantics noise
export const GoodAria = ({ isOpen, isHidden }: { isOpen: boolean; isHidden: boolean }) => {
  return (
    <div>
      <button aria-expanded="true">Toggle A</button>
      <button aria-expanded="false">Toggle B</button>
      <div aria-hidden="false">Visible content</div>
      <button aria-expanded={isOpen ? "true" : "false"}>Dynamic</button>
      <div aria-hidden={isHidden ? "true" : "false"}>Dynamic hidden</div>
      <button aria-pressed="true">Pressed</button>
    </div>
  );
};
