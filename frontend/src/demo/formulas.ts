/** Tiny Excel-style formula evaluator used by demo mode (subset of the backend engine). */

type Value = number | string | boolean

function splitArgs(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let quote: string | null = null
  let cur = ''
  for (const ch of s) {
    if (quote) {
      cur += ch
      if (ch === quote) quote = null
    } else if (ch === '"' || ch === "'") {
      quote = ch
      cur += ch
    } else if (ch === '(') {
      depth++
      cur += ch
    } else if (ch === ')') {
      depth--
      cur += ch
    } else if (ch === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim() || out.length) out.push(cur.trim())
  return out
}

const nums = (vals: Value[]) =>
  vals.flat().map(v => {
    const n = typeof v === 'number' ? v : Number(v)
    if (Number.isNaN(n)) throw new Error(`Expected a number, got ${JSON.stringify(v)}`)
    return n
  })

function callFn(name: string, rawArgs: string[], ctx: Record<string, Value>): Value {
  const args = rawArgs.map(a => evalExpr(a, ctx))
  switch (name) {
    case 'SUM': return nums(args).reduce((a, b) => a + b, 0)
    case 'AVERAGE': { const n = nums(args); return n.reduce((a, b) => a + b, 0) / n.length }
    case 'MIN': return Math.min(...nums(args))
    case 'MAX': return Math.max(...nums(args))
    case 'COUNT': return args.filter(v => typeof v === 'number').length
    case 'MEDIAN': { const n = nums(args).sort((a, b) => a - b); const m = Math.floor(n.length / 2); return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2 }
    case 'ROUND': { const [v, d = 0] = nums(args); const f = 10 ** d; return Math.round(v * f) / f }
    case 'ABS': return Math.abs(nums(args)[0])
    case 'SQRT': return Math.sqrt(nums(args)[0])
    case 'POWER': { const [b, e] = nums(args); return b ** e }
    case 'MOD': { const [a, b] = nums(args); return a % b }
    case 'PI': return Math.PI
    case 'IF': return args[0] ? args[1] : (args[2] ?? false)
    case 'AND': return args.every(Boolean)
    case 'OR': return args.some(Boolean)
    case 'NOT': return !args[0]
    case 'UPPER': return String(args[0]).toUpperCase()
    case 'LOWER': return String(args[0]).toLowerCase()
    case 'TRIM': return String(args[0]).trim()
    case 'LEN': return String(args[0]).length
    case 'LEFT': return String(args[0]).slice(0, Number(args[1] ?? 1))
    case 'RIGHT': return String(args[0]).slice(-Number(args[1] ?? 1))
    case 'CONCAT': return args.map(String).join('')
    case 'TODAY': return new Date().toISOString().slice(0, 10)
    default: throw new Error(`Unknown function: ${name}`)
  }
}

/** Split on a top-level binary operator (lowest precedence first, right-to-left for left associativity). */
function splitTopLevel(expr: string, ops: string[]): [string, string, string] | null {
  let depth = 0
  let quote: string | null = null
  for (let i = expr.length - 1; i > 0; i--) {
    const ch = expr[i]
    if (quote) { if (ch === quote) quote = null; continue }
    if (ch === '"' || ch === "'") { quote = ch; continue }
    if (ch === ')') depth++
    else if (ch === '(') depth--
    else if (depth === 0 && ops.includes(ch)) {
      const prev = expr[i - 1]
      if ((ch === '-' || ch === '+') && /[*/+\-(,]/.test(prev.trim() || '(')) continue // unary sign
      return [expr.slice(0, i), ch, expr.slice(i + 1)]
    }
  }
  return null
}

function evalExpr(raw: string, ctx: Record<string, Value>): Value {
  const expr = raw.trim()
  if (!expr) throw new Error('Empty expression')

  for (const ops of [['+', '-'], ['*', '/']]) {
    const parts = splitTopLevel(expr, ops)
    if (parts) {
      const [l, op, r] = parts
      const a = Number(evalExpr(l, ctx))
      const b = Number(evalExpr(r, ctx))
      if (Number.isNaN(a) || Number.isNaN(b)) throw new Error('Arithmetic needs numeric operands')
      if (op === '/' && b === 0) throw new Error('Division by zero')
      return op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b
    }
  }

  const fn = /^([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*)\)$/.exec(expr)
  if (fn) return callFn(fn[1].toUpperCase(), splitArgs(fn[2]), ctx)
  if (/^\(([\s\S]*)\)$/.test(expr)) return evalExpr(expr.slice(1, -1), ctx)
  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) return expr.slice(1, -1)
  if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr)
  if (/^true$/i.test(expr)) return true
  if (/^false$/i.test(expr)) return false
  const key = expr.toUpperCase()
  if (key in ctx) return ctx[key]
  throw new Error(`Unknown token: '${expr}'`)
}

export function evaluateFormula(expression: string, context: Record<string, Value> = {}) {
  const ctx = Object.fromEntries(Object.entries(context).map(([k, v]) => [k.toUpperCase(), v]))
  try {
    const result = evalExpr(expression.trim().replace(/^=/, ''), ctx)
    const type = typeof result === 'number' ? (Number.isInteger(result) ? 'int' : 'float') : typeof result === 'boolean' ? 'bool' : 'str'
    return { expression, success: true, result, error: null, type }
  } catch (e) {
    return { expression, success: false, result: null, error: (e as Error).message, type: null }
  }
}

const FN_DOCS: Record<string, string> = {
  SUM: 'adds all the numbers together',
  AVERAGE: 'returns the arithmetic mean of the numbers',
  MIN: 'returns the smallest value',
  MAX: 'returns the largest value',
  COUNT: 'counts how many arguments are numbers',
  ROUND: 'rounds a number to the given number of decimal places',
  IF: 'returns the second argument when the condition is true, otherwise the third',
  VLOOKUP: 'looks up a value in the first column of a range and returns a value from another column in the same row',
  UPPER: 'converts text to upper case',
  LOWER: 'converts text to lower case',
  LEN: 'returns the number of characters in a text value',
  CONCAT: 'joins several text values into one',
}

/** Canned explanation (the real backend asks an LLM; demo mode has no AI). */
export function explainFormula(expression: string): string {
  const fn = /^=?\s*([A-Za-z_]+)\s*\(/.exec(expression)?.[1]?.toUpperCase()
  const doc = fn ? FN_DOCS[fn] : undefined
  return doc
    ? `1. The formula starts with ${fn}, which ${doc}.\n2. Its arguments are evaluated first, left to right.\n3. The result is returned to the cell.\n\n(Demo mode: this explanation is generated locally, not by an AI model.)`
    : `This formula combines values and operators. Excel evaluates it from the innermost parentheses outwards, then applies * and / before + and -.\n\n(Demo mode: this explanation is generated locally, not by an AI model.)`
}
