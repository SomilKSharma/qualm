import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from '../types';
import { getElementName, hasAttribute, hasSpreadAttribute } from './utils';

// Pointer and keyboard handlers imply the element is operated by the user.
//
// onFocus and onBlur are deliberately absent: a div with onBlur is almost
// always a container observing focus moving through its subtree, not a control.
// Treating them as interaction was a large false-positive source.
const INTERACTIVE_EVENT_HANDLERS = new Set([
  'onClick', 'onKeyDown', 'onKeyUp', 'onKeyPress',
  'onMouseDown', 'onMouseUp'
]);

export const documentStructureRule: Rule = {
  id: 'document-structure',
  category: 'document_structure',
  severity: 'error',
  meta: {
    description: 'Enforce semantic HTML elements over generic containers with interactive handlers',
    docsUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/button/'
  },
  create(context) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const elementName = getElementName(node);

        if (!elementName) return;
        if (elementName !== 'div' && elementName !== 'span') return;

        const hasInteractiveHandler = node.attributes.some(attr => {
          if (attr.type !== 'JSXAttribute') return false;
          const name = attr.name.type === 'JSXIdentifier' ? attr.name.name : null;
          return name !== null && INTERACTIVE_EVENT_HANDLERS.has(name);
        });

        if (!hasInteractiveHandler) return;

        // An explicit role is the author declaring the semantics.
        if (hasAttribute(node, 'role')) return;

        // Forwarded props may carry the role, and this file cannot see them.
        if (hasSpreadAttribute(node)) return;

        context.report({
          message: `Generic <${elementName}> element has an interactive event handler but no semantic element or explicit role. Assistive technology cannot tell that this is interactive.`,
          fixSuggestion: `Replace <${elementName}> with a semantic element like <button> for click handlers, or add role="button" with tabIndex={0} as a minimum. Prefer semantic HTML over role overrides.`,
          location: context.getLoc(node),
          snippet: context.getSourceCode(node)
        });
      }
    };
  }
};
