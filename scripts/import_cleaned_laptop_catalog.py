"""Generate a reviewable, model-only SQL import from the cleaned Kaggle CSV.

Usage:
  python scripts/import_cleaned_laptop_catalog.py "C:\\Users\\rave\\Downloads\\laptops.csv"

The source is the Kaggle "Laptops Cleaned Dataset" by githubmasterin (CC0).
Prices are intentionally excluded; sellers set their own secondhand prices.
"""
import argparse
import csv
import math
import re
import unicodedata
from collections import defaultdict
from pathlib import Path


SOURCE_URL = "https://www.kaggle.com/datasets/githubmasterin/laptops-cleaned-dataset"
REQUIRED_COLUMNS = {
    "brand", "model", "device_category", "cpu_brand", "cpu_series", "cpu_model",
    "ram_gb", "storage_gb", "display_width_px", "display_height_px",
    "display_size_inch", "gpu_brand", "gpu_series", "gpu_model",
}
BRAND_FIX = {
    "acer": "Acer",
    "apple": "Apple",
    "asus": "ASUS",
    "dell": "Dell",
    "gigabyte": "Gigabyte",
    "hp": "HP",
    "lenovo": "Lenovo",
    "lg": "LG",
    "microsoft": "Microsoft",
    "msi": "MSI",
    "razer": "Razer",
    "samsung": "Samsung",
}
MODEL_CODE = re.compile(r"^[A-Za-z0-9-]{7,}$")


def clean(value):
    value = unicodedata.normalize("NFKC", str(value or ""))
    value = value.replace("\u200e", "").replace("\u200f", "").replace("\ufeff", "").strip()
    return value if value and value.lower() not in {"nan", "none", "null"} else None


def normalized(value):
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


def number(value):
    value = clean(value)
    if value is None:
        return None
    try:
        parsed = float(value)
    except ValueError:
        return None
    return parsed if math.isfinite(parsed) else None


def sql(value):
    if value is None:
        return "null"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def model_code(model, row):
    candidates = []
    hardware_codes = [
        normalized(clean(row.get("cpu_model"))),
        normalized(clean(row.get("gpu_model"))),
    ]
    for token in re.split(r"[\s()/]+", model):
        token = token.strip(" ,.;:")
        letters = sum(char.isalpha() for char in token)
        digits = sum(char.isdigit() for char in token)
        token_key = normalized(token)
        if (
            MODEL_CODE.fullmatch(token)
            and letters >= 2
            and digits >= 3
            and not any(code and code in token_key for code in hardware_codes)
        ):
            candidates.append(token)
    return max(candidates, key=len) if candidates else None


def series_name(model, brand, code, category):
    series = model
    if series.lower().startswith(brand.lower()):
        series = series[len(brand):].strip()
    if code:
        prefix = code.split("-", 1)[0] if code[:2].isdigit() and "-" in code else ""
        series = re.sub(re.escape(code), prefix, series, count=1, flags=re.IGNORECASE).strip()
    if category and series.lower().endswith(category.lower()):
        series = series[:-len(category)].strip()
    return " ".join(series.split())


def join_unique(parts):
    words = []
    seen = set()
    for part in parts:
        for word in (part or "").split():
            key = normalized(word)
            if key and key not in seen:
                words.append(word)
                seen.add(key)
    return " ".join(words) or None


def ram_label(value):
    parsed = number(value)
    if parsed is None or not parsed.is_integer() or not 1 <= parsed <= 256:
        return None
    return "{}GB".format(int(parsed))


def storage_label(value):
    parsed = number(value)
    if parsed is None or parsed <= 0 or not parsed.is_integer():
        return None
    for divisor in (1000, 1024):
        terabytes = parsed / divisor
        if parsed >= 1000 and terabytes.is_integer():
            return "{}TB".format(int(terabytes))
    return "{}GB".format(int(parsed))


def build_model(row):
    raw_brand = clean(row.get("brand"))
    raw_model = clean(row.get("model"))
    if not raw_brand or not raw_model:
        return None
    brand = BRAND_FIX.get(raw_brand.lower(), raw_brand.title())
    code = model_code(raw_model, row)
    series = series_name(raw_model, brand, code, clean(row.get("device_category")))
    if not series:
        return None

    cpu = join_unique([
        clean(row.get("cpu_brand")),
        clean(row.get("cpu_series")),
        clean(row.get("cpu_model")),
    ])
    gpu = join_unique([
        clean(row.get("gpu_brand")),
        clean(row.get("gpu_series")),
        clean(row.get("gpu_model")),
    ])
    width = number(row.get("display_width_px"))
    height = number(row.get("display_height_px"))
    resolution = None
    if width and height and width.is_integer() and height.is_integer():
        resolution = "{}x{}".format(int(width), int(height))

    year_match = re.search(r"\b(20(?:0[5-9]|1\d|2[0-6]))\b", raw_model)
    year = int(year_match.group(1)) if year_match else None
    return {
        "brand": brand,
        "series": series,
        "model_number": code,
        "cpu": cpu,
        "gpu": gpu,
        "screen_size": round(number(row.get("display_size_inch")), 1)
        if number(row.get("display_size_inch")) is not None else None,
        "resolution": resolution,
        "default_ram": ram_label(row.get("ram_gb")),
        "default_storage": storage_label(row.get("storage_gb")),
        "release_year": year,
        "source_model": raw_model,
    }


def catalog_key(model):
    return tuple(normalized(model[field]) for field in ("brand", "series", "model_number"))


def build_catalog(rows):
    grouped = defaultdict(list)
    for row in rows:
        model = build_model(row)
        if model:
            grouped[catalog_key(model)].append(model)

    models = []
    for variants in grouped.values():
        representative = max(
            variants,
            key=lambda model: sum(model[field] is not None for field in (
                "cpu", "gpu", "screen_size", "resolution", "default_ram",
                "default_storage", "release_year",
            )),
        ).copy()
        source_models = sorted({
            variant["source_model"] for variant in variants
        })
        representative.pop("source_model")
        representative["source_model_count"] = len(variants)
        representative["source_models"] = " | ".join(source_models)
        models.append(representative)

    return sorted(models, key=lambda model: (
        normalized(model["brand"]),
        normalized(model["series"]),
        normalized(model["model_number"]),
    ))


def write_preview(path, models):
    fields = [
        "brand", "series", "model_number", "cpu", "gpu", "screen_size",
        "resolution", "default_ram", "default_storage", "release_year",
        "source_model_count", "source_models",
    ]
    with open(path, "w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(models)


def write_sql(path, models):
    columns = [
        "brand", "series", "model_number", "cpu", "gpu", "screen_size",
        "resolution", "default_ram", "default_storage", "release_year",
    ]
    lines = [
        "-- Source: Kaggle Laptops Cleaned Dataset by githubmasterin (CC0).",
        "-- {}".format(SOURCE_URL),
        "-- Models only: source prices are excluded; sellers set secondhand prices.",
        "-- Review catalog_cleaned_preview.csv before running this in Supabase.",
        "insert into public.laptop_models ({}) values".format(", ".join(columns)),
    ]
    values = []
    for model in models:
        values.append("  ({})".format(", ".join(sql(model[column]) for column in columns)))
    lines.append(",\n".join(values))
    lines.append("on conflict (brand, series, model_number) do nothing;")
    Path(path).write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", help="Path to the downloaded Laptops Cleaned Dataset CSV")
    parser.add_argument("--output-dir", default=".", help="Directory for preview and SQL output")
    args = parser.parse_args()

    with open(args.csv, newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        if reader.fieldnames is None:
            parser.error("The CSV has no header row.")
        missing = REQUIRED_COLUMNS - set(reader.fieldnames)
        if missing:
            parser.error("CSV is missing required columns: {}".format(", ".join(sorted(missing))))
        rows = list(reader)

    models = build_catalog(rows)
    if not models:
        parser.error("No valid catalog models were found.")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    preview_path = output_dir / "catalog_cleaned_preview.csv"
    sql_path = output_dir / "catalog_cleaned_models.sql"
    write_preview(preview_path, models)
    write_sql(sql_path, models)
    print("{} source rows produced {} unique catalog entries.".format(len(rows), len(models)))
    print("Preview: {}".format(preview_path))
    print("Models-only SQL: {}".format(sql_path))


if __name__ == "__main__":
    main()
