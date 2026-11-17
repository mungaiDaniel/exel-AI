import json
import re

import anthropic

from app.core.config import settings


class ClaudeService:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.AI_MODEL

    def build_context(self, sheet_data: dict) -> str:
        cols = [f"{c['name']} ({c['type']})" for c in sheet_data.get("columns", [])]
        sample = sheet_data.get("data", [])[:10]
        return (
            f'You are analysing a spreadsheet called "{sheet_data.get("name", "Sheet")}".\n'
            f"Columns: {', '.join(cols)}\n"
            f"Row count: {sheet_data.get('row_count', 0)}\n"
            f"Sample data (first 10 rows):\n{sample}\n"
        )

    async def chat(self, messages: list[dict], context: str = "") -> str:
        system = (
            "You are ExcelAI, an expert data analyst assistant.\n"
            f"{context}\n"
            "Answer questions about this data concisely and accurately. "
            "When referencing specific numbers, always cite the column name. "
            'If asked to suggest a chart, respond with JSON: {"chart_type": "bar", "x": "Month", "y": "Revenue"}'
        )
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=system,
            messages=messages,
        )
        return response.content[0].text

    async def explain_formula(self, formula: str) -> str:
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": f"Explain this Excel formula in plain English, step by step: {formula}",
                }
            ],
        )
        return response.content[0].text

    async def generate_insights(self, sheet_data: dict) -> list[str]:
        context = self.build_context(sheet_data)
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=1000,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"{context}\n\n"
                        "Generate 3 key insights from this data. "
                        'Return a JSON array of strings only, e.g. ["insight 1", "insight 2", "insight 3"]'
                    ),
                }
            ],
        )
        text = response.content[0].text
        match = re.search(r"\[.*?\]", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return [text]
