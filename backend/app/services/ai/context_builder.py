from app.models.sheet import Sheet


def build_sheet_context(sheet: Sheet, max_rows: int = 20) -> str:
    """Compact sheet summary for the AI system prompt."""
    cols = sheet.columns or []
    data = (sheet.data or [])[:max_rows]

    col_summary = ", ".join(f"{c['name']} ({c['type']}, {c.get('unique_count', '?')} unique)" for c in cols)

    rows_preview = ""
    if data:
        headers = [c["name"] for c in cols]
        rows_preview = "\n".join("  " + " | ".join(str(row.get(h, "")) for h in headers) for row in data[:10])

    return (
        f'Sheet: "{sheet.name}" — {sheet.row_count} rows, {sheet.col_count} columns\n'
        f"Columns: {col_summary}\n"
        f"Sample rows (first 10):\n{rows_preview}"
    )


def build_workbook_context(sheets: list[Sheet]) -> str:
    """Multi-sheet workbook summary."""
    parts = [f"This workbook has {len(sheets)} sheet(s):"]
    for s in sheets:
        parts.append(build_sheet_context(s, max_rows=10))
        parts.append("---")
    return "\n".join(parts)


AI_SYSTEM_PROMPT = """You are ExcelAI, an expert data analyst assistant embedded in a spreadsheet intelligence platform.

You have access to the user's spreadsheet data shown below in the context.

Rules:
- Answer questions about the data concisely and accurately.
- When citing numbers, always name the column.
- If asked to visualise data, respond with a JSON block on its own line:
  {"chart": true, "chart_type": "bar", "x": "Month", "y": "Revenue", "title": "Revenue by Month"}
  Valid chart_type values: bar, line, area, pie, scatter
- If asked about formulas, explain step-by-step in plain English.
- If you detect something unusual in the data, flag it clearly.
- Keep responses focused. Don't repeat the data back to the user.
"""
