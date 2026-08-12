// Tiny, dependency-free arithmetic expression evaluator used by the !식! calc feature.
// Deliberately avoids eval()/Function() - only + - * / ( ) and decimal numbers are supported.

function inkEvaluateExpression(expr) {
  let i = 0;

  function peek() {
    return expr[i];
  }

  function isDigit(c) {
    return c >= '0' && c <= '9';
  }

  function skipWs() {
    while (expr[i] === ' ' || expr[i] === '\t') i++;
  }

  function parseNumber() {
    skipWs();
    const start = i;
    let hasDigits = false;
    while (i < expr.length && isDigit(expr[i])) {
      i++;
      hasDigits = true;
    }
    if (expr[i] === '.') {
      i++;
      while (i < expr.length && isDigit(expr[i])) {
        i++;
        hasDigits = true;
      }
    }
    if (!hasDigits) throw new Error('숫자가 필요합니다');
    return parseFloat(expr.slice(start, i));
  }

  function parseFactor() {
    skipWs();
    if (peek() === '(') {
      i++;
      const v = parseExpr();
      skipWs();
      if (peek() !== ')') throw new Error(') 가 필요합니다');
      i++;
      return v;
    }
    if (peek() === '-') {
      i++;
      return -parseFactor();
    }
    if (peek() === '+') {
      i++;
      return parseFactor();
    }
    return parseNumber();
  }

  function parseTerm() {
    let v = parseFactor();
    skipWs();
    while (peek() === '*' || peek() === '/') {
      const op = peek();
      i++;
      const rhs = parseFactor();
      v = op === '*' ? v * rhs : v / rhs;
      skipWs();
    }
    return v;
  }

  function parseExpr() {
    let v = parseTerm();
    skipWs();
    while (peek() === '+' || peek() === '-') {
      const op = peek();
      i++;
      const rhs = parseTerm();
      v = op === '+' ? v + rhs : v - rhs;
      skipWs();
    }
    return v;
  }

  const result = parseExpr();
  skipWs();
  if (i !== expr.length) throw new Error('수식을 해석할 수 없습니다');
  return result;
}

function inkFormatCalcResult(n) {
  if (Number.isInteger(n)) return String(n);
  const rounded = Math.round(n * 1e6) / 1e6;
  return String(rounded);
}

// Given the text typed immediately before the caret, checks whether it ends a
// "!expression!" block and returns the match { triggerLen, replacement }, or null.
function inkTryCalcMatch(before) {
  if (!before.endsWith('!')) return null;
  const withoutClosing = before.slice(0, -1);
  const openIdx = withoutClosing.lastIndexOf('!');
  if (openIdx === -1) return null;
  const expr = withoutClosing.slice(openIdx + 1);
  if (!expr.trim()) return null;
  if (expr.length > 200) return null;
  if (!/^[0-9+\-*/().\s]+$/.test(expr)) return null;

  let result;
  try {
    result = inkEvaluateExpression(expr);
  } catch (err) {
    return null;
  }
  if (typeof result !== 'number' || !isFinite(result)) return null;

  return {
    triggerLen: expr.length + 2,
    replacement: inkFormatCalcResult(result)
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { inkEvaluateExpression, inkFormatCalcResult, inkTryCalcMatch };
}
