import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from '../types';

const FORM_CONTROLS = new Set(['input', 'select', 'textarea']);

// Walk up the parent chain to detect implicit label wrapping.
// simpleTraverse doesn't set parent pointers, so we track the JSXElement
// ancestor stack ourselves via JSXElement enter/exit using a set of range starts.
function isInsideLabelElement(node: TSESTree.JSXOpeningElement, labelRanges: Set<number>): boolean {
  // We stored range[0] of every open <label> JSXElement that is currently open
  // on the stack. If any open label's range contains this node's range, it's wrapped.
  // Since simpleTraverse is single-pass enter-only in our analyser context, we
  // instead record all label JSXElement ranges and check containment by range.
  for (const labelStart of labelRanges) {
    if (node.range && node.range[0] > labelStart) {
      return true;
    }
  }
  return false;
}

export const formSemanticsRule: Rule = {
  id: 'form-semantics',
  category: 'form_semantics',
  severity: 'error',
  meta: {
    description: 'Ensure form controls have associated label elements'
  },
  create(context) {
    const labelHtmlFors = new Set<string>();
    const inputsWithIds: { id: string; node: TSESTree.JSXOpeningElement }[] = [];
    // Track range[0] of every <label> JSXElement opening tag seen in the file.
    // Used to detect implicit label wrapping (input inside <label>...</label>).
    const labelElementRanges: { start: number; end: number }[] = [];

    return {
      JSXElement(node: TSESTree.JSXElement) {
        const openingName = node.openingElement.name.type === 'JSXIdentifier'
          ? node.openingElement.name.name : null;
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
        const name =
          node.name.type === 'JSXIdentifier' ? node.name.name : null;
        if (!name || !FORM_CONTROLS.has(name)) return;

        const hasAriaLabel = node.attributes.some(attr => {
          if (attr.type !== 'JSXAttribute') return false;
          const n = attr.name.type === 'JSXIdentifier' ? attr.name.name : null;
          return n === 'aria-label' || n === 'aria-labelledby';
        });

        if (hasAriaLabel) return;

        // Implicit label: input is wrapped inside a <label> element
        const isImplicitlyLabelled = node.range
          ? labelElementRanges.some(l => node.range![0] > l.start && node.range![0] < l.end)
          : false;
        if (isImplicitlyLabelled) return;

        const idAttr = node.attributes.find(attr => {
          if (attr.type !== 'JSXAttribute') return false;
          return attr.name.type === 'JSXIdentifier' && attr.name.name === 'id';
        }) as TSESTree.JSXAttribute | undefined;

        const idValue =
          idAttr?.value?.type === 'Literal' &&
          typeof idAttr.value.value === 'string'
            ? idAttr.value.value
            : null;

        if (idValue) {
          inputsWithIds.push({ id: idValue, node });
        } else {
          context.report({
            message: `<${name}> has no associated label. Add a <label htmlFor="..."> or aria-label attribute.`,
            fixSuggestion: `Add an id to the <${name}> and a matching <label htmlFor="id"> element, or use aria-label="Description".`,
            location: context.getLoc(node),
            snippet: context.getSourceCode(node)
          });
        }
      },

      'Program:exit'() {
        for (const { id, node } of inputsWithIds) {
          if (!labelHtmlFors.has(id)) {
            const name =
              node.name.type === 'JSXIdentifier' ? node.name.name : 'input';
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
