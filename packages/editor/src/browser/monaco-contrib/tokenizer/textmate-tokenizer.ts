import { INITIAL, StackElement, IGrammar } from 'vscode-textmate';

import { MetadataConsts } from '@opensumi/monaco-editor-core/esm/vs/editor/common/encodedTokenAttributes';
import * as monaco from '@opensumi/monaco-editor-core/esm/vs/editor/editor.api';
/** ******************************************************************************
 * Copyright (C) 2018 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

export class TokenizerState implements monaco.languages.IState {
  constructor(public readonly ruleStack: StackElement) {}

  clone(): monaco.languages.IState {
    return new TokenizerState(this.ruleStack);
  }

  equals(other: monaco.languages.IState): boolean {
    return other instanceof TokenizerState && (other === this || other.ruleStack === this.ruleStack);
  }
}

/**
 * Options for the TextMate tokenizer.
 */
export interface TokenizerOption {
  /**
   * Maximum line length that will be handled by the TextMate tokenizer. If the length of the actual line exceeds this
   * limit, the tokenizer terminates and the tokenization of any subsequent lines might be broken.
   *
   * If the `lineLimit` is not defined, it means, there are no line length limits. Otherwise, it must be a positive
   * integer or an error will be thrown.
   */
  readonly lineLimit?: number;
}

export function createTextmateTokenizer(
  grammar: IGrammar,
  options: TokenizerOption,
): monaco.languages.EncodedTokensProvider {
  if (options.lineLimit !== undefined && (options.lineLimit <= 0 || !Number.isInteger(options.lineLimit))) {
    throw new Error(`The 'lineLimit' must be a positive integer. It was ${options.lineLimit}.`);
  }
  return {
    getInitialState: () => new TokenizerState(INITIAL),
    tokenizeEncoded(line: string, state: TokenizerState) {
      // copied from vscode/src/vs/editor/common/modes/nullMode.ts
      if (options.lineLimit !== undefined && line.length > options.lineLimit) {
        const tokens = new Uint32Array(2);
        tokens[0] = 0;
        tokens[1] =
          ((1 << MetadataConsts.LANGUAGEID_OFFSET) |
            (0 << MetadataConsts.TOKEN_TYPE_OFFSET) |
            (0 << MetadataConsts.FONT_STYLE_OFFSET) |
            (1 << MetadataConsts.FOREGROUND_OFFSET) |
            (2 << MetadataConsts.BACKGROUND_OFFSET)) >>>
          0;
        // Line is too long to be tokenized
        return {
          endState: new TokenizerState(INITIAL),
          tokens,
        };
      }
      const result = grammar.tokenizeLine2(line, state.ruleStack);
      return {
        endState: new TokenizerState(result.ruleStack),
        tokens: result.tokens,
      };
    },
    tokenize(line: string, state: TokenizerState) {
      const result = grammar.tokenizeLine(line, state.ruleStack);
      return {
        endState: new TokenizerState(result.ruleStack),
        tokens: result.tokens.map((t) => ({ ...t, scopes: t.scopes.join('\r\n') })),
      };
    },
  };
}
