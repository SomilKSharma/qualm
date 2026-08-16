import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from '../types';

// Matching is against whole class tokens only, never substrings.
//
// An earlier version tested a regex with word boundaries against the raw
// className string. On any utility-CSS codebase that fires constantly on
// fragments: "text-sidebar-foreground" matched /\bsidebar\b/, "@container/main"
// matched /\bmain\b/, and "[--header-height:calc(...)]" matched /\bheader\b/.
// Measured against a 1,497-file React codebase, every landmark finding produced
// that way was a false positive. Whole-token equality is the conservative rule:
// it misses `site-header`, and it does not cry wolf on Tailwind.
const LANDMARK_TOKENS: Record<string, string> = {
  nav: '<nav>',
  navbar: '<nav>',
  navigation: '<nav>',
  header: '<header>',
  masthead: '<header>',
  banner: '<header>',
  footer: '<footer>',
  main: '<main>',
  sidebar: '<aside>',
  aside: '<aside>',
  complementary: '<aside>',
  article: '<article>',
};

function getAttrStringValue(attr: TSESTree.JSXAttribute): string | null {
  if (!attr.value) return null;
  if (attr.value.type === 'Literal' && typeof attr.value.value === 'string') {
    return attr.value.value;
  }
  return null;
}

// A token is only a candidate if it is a plain class name. Utility syntax —
// variants (md:block), arbitrary values ([--header-height:0]), container names
// (@container/main), and CSS custom properties — never names a landmark.
function isPlainClassToken(token: string): boolean {
  return !/[[\]():/@]/.test(token) && !token.includes('--');
}

export const landmarkStructureRule: Rule = {
  id: 'landmark-structure',
  category: 'landmark_structure',
  severity: 'warning',
  meta: {
    description: 'Replace generic containers that serve landmark roles with semantic HTML5 elements',
    docsUrl: 'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/'
  },
  create(context) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null;
        if (name !== 'div' && name !== 'span') return;

        // An explicit role is the author telling us what this is. Believe them.
        const hasRole = node.attributes.some(attr =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'role'
        );
        if (hasRole) return;

        for (const attr of node.attributes) {
          if (attr.type !== 'JSXAttribute') continue;
          const attrName = attr.name.type === 'JSXIdentifier' ? attr.name.name : null;
          // Only className. id values are too often scroll anchors or JS hooks
          // (e.g. id="onboarding-checklist-header") to be reliable.
          if (attrName !== 'className') continue;

          const value = getAttrStringValue(attr);
          if (!value) continue;

          for (const rawToken of value.split(/\s+/)) {
            if (!rawToken || !isPlainClassToken(rawToken)) continue;

            const suggestion = LANDMARK_TOKENS[rawToken.toLowerCase()];
            if (!suggestion) continue;

            context.report({
              message: `<${name} className="${value}"> appears to serve a landmark role. Use the semantic element ${suggestion} instead.`,
              fixSuggestion: `Replace <${name}> with ${suggestion} to provide explicit landmark navigation for assistive technology users.`,
              location: context.getLoc(node),
              snippet: context.getSourceCode(node)
            });
            return;
          }
        }
      }
    };
  }
};
