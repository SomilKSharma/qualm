import React from 'react';

// Compliant: form controls with proper labels
export const GoodForm = () => {
  return (
    <form>
      <label htmlFor="name-input">Name</label>
      <input type="text" id="name-input" />

      <label htmlFor="email-input">Email</label>
      <input type="email" id="email-input" />

      <label htmlFor="country-select">Country</label>
      <select id="country-select">
        <option>Select country</option>
      </select>

      {/* aria-label is also acceptable */}
      <textarea aria-label="Message" placeholder="Message" />
    </form>
  );
};
