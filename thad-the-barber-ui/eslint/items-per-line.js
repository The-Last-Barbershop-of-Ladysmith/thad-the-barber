// @ts-check
const MIN_ITEMS = 3;
const MIN_PIPE_OPERATORS = 2;

/**
 * Puts each item on its own line when there are 3 or more, and leaves 1–2 items as written:
 * - parameters of a function declaration
 * - properties of a destructuring pattern (`const { a, b, c } = …`)
 * - properties of an object literal
 * - call and `new` arguments, except RxJS `pipe(...)`, which wraps from 2 operators
 * @stylistic's object-property-newline and function-call-argument-newline have no item threshold,
 * so they are off and this rule covers them. Pair with @stylistic/function-paren-newline,
 * object-curly-newline and array-*-newline (minItems/minProperties: 3, consistent) so the brackets follow,
 * and @stylistic/indent to fix indentation after an autofix.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    docs: {
      description: 'Require one item per line from 3 items',
    },
    messages: {
      itemOnSameLine: 'Put each item on its own line when there are 3 or more.',
      pipeOperatorOnSameLine: 'Put each pipe operator on its own line when there are 2 or more.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const newline = sourceCode.text.includes('\r\n') ? '\r\n' : '\n';

    /**
     * @param {any[]} items
     * @param {string} messageId
     */
    function wrap(items, messageId = 'itemOnSameLine') {
      for (let i = 1; i < items.length; i++) {
        const previous = sourceCode.getLastToken(items[i - 1]);
        const current = sourceCode.getFirstToken(items[i]);
        if (!previous || !current || previous.loc.end.line !== current.loc.start.line) {
          continue;
        }
        const comma = sourceCode.getTokenBefore(current);
        context.report({
          node: items[i],
          messageId,
          fix: (fixer) => (comma ? fixer.replaceTextRange([comma.range[1], current.range[0]], newline) : null),
        });
      }
    }

    /** @param {any[]} items */
    function checkItems(items) {
      if (items.length >= MIN_ITEMS) {
        wrap(items);
      }
    }

    /** @param {any} node */
    function checkParams(node) {
      checkItems(node.params ?? node.parameters ?? []);
    }

    /** @param {any} node */
    function isPipe(node) {
      const callee = node.callee;
      const name = callee.type === 'MemberExpression' ? callee.property.name : callee.name;
      return name === 'pipe';
    }

    /** @param {any} node */
    function checkArguments(node) {
      if (isPipe(node) && node.arguments.length >= MIN_PIPE_OPERATORS) {
        wrap(node.arguments, 'pipeOperatorOnSameLine');
        return;
      }
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
