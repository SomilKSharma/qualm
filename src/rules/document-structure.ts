import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from '../types';

const INTERACTIVE_EVENT_HANDLERS = new Set([
  'onClick', 'onKeyDown', 'onKeyUp', 'onKeyPress',
  'onFocus', 'onBlur', 'onMouseDown', 'onMouseUp'
]);

export const documentStructureRule: Rule = {
  id: 'document-structure',
  category: 'document_structure',
  severity: 'error',
  meta: {
    description: 'Enforce semantic HTML elements over generic containers with interactive handlers',
    docsUrl: 'https://doi.org/10.5281/zenodo.20482307'
  },
  create(context) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const elementName =
          node.name.type === 'JSXIdentifier' ? node.name.name : null;

        if (!elementName) return;
        if (elementName !== 'div' && elementName !== 'span') return;

        const attrs = node.attributes;

        const hasInteractiveHandler = attrs.some(attr => {
          if (attr.type !== 'JSXAttribute') return false;
          const name = attr.name.type === 'JSXIdentifier' ? attr.name.name : null;
          return name !== null && INTERACTIVE_EVENT_HANDLERS.has(name);
        });

        if (!hasInteractiveHandler) return;

        const hasRoleAttr = attrs.some(attr => {
          if (attr.type !== 'JSXAttribute') return false;
          const name = attr.name.type === 'JSXIdentifier' ? attr.name.name : null;
          return name === 'role';
        });

        if (hasRoleAttr) return;

        context.report({
          message: `Generic <${elementName}> element has interactive event handler without semantic element or explicit role. This is the dominant AI-generated code quality failure mode identified in Sharma (2026).`,
          fixSuggestion: `Replace <${elementName}> with a semantic element like <button> for click handlers, or add role="button" with tabIndex={0} as a minimum. Prefer semantic HTML over role overrides.`,
          location: context.getLoc(node),
          snippet: context.getSourceCode(node)
        });
      }
    };
  }
};
