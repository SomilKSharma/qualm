import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from '../types';
import { getElementName, hasAttribute, hasSpreadAttribute } from './utils';

/**
 * True when anything in the subtree could render text — literal text, or an
 * expression whose value is unknown at this altitude. Either way the element
 * may already have an accessible name, and the rule must stay quiet.
 */
function subtreeMayCarryText(
  node: TSESTree.JSXElement | TSESTree.JSXFragment
): boolean {
  for (const child of node.children) {
    if (child.type === 'JSXText' && child.value.trim().length > 0) return true;
    if (child.type === 'JSXExpressionContainer') return true;
    if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
      if (subtreeMayCarryText(child)) return true;
    }
  }
  return false;
}

export const interactiveSemanticsRule: Rule = {
  id: 'interactive-semantics',
  category: 'interactive_semantics',
  severity: 'error',
  meta: {
    description: 'Ensure interactive and media elements have accessible names',
    docsUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html'
  },
  create(context) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (getElementName(node) !== 'img') return;

        // alt may arrive through forwarded props.
        if (hasSpreadAttribute(node)) return;
        if (hasAttribute(node, 'alt')) return;

        context.report({
          message: 'Image element is missing an alt attribute. Screen readers cannot describe this image to users.',
          fixSuggestion: 'Add alt="descriptive text" for informative images, or alt="" for decorative images.',
          location: context.getLoc(node),
          snippet: context.getSourceCode(node)
        });
      },

      JSXElement(node: TSESTree.JSXElement) {
        const opening = node.openingElement;
        if (getElementName(opening) !== 'button') return;

        if (hasSpreadAttribute(opening)) return;
        if (hasAttribute(opening, 'aria-label') || hasAttribute(opening, 'aria-labelledby')) {
          return;
        }

        // The accessible name can come from anywhere in the subtree, so the
        // whole subtree has to be inspected. Checking only direct children
        // flagged <button><span>{label}</span></button> — a labelled button —
        // as icon-only.
        if (subtreeMayCarryText(node)) return;

        const containsElement = node.children.some(
          child => child.type === 'JSXElement'
        );

        if (containsElement) {
          context.report({
            message: 'Button appears to contain only icon components without visible text. Add aria-label to describe the button action.',
            fixSuggestion: 'Add aria-label="Description of action" to the button element.',
            location: context.getLoc(opening),
            snippet: context.getSourceCode(opening)
          });
        }
      }
    };
  }
};
