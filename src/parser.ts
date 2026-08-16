import { parse } from '@typescript-eslint/typescript-estree';
import { TSESTree } from '@typescript-eslint/utils';
import { QualmParserError } from './types';

/** A Program plus the comment list, which qualm uses for suppression directives. */
export type ParsedProgram = TSESTree.Program & {
  comments?: TSESTree.Comment[];
};

export function parseTSX(sourceCode: string, filePath: string): ParsedProgram {
  try {
    return parse(sourceCode, {
      jsx: true,
      loc: true,
      range: true,
      tokens: false,
      // Comments carry qualm-disable directives, so they must be retained.
      comment: true,
      errorOnUnknownASTType: false,
      filePath,
    }) as ParsedProgram;
  } catch (err: any) {
    throw new QualmParserError(
      `Failed to parse ${filePath}: ${err.message}`,
      err.lineNumber ?? 0,
      err.column ?? 0,
      filePath
    );
  }
}
