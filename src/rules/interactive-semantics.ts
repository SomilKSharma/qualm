import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from '../types';

export const interactiveSemanticsRule: Rule = {
  id: 'interactive-semantics',
  category: 'interactive_semantics',
  severity: 'error',
  meta: {
    description: 'Ensure interactive and media elements have accessible names'
  },
  create(context) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null;
        if (!name) return;

        if (name === 'img') {
          const hasAlt = node.attributes.some(attr => {
            if (attr.type !== 'JSXAttribute') return false;
            return attr.name.type === 'JSXIdentifier' && attr.name.name === 'alt';
          });

          if (!hasAlt) {
            context.report({
              message: 'Image element is missing an alt attribute. Screen readers cannot describe this image to users.',
              fixSuggestion: 'Add alt="descriptive text" for informative images, or alt="" for decorative images.',
              location: context.getLoc(node),
              snippet: context.getSourceCode(node)
            });
          }
        }
      },

      JSXElement(node: TSESTree.JSXElement) {
        const opening = node.openingElement;
        const name = opening.name.type === 'JSXIdentifier' ? opening.name.name : null;
        if (name !== 'button') return;

        const hasAriaLabel = opening.attributes.some(attr => {
          if (attr.type !== 'JSXAttribute') return false;
          const attrName = attr.name.type === 'JSXIdentifier' ? attr.name.name : null;
          return attrName === 'aria-label' || attrName === 'aria-labelledby';
        });

        if (hasAriaLabel) return;

        const hasTextChild = node.children.some(
          child => child.type === 'JSXText' && child.value.trim().length > 0
        );

        if (hasTextChild) return;

        const hasOnlyNonTextChildren =
          node.children.length > 0 &&
          node.children.every(child =>
            child.type === 'JSXElement' ||
            child.type === 'JSXExpressionContainer' ||
            (child.type === 'JSXText' && child.value.trim() === '')
          );

        if (hasOnlyNonTextChildren) {
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
