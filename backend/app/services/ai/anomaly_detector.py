import json
import statistics

import anthropic

from app.core.config import settings


def detect_statistical_anomalies(columns: list[dict], data: list[dict]) -> list[dict]:
    """Fast local outlier detection using z-score (no AI call needed for flagging)."""
    anomalies = []
    for col in columns:
        if col["type"] not in ("number", "currency"):
            continue
        name = col["name"]
        values = [
            float(row[name]) for row in data if row.get(name) is not None and str(row.get(name, "")).strip() != ""
        ]
        if len(values) < 4:
            continue
        mean = statistics.mean(values)
        stdev = statistics.stdev(values)
        if stdev == 0:
            continue
        for i, row in enumerate(data):
            raw = row.get(name)
            if raw is None:
                continue
            try:
                val = float(raw)
            except (TypeError, ValueError):
                continue
            z = abs((val - mean) / stdev)
            if z > 2.5:
                anomalies.append(
                    {
                        "column": name,
                        "row_index": i,
                        "value": val,
                        "z_score": round(z, 2),
                        "mean": round(mean, 4),
                        "stdev": round(stdev, 4),
                        "severity": "high" if z > 3 else "medium",
                    }
                )
    return anomalies[:20]  # cap at 20


async def explain_anomalies(sheet_name: str, anomalies: list[dict]) -> str:
    """Use Claude to generate a plain-English explanation of detected anomalies."""
    if not anomalies:
        return "No significant anomalies detected in this sheet."

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    anomaly_summary = json.dumps(anomalies[:10], indent=2)

    response = await client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=600,
        messages=[
            {
                "role": "user",
                "content": (
                    f'I detected these statistical anomalies in the sheet "{sheet_name}":\n\n'
                    f"{anomaly_summary}\n\n"
                    "In 3-5 sentences, explain what these anomalies mean in plain English. "
                    "Mention which columns are affected and why the flagged values are unusual. "
                    "Be concise and business-friendly."
                ),
            }
        ],
    )
    return response.content[0].text
