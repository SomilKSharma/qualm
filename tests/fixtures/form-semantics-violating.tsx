import React from 'react';

// Violating: form controls without associated labels
export const BadForm = () => {
  return (
    <form>
      {/* No id — cannot be associated via htmlFor */}
      <input type="text" placeholder="Name" />
      {/* Has id but no matching label */}
      <input type="email" id="email-input" placeholder="Email" />
      <select id="country-select">
        <option>Select country</option>
      </select>
      {/* textarea with no id */}
      <textarea placeholder="Message" />
    </form>
  );
};
