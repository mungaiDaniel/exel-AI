import csv
import io
from typing import Any


def export_to_csv(columns: list[dict], data: list[dict]) -> bytes:
    buf = io.StringIO()
    writer = csv.DictWriter(
        buf,
        fieldnames=[c["name"] for c in columns],
        extrasaction="ignore",
    )
    writer.writeheader()
    writer.writerows(data)
    return buf.getvalue().encode("utf-8-sig")
