import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from '../types';

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

export const headingHierarchyRule: Rule = {
  id: 'heading-hierarchy',
  category: 'heading_hierarchy',
  severity: 'warning',
  meta: {
    description: 'Enforce sequential heading levels without skipping ranks'
  },
  create(context) {
    const headings: { level: number; node: TSESTree.JSXOpeningElement }[] = [];

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null;
        if (!name || !HEADING_TAGS.has(name)) return;

        const level = parseInt(name[1], 10);
        headings.push({ level, node });

        if (headings.length < 2) return;

        const prev = headings[headings.length - 2];
        const curr = headings[headings.length - 1];

        if (curr.level > prev.level + 1) {
          context.report({
            message: `Heading level skipped: <h${prev.level}> followed by <h${curr.level}>. Screen readers rely on sequential heading structure for navigation.`,
            fixSuggestion: `Change <h${curr.level}> to <h${prev.level + 1}> to maintain sequential hierarchy.`,
            location: context.getLoc(node),
            snippet: context.getSourceCode(node)
          });
        }
      }
    };
  }
};
