import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from '../types';

const BOOLEAN_ARIA_ATTRS = new Set([
  'aria-expanded', 'aria-hidden', 'aria-checked', 'aria-selected',
  'aria-pressed', 'aria-disabled', 'aria-invalid', 'aria-required',
  'aria-multiselectable', 'aria-readonly', 'aria-busy', 'aria-modal',
  'aria-atomic', 'aria-grabbed'
]);

const VALID_BOOLEAN_VALUES = new Set(['true', 'false']);

export const ariaCorrectnessRule: Rule = {
  id: 'aria-correctness',
  category: 'aria_correctness',
  severity: 'error',
  meta: {
    description: 'Enforce valid ARIA attribute values per WAI-ARIA specification'
  },
  create(context) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        const attrName =
          node.name.type === 'JSXIdentifier' ? node.name.name : null;
        if (!attrName || !attrName.startsWith('aria-')) return;

        if (!BOOLEAN_ARIA_ATTRS.has(attrName)) return;

        // Bare boolean attribute (e.g. aria-disabled with no value) is invalid —
        // WAI-ARIA requires an explicit "true" or "false" string.
        if (!node.value) {
          context.report({
            message: `${attrName} used as a bare boolean attribute. WAI-ARIA requires an explicit string value: "true" or "false".`,
            fixSuggestion: `Change to ${attrName}="true" to make the intent explicit and ensure assistive technology reads it correctly.`,
            location: context.getLoc(node),
            snippet: context.getSourceCode(node)
          });
          return;
        }

        if (
          node.value.type === 'Literal' &&
          typeof node.value.value === 'string'
        ) {
          if (!VALID_BOOLEAN_VALUES.has(node.value.value)) {
            context.report({
              message: `Invalid value "${node.value.value}" for ${attrName}. Boolean ARIA attributes only accept "true" or "false".`,
              fixSuggestion: `Change to ${attrName}="true" or ${attrName}="false", or use a dynamic expression like ${attrName}={isOpen ? "true" : "false"}.`,
              location: context.getLoc(node),
              snippet: context.getSourceCode(node)
            });
          }
        }
      }
    };
  }
};
