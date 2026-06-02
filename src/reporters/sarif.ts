import { FileAnalysisResult } from '../types';
import { activeRules } from '../rules/index';

export function renderSARIF(results: FileAnalysisResult[]): string {
  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'qualm',
          version: '1.0.0',
          informationUri: 'https://doi.org/10.5281/zenodo.20482307',
          rules: activeRules.map(r => ({
            id: r.id,
            shortDescription: { text: r.meta.description },
            helpUri: r.meta.docsUrl ?? 'https://doi.org/10.5281/zenodo.20482307'
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
              artifactLocation: { uri: result.filePath },
              region: {
                startLine: v.location.line,
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
