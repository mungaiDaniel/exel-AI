import io
import math
import warnings
from datetime import date, datetime
import openpyxl
import pandas as pd
import numpy as np
from pathlib import Path


class ExcelParser:
    """Parse Excel / CSV files into structured JSON data."""

    SUPPORTED_EXTENSIONS = {".xlsx", ".xls", ".xlsm", ".csv"}

    def parse_workbook(self, file_bytes: bytes, file_name: str) -> dict:
        ext = Path(file_name).suffix.lower()
        if ext == ".csv":
            return self._parse_csv(file_bytes)
        return self._parse_excel(file_bytes)

    def _parse_excel(self, file_bytes: bytes) -> dict:
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        sheets = []
        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            sheet_data = self._parse_ws(ws, len(sheets))
            sheets.append(sheet_data)
        return {
            "sheet_count": len(sheets),
            "sheets": sheets,
            "total_rows": sum(s["row_count"] for s in sheets),
        }

    def _parse_csv(self, file_bytes: bytes) -> dict:
        df = pd.read_csv(io.BytesIO(file_bytes))
        sheet_data = self._dataframe_to_sheet(df, "Sheet1", 0)
        return {"sheet_count": 1, "sheets": [sheet_data], "total_rows": sheet_data["row_count"]}

    def _parse_ws(self, ws, index: int) -> dict:
        rows = list(ws.values)
        if not rows:
            return {"name": ws.title, "index": index, "row_count": 0, "col_count": 0, "columns": [], "data": []}
        headers = [str(h) if h is not None else f"Column_{i}" for i, h in enumerate(rows[0])]
        data_rows = rows[1:]
        df = pd.DataFrame(data_rows, columns=headers)
        return self._dataframe_to_sheet(df, ws.title, index)

    def _dataframe_to_sheet(self, df: pd.DataFrame, name: str, index: int) -> dict:
        df = df.astype(object).where(pd.notnull(df), None)
        columns = self._detect_columns(df)
        records = [
            {str(key): self._json_safe_value(value) for key, value in row.items()}
            for row in df.head(1000).to_dict(orient="records")
        ]
        return {
            "name": name,
            "index": index,
            "row_count": len(df),
            "col_count": len(df.columns),
            "columns": columns,
            "data": records,
            "has_more": len(df) > 1000,
        }

    def _detect_columns(self, df: pd.DataFrame) -> list[dict]:
        columns = []
        for col in df.columns:
            col_series = df[col].dropna()
            col_type = self._infer_type(col_series, str(col))
            sample = []
            for v in col_series.head(5).tolist():
                sample.append(self._json_safe_value(v))
            columns.append({
                "name": str(col),
                "type": col_type,
                "nullable": bool(df[col].isna().any()),
                "unique_count": int(df[col].nunique()),
                "sample_values": sample,
            })
        return columns

    def _infer_type(self, series: pd.Series, col_name: str) -> str:
        if pd.api.types.is_datetime64_any_dtype(series):
            return "datetime"
        if pd.api.types.is_numeric_dtype(series):
            currency_keywords = {"price", "cost", "revenue", "salary", "amount", "total", "fee", "budget"}
            if any(k in col_name.lower() for k in currency_keywords):
                return "currency"
            return "number"
        # Try to coerce dates
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", UserWarning)
                pd.to_datetime(series.head(10), errors="raise")
            return "datetime"
        except Exception:
            pass
        return "text"

    def _json_safe_value(self, value):
        if value is None:
            return None
        if isinstance(value, float) and math.isnan(value):
            return None
        try:
            if pd.isna(value):
                return None
        except (TypeError, ValueError):
            pass
        if isinstance(value, (datetime, date, pd.Timestamp)):
            return value.isoformat()
        if isinstance(value, np.integer):
            return int(value)
        if isinstance(value, np.floating):
            return float(value)
        if isinstance(value, np.bool_):
            return bool(value)
        return value
