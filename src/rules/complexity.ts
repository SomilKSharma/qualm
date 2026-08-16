import { TSESTree } from '@typescript-eslint/utils';
import { simpleTraverse } from '@typescript-eslint/typescript-estree';
import { ComplexityMetrics } from '../types';

const CYCLOMATIC_NODES = new Set([
  'IfStatement', 'ConditionalExpression', 'SwitchCase',
  'ForStatement', 'ForInStatement', 'ForOfStatement',
  'WhileStatement', 'DoWhileStatement', 'LogicalExpression',
  'CatchClause'
]);

// Recursively compute max JSX nesting depth
function jsxDepth(node: TSESTree.Node): number {
  if (node.type === 'JSXElement') {
    const childDepths = node.children.map(c => jsxDepth(c));
    return 1 + (childDepths.length > 0 ? Math.max(...childDepths) : 0);
  }
  let max = 0;
  for (const key of Object.keys(node) as (keyof typeof node)[]) {
    const child = node[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            const d = jsxDepth(item as TSESTree.Node);
            if (d > max) max = d;
          }
        }
      } else if ('type' in child) {
        const d = jsxDepth(child as TSESTree.Node);
        if (d > max) max = d;
      }
    }
  }
  return max;
}

export function calculateComplexityMetrics(
  ast: TSESTree.Program,
  sourceCode: string
): ComplexityMetrics {
  let cyclomaticComplexity = 1;
  let cognitiveComplexity = 0;
  let nodeCount = 0;
  let propsCount = 0;

  // simpleTraverse is enter-only, so nesting is tracked with an explicit stack
  // of the control-flow nodes currently open around the node being visited.
  const nestingStack: string[] = [];

  simpleTraverse(ast, {
    enter(node) {
      nodeCount++;

      if (CYCLOMATIC_NODES.has(node.type)) {
        cyclomaticComplexity++;
      }

      // Cognitive complexity: add (1 + current nesting level) for control flow
      if (
        node.type === 'IfStatement' ||
        node.type === 'ForStatement' ||
        node.type === 'WhileStatement' ||
        node.type === 'ForOfStatement' ||
        node.type === 'ForInStatement' ||
        node.type === 'DoWhileStatement'
      ) {
        cognitiveComplexity += 1 + nestingStack.length;
        nestingStack.push(node.type);
      }

      if (node.type === 'JSXAttribute') {
        propsCount++;
      }
    }
  });

  const linesOfCode = sourceCode.split('\n').length;

  // Compute max JSX nesting depth via recursive walk
  const maxJsxNestingDepth = jsxDepth(ast);
  const propDrillingDepth = Math.max(0, maxJsxNestingDepth - 3);

  return {
    cyclomaticComplexity,
    cognitiveComplexity,
    maxJsxNestingDepth,
    linesOfCode,
    nodeCount,
    propsCount,
    propDrillingDepth
  };
}
