import { Parser } from './Parser'
import { Expression } from './evaluate'

/**
 * Define parse rules for language syntax.
 *
 * - Number
 * - Number prefix `+` and `-`
 * - Symbol for variables
 * - String wrapped in double or single quotes, and escape characters
 * - Arithmetic operators: `+`, `-`, `*`, `/`
 * - Assignment: `=`
 * - Comparison: `==`, '!=', `>`, `>=`, `<`, `<=`
 * - Conditions: `if`, `then`, `else`, `condition ? true : false`
 * - Conditional operators: `&&`, `||`, `!`, `and`, `or`, `not`
 * - Group expression with `(` and `)`
 * - Statement separator `;`
 * - Function call with arguments: `f(x,y)`
 * - Function application with arguments: `x->f` and `(x, y)->f`
 * - Anonymous function with arguments: `x => body` and `(x, y) => body`
 *
 * Note that each rule's regular expression must only have a single capture group. The order
 * of rules below determines the order in which they are matched against the source string.
 *
 * The power ("left-binding power") determines the operator precedence, applied in
 * `Parser.nextExpression`.
 *
 * Power values are based on [Douglas Crockford's article](http://crockford.com/javascript/tdop/tdop.html),
 * with adjustments to support additional operators and syntax.
 *
 *   0   non-binding operators like ;
 *  10   assignment operators like =
 *  20   ?
 *  30   || &&
 *  40   relational operators like ===
 *  50   + -
 *  60   * /
 *  70   unary operators like !
 *  80   . [ (
 */

export default [
  {
    match: /^\s*((\d+)?\.?\d+)\s*/,
    name: 'number',
    power: 0,
    prefix(parser: Parser) {
      return parseFloat(this.value)
    }
  },

  // Reserved words must come before symbol

  {
    match: /^\s*(if)\s*/,
    name: 'if',
    power: 20,
    prefix(parser: Parser) {
      const condition = parser.nextExpression(this.power)

      let trueBranch = parser.nextExpression(this.power)
      if (trueBranch==='then') trueBranch = parser.nextExpression(this.power)

      let falseBranch = parser.nextExpression(this.power)
      if (falseBranch==='else') falseBranch = parser.nextExpression(this.power)

      return ['if', condition, trueBranch, falseBranch]
    },
    infix(parser: Parser, left: Expression) {
      return left
    },
  },
  {
    match: /^\s*(or)\s*/,
    name: 'or',
    power: 30,
    prefix() {},
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['||', left, right]
    },
  },
  {
    match: /^\s*(and)\s*/,
    name: 'and',
    power: 30,
    prefix() {},
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['&&', left, right]
    },
  },
  {
    match: /^\s*(not)\s*/,
    name: 'not',
    power: 70,
    prefix(parser: Parser) {
      return ['!', parser.nextExpression(0)]
    },
    infix() {},
  },

  {
    match: /^\s*([a-zA-Z0-9_]+)\s*/,
    name: 'symbol',
    power: 0,
    prefix(parser: Parser) {
      return this.value.trim()
    },
  },

  /**
   * Match quoted strings with escaped characters
   *
   * @see https://stackoverflow.com/questions/249791/regex-for-quoted-string-with-escaping-quotes#answer-10786066
   */
  {
    match: /^\s*\'([^\'\\]*(\\.[^\'\\]*)*)\'/,
    name: 'single-quoted string',
    power: 0,
    prefix(parser: Parser) {
      // Unwrap quotes and unescape
      return ['`', JSON.parse(`"${this.value.slice(1, -1)}"`)]
    }
  },
  {
    match: /^\s*"([^"\\]*(\\.[^"\\]*)*)"/,
    name: 'double-quoted string',
    power: 0,
    prefix(parser: Parser) {
      // Unwrap quotes and unescape
      return ['`', JSON.parse(this.value)] // Unescape
    }
  },

  {
    match: /^\s*;*\s*(\))\s*/, // ), ;)
    name: 'close expression',
    power: 0,
    prefix() {},
    infix(parser: Parser, left: Expression[]) {},
  },
  {
    match: /^\s*(;+)\s*/,
    name: 'end statement',
    power: 0,
    prefix() {},
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(0)
      if (right==null) return left
      return [left, ';', right]
    },
  },

  // Function

  {
    match: /^\s*(\,)\s*/,
    name: 'argument separator',
    power: 5, // Stronger than )
    prefix() {},
    infix(parser: Parser, left: Expression) {
      /**
       * Add right side to argument list
       */
      const right = parser.nextExpression(70) // Stronger than `->`
      let args: Expression = ['args..']

      if (parser.isArgumentList(left)) {
        args = left
      } else if (left!=null) {
        args.push(left)
      }
      if (right!=null) args.push(right)
      return args
    }
  },
  // Function application: x->y === y(x)
  {
    match: /^\s*(->)\s*/, // Must come before `-` or `>`
    name: '->',
    prefix() {},
    power: 60, // Weaker than `=>`
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      if (left==null) return right
      return [right, left]
    },
  },
  // Function definition: x=>, (x)=>, (x, y)=>
  {
    match: /^\s*(=>)\s*/, // Must come before `=` or `>`
    name: 'lambda',
    power: 70,
    prefix() {},
    infix(parser: Parser, left: Expression) {

      if (!parser.isArgumentList(left)) {
        left = ['args..', left]
      }

      const right = parser.nextExpression(0)
      return ['lambda', left, right]
    },
  },

  // Conditional

  {
    match: /^\s*(\?)\s*/,
    name: '?',
    power: 20,
    prefix() {},
    infix(parser: Parser, left: Expression) {
      const trueBranch = parser.nextExpression(this.power)
      const falseBranch = parser.nextExpression(this.power)
      return ['if', left, trueBranch, falseBranch]
    },
  },
  {
    match: /^\s*(:)\s*/,
    name: ':',
    power: 0,
    prefix(parser: Parser) {
      const left = parser.nextExpression(0)
      return left
    },
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(0)
      if (left && left[0] && left[0]==='if') {
        if (right) left.push(right)
        return left
      }
      // TODO: Object properties
      return [left, right]
    },
  },

  {
    match: /^\s*(\|\|)\s*/,
    name: '||',
    power: 30,
    prefix() {},
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['||', left, right]
    },
  },
  {
    match: /^\s*(&&)\s*/,
    name: '&&',
    power: 30,
    prefix() {},
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['&&', left, right]
    },
  },

  // Comparison
  {
    match: /^\s*(==)\s*/, // Must come before `=`
    name: '==',
    power: 40,
    prefix() {},
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['==', left, right]
    },
  },
  {
    match: /^\s*(\!=)\s*/,
    name: '!=',
    power: 40,
    prefix() {},
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['!=', left, right]
    },
  },

  {
    match: /^\s*(\!)\s*/,
    name: '!',
    power: 70,
    prefix(parser: Parser) {
      return ['!', parser.nextExpression(0)]
    },
    infix() {},
  },

  {
    match: /^\s*(<=)\s*/,
    name: '<=',
    power: 40,
    prefix() {},
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['<=', left, right]
    },
  },
  {
    match: /^\s*(<)\s*/,
    name: '<',
    power: 40,
    prefix() {},
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['<', left, right]
    },
  },
  {
    match: /^\s*(>=)\s*/,
    name: '>=',
    power: 40,
    prefix() {},
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['>=', left, right]
    },
  },
  {
    match: /^\s*(>)\s*/,
    name: '>',
    power: 40,
    prefix() {},
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['>', left, right]
    },
  },

  {
    match: /^\s*(=)\s*/,
    name: 'set',
    power: 10,
    prefix() {},
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['set', left, right]
    },
  },

  {
    match: /^\s*([+])\s*/,
    name: '+',
    power: 50,
    prefix(parser: Parser) {
      /**
       * Positive sign binds stronger than / or *
       */
      return parser.nextExpression(70)
    },
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['+', left, right]
    },
  },
  {
    match: /^\s*(-)\s*/,
    name: '-',
    power: 50,
    prefix(parser: Parser) {
      /**
       * Negative sign binds stronger than / or *
       */
      return -parser.nextExpression(70)
    },
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['-', left, right]
    },
  },
  {
    match: /^\s*(\*)\s*/,
    name: '*',
    power: 60,
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['*', left, right]
    },
  },
  {
    match: /^\s*(\/)\s*/,
    name: '/',
    power: 60,
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(this.power)
      return ['/', left, right]
    },
  },

  {
    match: /^\s*(\()\s*/,
    name: 'open expression',
    power: 80,
    prefix(parser: Parser) {
      const expr = parser.nextExpression(0)
      // Parse to right parenthesis
      parser.nextExpression(this.power)
      return expr
    },
    infix(parser: Parser, left: Expression) {
      const right = parser.nextExpression(0)
      // Parse to right parenthesis
      parser.nextExpression(this.power)
      if (left==null) return right
      return [left, right]
    },
  },
]
