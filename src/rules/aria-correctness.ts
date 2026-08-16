import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from '../types';

const BOOLEAN_ARIA_ATTRS = new Set([
  'aria-expanded', 'aria-hidden', 'aria-checked', 'aria-selected',
  'aria-pressed', 'aria-disabled', 'aria-invalid', 'aria-required',
  'aria-multiselectable', 'aria-readonly', 'aria-busy', 'aria-modal',
  'aria-atomic', 'aria-grabbed'
]);

// aria-checked and aria-pressed are tristate; aria-invalid carries a token set.
// Restricting them to true/false would flag valid markup.
const VALID_VALUES: Record<string, Set<string>> = {
  'aria-checked': new Set(['true', 'false', 'mixed']),
  'aria-pressed': new Set(['true', 'false', 'mixed']),
  'aria-invalid': new Set(['true', 'false', 'grammar', 'spelling']),
};

const DEFAULT_BOOLEAN_VALUES = new Set(['true', 'false']);

export const ariaCorrectnessRule: Rule = {
  id: 'aria-correctness',
  category: 'aria_correctness',
  severity: 'error',
  meta: {
    description: 'Enforce valid ARIA attribute values per WAI-ARIA specification',
    docsUrl: 'https://www.w3.org/TR/wai-aria-1.2/#propcharacteristic_value'
  },
  create(context) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        const attrName =
          node.name.type === 'JSXIdentifier' ? node.name.name : null;
        if (!attrName || !attrName.startsWith('aria-')) return;

        if (!BOOLEAN_ARIA_ATTRS.has(attrName)) return;

        // A bare JSX attribute (<span aria-hidden />) is shorthand for {true},
        // which React serialises to aria-hidden="true". That is valid markup —
        // it is not the same as a bare attribute in hand-written HTML.
        if (!node.value) return;

        // Only string literals are statically decidable. An expression
        // (aria-expanded={isOpen}) may evaluate to anything at runtime, and
        // guessing produces false positives.
        if (
          node.value.type !== 'Literal' ||
          typeof node.value.value !== 'string'
        ) {
          return;
        }

        const allowed = VALID_VALUES[attrName] ?? DEFAULT_BOOLEAN_VALUES;
        if (allowed.has(node.value.value)) return;

        const expected = [...allowed].map(v => `"${v}"`).join(', ');
        context.report({
          message: `Invalid value "${node.value.value}" for ${attrName}. Accepted values are ${expected}.`,
          fixSuggestion: `Change to ${attrName}="true", or use an expression like ${attrName}={isOpen} when the value is dynamic.`,
          location: context.getLoc(node),
          snippet: context.getSourceCode(node)
        });
      }
    };
  }
};
