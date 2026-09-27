// @ts-check
/**
 * Puts each item on its own line when there are 2 or more:
 * - parameters of a function declaration
 * - properties of a destructuring pattern (`const { a, b } = …`)
 * @stylistic covers call arguments (function-call-argument-newline) and object literals
 * (object-property-newline), but no published rule covers these two. Pair with
 * @stylistic/function-paren-newline and object-curly-newline (minItems/minProperties: 2) so the
 * brackets break too, and @stylistic/indent to fix indentation after an autofix.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    docs: {
      description: 'Require a line break between the parameters of a function declaration with 2 or more parameters',
    },
    messages: {
      itemOnSameLine: 'Put each item on its own line when there is more than one.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;

    /** @param {any[]} items */
    function checkItems(items) {
      if (items.length < 2) {
        return;
      }
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
          fix: (fixer) => (comma ? fixer.replaceTextRange([comma.range[1], current.range[0]], '\n') : null),
        });
      }
    }

    /** @param {any} node */
    function check(node) {
      checkItems(node.params ?? node.parameters ?? []);
    }

    return {
      ObjectPattern: (/** @type {any} */ node) => checkItems(node.properties),
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
      TSDeclareFunction: check,
      TSEmptyBodyFunctionExpression: check,
      TSMethodSignature: check,
      TSFunctionType: check,
      TSCallSignatureDeclaration: check,
      TSConstructSignatureDeclaration: check,
    };
  },
};
