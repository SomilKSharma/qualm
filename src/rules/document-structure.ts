import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from '../types';
import { findAttribute, getElementName, hasAttribute, hasSpreadAttribute } from './utils';

// Pointer and keyboard handlers imply the element is operated by the user.
//
// onFocus and onBlur are deliberately absent: a div with onBlur is almost
// always a container observing focus moving through its subtree, not a control.
// Treating them as interaction was a large false-positive source.
const INTERACTIVE_EVENT_HANDLERS = new Set([
  'onClick', 'onKeyDown', 'onKeyUp', 'onKeyPress',
  'onMouseDown', 'onMouseUp'
]);

// Calls that suppress an event rather than respond to one.
const INERT_EVENT_METHODS = new Set(['stopPropagation', 'preventDefault']);

function isInertEventCall(node: TSESTree.Node): boolean {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    INERT_EVENT_METHODS.has(node.callee.property.name)
  );
}

/**
 * True when a handler does nothing but stop an event travelling.
 *
 * `onClick={(e) => e.stopPropagation()}` is event plumbing — it stops a click
 * reaching an ancestor. It affords the user nothing, so demanding a role and a
 * keyboard path for it is noise. Real examples: modal inner panels and
 * toolbars that guard against a backdrop's close handler.
 */
function isInertHandler(attr: TSESTree.JSXAttribute): boolean {
  const value = attr.value;
  if (!value || value.type !== 'JSXExpressionContainer') return false;

  const fn = value.expression;
  if (
    fn.type !== 'ArrowFunctionExpression' &&
    fn.type !== 'FunctionExpression'
  ) {
    return false;
  }

  // Concise arrow body: (e) => e.stopPropagation()
  if (fn.body.type !== 'BlockStatement') return isInertEventCall(fn.body);

  // Block body: every statement must be an inert call, and there must be one.
  if (fn.body.body.length === 0) return false;
  return fn.body.body.every(
    stmt =>
      stmt.type === 'ExpressionStatement' && isInertEventCall(stmt.expression)
  );
}

/**
 * contentEditable elements are focusable and operable by construction, so the
 * premise of this rule — that the control cannot be reached — does not hold.
 * An explicit `contentEditable={false}` is not editable and stays in scope.
 */
function isContentEditable(node: TSESTree.JSXOpeningElement): boolean {
  const attr = findAttribute(node, 'contentEditable');
  if (!attr) return false;
  if (attr.value?.type === 'Literal' && attr.value.value === false) return false;
  if (
    attr.value?.type === 'JSXExpressionContainer' &&
    attr.value.expression.type === 'Literal' &&
    attr.value.expression.value === false
  ) {
    return false;
  }
  return true;
}

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

        // Only handlers that actually afford an interaction count. An element
        // whose every handler merely suppresses an event is not a control.
        const hasInteractiveHandler = node.attributes.some(attr => {
          if (attr.type !== 'JSXAttribute') return false;
          const name = attr.name.type === 'JSXIdentifier' ? attr.name.name : null;
          if (name === null || !INTERACTIVE_EVENT_HANDLERS.has(name)) return false;
          return !isInertHandler(attr);
        });

        if (!hasInteractiveHandler) return;

        if (isContentEditable(node)) return;

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
