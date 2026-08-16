import { TSESTree } from '@typescript-eslint/utils';

/**
 * True when the element forwards unknown props (`<input {...props} />`).
 *
 * Design-system primitives spread their props, so the accessible name is
 * supplied by the consumer and is not visible in this file. Rules that assert
 * "this element has no label" must stay silent here, or every UI library's base
 * components get flagged.
 */
export function hasSpreadAttribute(node: TSESTree.JSXOpeningElement): boolean {
  return node.attributes.some(attr => attr.type === 'JSXSpreadAttribute');
}

/** Find a named JSX attribute, ignoring spreads and namespaced names. */
export function findAttribute(
  node: TSESTree.JSXOpeningElement,
  attrName: string
): TSESTree.JSXAttribute | undefined {
  return node.attributes.find(
    (attr): attr is TSESTree.JSXAttribute =>
      attr.type === 'JSXAttribute' &&
      attr.name.type === 'JSXIdentifier' &&
      attr.name.name === attrName
  );
}

export function hasAttribute(
  node: TSESTree.JSXOpeningElement,
  attrName: string
): boolean {
  return findAttribute(node, attrName) !== undefined;
}

/** The literal string value of an attribute, or null when it is dynamic. */
export function getStringAttributeValue(
  node: TSESTree.JSXOpeningElement,
  attrName: string
): string | null {
  const attr = findAttribute(node, attrName);
  if (!attr?.value) return null;
  if (attr.value.type === 'Literal' && typeof attr.value.value === 'string') {
    return attr.value.value;
  }
  return null;
}

export function getElementName(
  node: TSESTree.JSXOpeningElement
): string | null {
  return node.name.type === 'JSXIdentifier' ? node.name.name : null;
}
