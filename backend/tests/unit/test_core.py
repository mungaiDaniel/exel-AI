import pytest
from pydantic import ValidationError

from app.core import security
from app.core.config import Settings
from app.services.excel.formula_engine import FormulaEngine
from app.services.excel.parser import ExcelParser

# ── security ──────────────────────────────────────────────────────────────────


def test_password_hash_roundtrip():
    hashed = security.hash_password("Passw0rd!x")
    assert hashed != "Passw0rd!x"
    assert security.verify_password("Passw0rd!x", hashed)
    assert not security.verify_password("other", hashed)


def test_verify_password_with_garbage_hash_is_false():
    assert security.verify_password("x", "not-a-bcrypt-hash") is False


def test_token_types_are_enforced():
    access = security.create_access_token("user-1")
    assert security.decode_token(access, expected_type="access")["sub"] == "user-1"
    assert security.decode_token(access, expected_type="refresh") is None
    assert security.decode_token("garbage") is None


def test_tokens_are_unique():
    assert security.create_access_token("u") != security.create_access_token("u")


# ── config ────────────────────────────────────────────────────────────────────


def test_weak_jwt_secret_rejected_outside_debug():
    with pytest.raises(ValidationError):
        Settings(DEBUG=False, JWT_SECRET_KEY="change-me", _env_file=None)


def test_weak_jwt_secret_allowed_in_debug():
    assert Settings(DEBUG=True, JWT_SECRET_KEY="change-me", _env_file=None).DEBUG is True


def test_strong_secret_accepted():
    Settings(DEBUG=False, JWT_SECRET_KEY="k" * 48, _env_file=None)


# ── formula engine ────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "expr, expected",
    [
        ("=SUM(1,2,3)", 6),
        ("=AVERAGE(2,4,6)", 4),
        ("=MIN(5,2,9)", 2),
        ("=MAX(5,2,9)", 9),
        ("=ROUND(3.14159,2)", 3.14),
        ("=ABS(-4)", 4),
        ("=SQRT(16)", 4),
        ('=UPPER("abc")', "ABC"),
        ('=LEN("hello")', 5),
        ('=IF(TRUE,"yes","no")', "yes"),
    ],
)
def test_formula_engine_functions(expr, expected):
    result = FormulaEngine().evaluate(expr)
    assert result["success"], result
    assert result["result"] == expected


def test_formula_engine_uses_context():
    assert FormulaEngine().evaluate("=SUM(a,b)", {"a": 2, "b": 5})["result"] == 7


def test_formula_engine_reports_unknown_tokens():
    result = FormulaEngine().evaluate("=totally_unknown")
    assert result["success"] is False and "Unknown token" in result["error"]


def test_formula_engine_never_executes_python():
    result = FormulaEngine().evaluate("=__import__('os').system('echo pwned')")
    assert result["success"] is False


# ── parser ────────────────────────────────────────────────────────────────────


def test_parser_infers_columns(xlsx_bytes):
    parsed = ExcelParser().parse_workbook(xlsx_bytes, "sales.xlsx")
    sheet = parsed["sheets"][0]
    assert parsed["sheet_count"] == 1 and parsed["total_rows"] == 4
    assert [c["name"] for c in sheet["columns"]] == ["Region", "Units", "Revenue"]
    assert sheet["data"][0]["Region"] == "North"


def test_parser_detects_numeric_and_currency_types(xlsx_bytes):
    """Regression: numeric columns used to be mis-typed as 'datetime'."""
    columns = ExcelParser().parse_workbook(xlsx_bytes, "sales.xlsx")["sheets"][0]["columns"]
    assert {c["name"]: c["type"] for c in columns} == {
        "Region": "text",
        "Units": "number",
        "Revenue": "currency",
    }
