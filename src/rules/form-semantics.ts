import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from '../types';
import {
  getElementName,
  getStringAttributeValue,
  hasAttribute,
  hasSpreadAttribute
} from './utils';

const FORM_CONTROLS = new Set(['input', 'select', 'textarea']);

// Input types that carry their own accessible name, or none at all.
// A submit button is named by its value; a hidden input is not exposed.
const EXEMPT_INPUT_TYPES = new Set(['hidden', 'submit', 'reset', 'button']);

export const formSemanticsRule: Rule = {
  id: 'form-semantics',
  category: 'form_semantics',
  severity: 'error',
  meta: {
    description: 'Ensure form controls have associated label elements',
    docsUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html'
  },
  create(context) {
    const labelHtmlFors = new Set<string>();
    const inputsWithIds: { id: string; node: TSESTree.JSXOpeningElement }[] = [];
    // Ranges of every <label> element in the file, used to detect implicit
    // labelling (<label><input /></label>). JSXElement fires before the
    // descendant's JSXOpeningElement, so a wrapping label is always recorded
    // before the control it wraps is examined.
    const labelElementRanges: { start: number; end: number }[] = [];

    return {
      JSXElement(node: TSESTree.JSXElement) {
        const openingName = getElementName(node.openingElement);
        if (openingName === 'label' && node.range) {
          labelElementRanges.push({ start: node.range[0], end: node.range[1] });
        }
      },

      JSXAttribute(node: TSESTree.JSXAttribute) {
        const attrName =
          node.name.type === 'JSXIdentifier' ? node.name.name : null;
        if (attrName !== 'htmlFor') return;

        if (
          node.value?.type === 'Literal' &&
          typeof node.value.value === 'string'
        ) {
          labelHtmlFors.add(node.value.value);
        }
      },

      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const name = getElementName(node);
        if (!name || !FORM_CONTROLS.has(name)) return;

        // Forwarded props may carry aria-label, id, or the label association
        // itself. A design-system <Input {...props} /> cannot be judged here.
        if (hasSpreadAttribute(node)) return;

        if (hasAttribute(node, 'aria-label') || hasAttribute(node, 'aria-labelledby')) {
          return;
        }

        if (name === 'input') {
          const type = getStringAttributeValue(node, 'type');
          if (type && EXEMPT_INPUT_TYPES.has(type)) return;
        }

        // Implicit label: the control sits inside a <label> element.
        const isImplicitlyLabelled = node.range
          ? labelElementRanges.some(
              l => node.range![0] > l.start && node.range![0] < l.end
            )
          : false;
        if (isImplicitlyLabelled) return;

        const idValue = getStringAttributeValue(node, 'id');

        if (idValue) {
          // Deferred: the matching <label htmlFor> may appear later in the file.
          inputsWithIds.push({ id: idValue, node });
        } else if (!hasAttribute(node, 'id')) {
          context.report({
            message: `<${name}> has no associated label. Add a <label htmlFor="..."> or aria-label attribute.`,
            fixSuggestion: `Add an id to the <${name}> and a matching <label htmlFor="id"> element, or use aria-label="Description".`,
            location: context.getLoc(node),
            snippet: context.getSourceCode(node)
          });
        }
        // A dynamic id ({id}) is left alone — the association cannot be checked.
      },

      'Program:exit'() {
        for (const { id, node } of inputsWithIds) {
          if (!labelHtmlFors.has(id)) {
            const name = getElementName(node) ?? 'input';
            context.report({
              message: `<${name} id="${id}"> has no associated <label htmlFor="${id}">. Form controls must be programmatically associated with labels.`,
              fixSuggestion: `Add <label htmlFor="${id}">Label text</label> before or after the form control.`,
              location: context.getLoc(node),
              snippet: context.getSourceCode(node)
            });
          }
        }
      }
    };
  }
};
