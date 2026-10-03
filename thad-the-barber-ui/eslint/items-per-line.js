// @ts-check
const MIN_ITEMS = 3;
const MAX_LINE_LENGTH = 120;

/**
 * Puts each item on its own line when there are 3 or more, and keeps 1–2 items on one line:
 * - parameters of a function declaration
 * - properties of a destructuring pattern (`const { a, b, c } = …`)
 * - properties of an object literal
 * - call and `new` arguments
 * @stylistic's object-property-newline and function-call-argument-newline have no item threshold,
 * so they are off and this rule covers them. Pair with @stylistic/function-paren-newline,
 * object-curly-newline and array-*-newline (minItems/minProperties: 3) so the brackets follow,
 * and @stylistic/indent to fix indentation after an autofix.
 * A short list stays wrapped when an item spans lines, a comment sits between items, or joining
 * would pass the max-len limit.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    docs: {
      description: 'Require one item per line from 3 items, and one line for 1–2 items',
    },
    messages: {
      itemOnSameLine: 'Put each item on its own line when there are 3 or more.',
      itemsOnSeparateLines: 'Keep 1–2 items on one line.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const newline = sourceCode.text.includes('\r\n') ? '\r\n' : '\n';

    /** @param {any[]} items */
    function wrap(items) {
      for (let i = 1; i < items.length; i++) {
        const previous = sourceCode.getLastToken(items[i - 1]);
        const current = sourceCode.getFirstToken(items[i]);
        if (!previous || !current || previous.loc.end.line !== current.loc.start.line) {
          continue;
        }
        const comma = sourceCode.getTokenBefore(current);
        context.report({
          node: items[i],
          messageId: 'itemOnSameLine',
          fix: (fixer) => (comma ? fixer.replaceTextRange([comma.range[1], current.range[0]], newline) : null),
        });
      }
    }

    /** @param {any[]} items */
    function join(items) {
      const first = items[0];
      const last = items[items.length - 1];
      if (first.loc.start.line === last.loc.end.line) {
        return;
      }
      if (items.some((item) => item.loc.start.line !== item.loc.end.line)) {
        return;
      }
      const opener = sourceCode.getTokenBefore(first);
      const afterLast = sourceCode.getTokenAfter(last);
      const closer = afterLast && afterLast.value === ',' ? sourceCode.getTokenAfter(afterLast) : afterLast;
      if (!opener || !closer) {
        return;
      }
      const inner = sourceCode.getTokensBetween(opener, closer, { includeComments: true });
      if (inner.some((token) => token.type === 'Block' || token.type === 'Line')) {
        return;
      }
      const lines = sourceCode.getLines();
      const joined = `${lines[opener.loc.start.line - 1].slice(0, opener.loc.end.column)}${
        items.map((item) => sourceCode.getText(item)).join(', ')}${
        lines[closer.loc.start.line - 1].slice(closer.loc.start.column)}`;
      if (joined.length > MAX_LINE_LENGTH) {
        return;
      }
      context.report({
        node: first,
        messageId: 'itemsOnSeparateLines',
        fix: (fixer) => items.slice(1).map((item, i) => {
          const comma = sourceCode.getTokenAfter(items[i]);
          return fixer.replaceTextRange([comma ? comma.range[1] : items[i].range[1], item.range[0]], ' ');
        }),
      });
    }

    /** @param {any[]} items */
    function checkItems(items) {
      if (items.length >= MIN_ITEMS) {
        wrap(items);
      } else if (items.length > 1) {
        join(items);
      }
    }

    /** @param {any} node */
    function checkParams(node) {
      checkItems(node.params ?? node.parameters ?? []);
    }

    /** @param {any} node */
    function checkArguments(node) {
      checkItems(node.arguments);
    }

    return {
      ObjectPattern: (/** @type {any} */ node) => checkItems(node.properties),
      ObjectExpression: (/** @type {any} */ node) => checkItems(node.properties),
      CallExpression: checkArguments,
      NewExpression: checkArguments,
      FunctionDeclaration: checkParams,
      FunctionExpression: checkParams,
      ArrowFunctionExpression: checkParams,
      TSDeclareFunction: checkParams,
      TSEmptyBodyFunctionExpression: checkParams,
      TSMethodSignature: checkParams,
      TSFunctionType: checkParams,
      TSCallSignatureDeclaration: checkParams,
      TSConstructSignatureDeclaration: checkParams,
    };
  },
};
