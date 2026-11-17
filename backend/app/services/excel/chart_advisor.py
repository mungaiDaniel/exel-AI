from typing import Any


class ChartAdvisor:
    """Suggest chart types based on column types."""

    def suggest(self, columns: list[dict]) -> list[dict]:
        suggestions = []
        numeric = [c for c in columns if c["type"] in ("number", "currency")]
        text = [c for c in columns if c["type"] == "text"]
        dates = [c for c in columns if c["type"] == "datetime"]

        if dates and numeric:
            x_col = dates[0]["name"]
            for n in numeric[:3]:
                suggestions.append({
                    "chart_type": "line",
                    "x": x_col,
                    "y": n["name"],
                    "title": f"{n['name']} over time",
                    "reasoning": "Line charts work well for numeric trends over time.",
                })
                suggestions.append({
                    "chart_type": "area",
                    "x": x_col,
                    "y": n["name"],
                    "title": f"{n['name']} area chart",
                    "reasoning": "Area charts emphasise cumulative volume.",
                })

        if text and numeric:
            x_col = text[0]["name"]
            for n in numeric[:2]:
                suggestions.append({
                    "chart_type": "bar",
                    "x": x_col,
                    "y": n["name"],
                    "title": f"{n['name']} by {x_col}",
                    "reasoning": "Bar charts compare values across categories.",
                })

            # Pie if low cardinality category
            cat = text[0]
            if cat.get("unique_count", 999) <= 8:
                suggestions.append({
                    "chart_type": "pie",
                    "x": cat["name"],
                    "y": numeric[0]["name"],
                    "title": f"{numeric[0]['name']} distribution",
                    "reasoning": "Pie chart works well with few distinct categories.",
                })

        if len(numeric) >= 2:
            suggestions.append({
                "chart_type": "scatter",
                "x": numeric[0]["name"],
                "y": numeric[1]["name"],
                "title": f"{numeric[0]['name']} vs {numeric[1]['name']}",
                "reasoning": "Scatter plots reveal correlation between numeric variables.",
            })

        nullable = [c for c in columns if c.get("nullable")]
        for col in nullable[:2]:
            suggestions.append({
                "chart_type": "pie",
                "x": "Status",
                "y": "Rows",
                "title": f"{col['name']} completeness",
                "reasoning": "This shows how many rows have a value versus missing data.",
                "transform": "missingness",
                "column": col["name"],
            })

        for col in text[:2]:
            if col.get("unique_count", 0) <= 20:
                suggestions.append({
                    "chart_type": "bar",
                    "x": col["name"],
                    "y": "Rows",
                    "title": f"Rows by {col['name']}",
                    "reasoning": "This counts how often each category appears.",
                    "transform": "value_counts",
                    "column": col["name"],
                })

        return suggestions[:6]
