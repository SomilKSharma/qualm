import { relative, sep, isAbsolute } from 'path';
import { FileAnalysisResult } from '../types';
import { activeRules } from '../rules/index';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json') as { version: string };

/**
 * GitHub Code Scanning resolves artifact URIs against the repository root, so
 * an absolute filesystem path leaves every annotation unattached to a file.
 * Paths are emitted repo-relative with forward slashes on every platform.
 */
function toArtifactUri(filePath: string, baseDir: string): string {
  if (!isAbsolute(filePath)) return filePath.split(sep).join('/');
  const rel = relative(baseDir, filePath);
  if (!rel || rel.startsWith('..')) return filePath.split(sep).join('/');
  return rel.split(sep).join('/');
}

export function renderSARIF(
  results: FileAnalysisResult[],
  baseDir: string = process.cwd()
): string {
  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'qualm',
          version: pkg.version,
          informationUri: 'https://github.com/SomilKSharma/qualm',
          rules: activeRules.map(r => ({
            id: r.id,
            shortDescription: { text: r.meta.description },
            helpUri: r.meta.docsUrl ?? 'https://github.com/SomilKSharma/qualm#rules'
          }))
        }
      },
      results: results.flatMap(result =>
        result.violations.map(v => ({
          ruleId: v.ruleId,
          level: v.severity === 'error' ? 'error' : v.severity === 'warning' ? 'warning' : 'note',
          message: { text: v.message },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: toArtifactUri(result.filePath, baseDir) },
              region: {
                startLine: v.location.line,
                // SARIF columns are 1-based; the AST reports 0-based.
                startColumn: v.location.column + 1
              }
            }
          }]
        }))
      )
    }]
  };

  return JSON.stringify(sarif, null, 2);
}
