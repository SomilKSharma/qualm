import { parse } from '@typescript-eslint/typescript-estree';
import { TSESTree } from '@typescript-eslint/utils';
import { QualmParserError } from './types';

export function parseTSX(sourceCode: string, filePath: string): TSESTree.Program {
  try {
    return parse(sourceCode, {
      jsx: true,
      loc: true,
      range: true,
      tokens: false,
      comment: false,
      errorOnUnknownASTType: false,
      filePath,
    }) as TSESTree.Program;
  } catch (err: any) {
    throw new QualmParserError(
      `Failed to parse ${filePath}: ${err.message}`,
      err.lineNumber ?? 0,
      err.column ?? 0,
      filePath
    );
  }
}
