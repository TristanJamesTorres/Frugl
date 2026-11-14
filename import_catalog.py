"""Build Frugl's laptop catalog SQL and a separate cross-dataset price check.

Example (rates are PHP per unit of source currency):
  python import_catalog.py "C:\\Users\\rave\\Downloads\\laptop_scrap_data.csv" --price-check "C:\\Users\\rave\\Downloads\\laptops.csv" --rate 70.489707 --check-rate 0.67763959 --rate-date 2026-11-13

The main CSV supplies catalog rows and estimate prices. The price-check CSV
is used only for catalog_price_check.csv; its prices are never written to SQL.
"""
import argparse
import csv
import math
import re
import statistics
import unicodedata
from collections import defaultdict
from pathlib import Path


CONDITION_MULT = {
    "brand_new": 1.00,
    "like_new": 0.80,
    "lightly_used": 0.70,
    "well_used": 0.58,
    "heavily_used": 0.45,
}

BRAND_FIX = {
    "acer": "Acer",
    "apple": "Apple",
    "asus": "ASUS",
    "dell": "Dell",
    "dynabook": "Dynabook",
    "gigabyte": "Gigabyte",
    "hp": "HP",
    "huawei": "Huawei",
    "ibm": "IBM",
    "lg": "LG",
    "lenovo": "Lenovo",
    "microsoft": "Microsoft",
    "msi": "MSI",
    "razer": "Razer",
    "samsung": "Samsung",
    "toshiba": "Toshiba",
}


def normalize(value):
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = value.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]", "", value)


def clean(value):
    value = str(value or "").strip()
    return value if value and value.lower() not in {"nan", "none", "null"} else None


def number(value):
    value = clean(value)
    if value is None:
        return None
    match = re.search(r"-?\d+(?:\.\d+)?", value.replace(",", ""))
    if not match:
        return None
    parsed = float(match.group())
    return parsed if math.isfinite(parsed) else None


def money(value):
    return number(value)


def brand_name(value):
    value = clean(value)
    if value is None:
        return None
    return BRAND_FIX.get(value.lower(), value.title())


def series_name(value, brand):
    value = clean(value)
    if value is None:
        return None
    if brand and value.lower().startswith(brand.lower()):
        value = value[len(brand):].strip()
    return " ".join(value.split())


def screen_size(value):
    parsed = number(value)
    return round(parsed, 1) if parsed is not None and 10 <= parsed <= 20 else None


def resolution(value):
    value = clean(value)
    match = re.search(r"(\d{3,4})\s*[xX\u00d7]\s*(\d{3,4})", value or "")
    return "{}x{}".format(match.group(1), match.group(2)) if match else None


def resolution_from_xy(width, height):
    width_value = number(width)
    height_value = number(height)
    if width_value is None or height_value is None:
        return None
    if not width_value.is_integer() or not height_value.is_integer():
        return None
    return "{}x{}".format(int(width_value), int(height_value))


def ram_label(value):
    parsed = number(value)
    if parsed is None or not parsed.is_integer() or parsed < 1 or parsed > 256:
        return None
    return "{}GB".format(int(parsed))


def storage_label(value):
    parsed = number(value)
    if parsed is None or parsed <= 0:
        return None
    for divisor in (1000, 1024):
        terabytes = parsed / divisor
        if parsed >= 1000 and terabytes.is_integer():
            return "{}TB".format(int(terabytes))
    return "{}GB".format(int(parsed))


def read_csv(path, required_columns):
    with open(path, newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        if reader.fieldnames is None:
            raise ValueError("{} has no header row".format(path))
        missing = [column for column in required_columns if column not in reader.fieldnames]
        if missing:
            raise ValueError("{} is missing required columns: {}".format(path, ", ".join(missing)))
        return list(reader)


def sql(value):
    if value is None or (isinstance(value, float) and not math.isfinite(value)):
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def csv_write(path, fieldnames, rows):
    with open(path, "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build_catalog(rows, rate, limit):
    grouped = defaultdict(list)
    for row in rows:
        brand = brand_name(row.get("Company"))
        raw_name = clean(row.get("TypeName"))
        series = series_name(raw_name, brand)
        raw_price = money(row.get("Price"))
        if not brand or not series or len(series) < 3 or raw_price is None or raw_price <= 0:
            continue
        key = (normalize(brand), normalize(series))
        grouped[key].append({
            "brand": brand,
            "series": series,
            "cpu": clean(row.get("Cpu")),
            "gpu": clean(row.get("Gpu")),
            "screen_size": screen_size(row.get("Inches")),
            "resolution": resolution(row.get("ScreenResolution")) or resolution_from_xy(
                row.get("X_res"), row.get("Y_res")
            ),
            "default_ram": ram_label(row.get("Ram_GB")),
            "default_storage": storage_label(row.get("Total_Storage_GB")),
            "release_year": None,
            "price_source": raw_price,
        })

    models = []
    for group in grouped.values():
        prices = [row["price_source"] for row in group]
        median_price = statistics.median(prices)
        representative = min(group, key=lambda row: abs(row["price_source"] - median_price))
        models.append({
            **representative,
            "price_source": median_price,
            "price_php": int(round(median_price * rate, -2)),
            "rows": len(group),
        })

    models.sort(key=lambda row: (-row["rows"], normalize(row["brand"]), normalize(row["series"])))
    return models[:limit]


def build_price_check(
    main_rows, check_rows, selected_models, main_rate, check_rate, main_currency, check_currency
):
    selected_by_key = {
        (normalize(model["brand"]), normalize(model["series"])): model
        for model in selected_models
    }
    selected_keys = set(selected_by_key)
    main_prices = defaultdict(list)
    main_names = {}
    for row in main_rows:
        brand = brand_name(row.get("Company"))
        raw_name = clean(row.get("TypeName"))
        series = series_name(raw_name, brand)
        price = money(row.get("Price"))
        if not brand or not series or price is None or price <= 0:
            continue
        key = (normalize(brand), normalize(series))
        if key in selected_keys:
            main_prices[key].append(price)
            main_names[key] = (brand, series)

    check_prices = defaultdict(list)
    check_names = {}
    for row in check_rows:
        brand = brand_name(row.get("brand"))
        raw_model = clean(row.get("model"))
        price = money(row.get("price"))
        model = series_name(raw_model, brand)
        if not brand or not model or price is None or price <= 0:
            continue
        key = (normalize(brand), normalize(model))
        if key in selected_keys:
            check_prices[key].append({
                "price": price,
                "ram": ram_label(row.get("ram_gb")),
                "storage": storage_label(row.get("storage_gb")),
            })
            check_names[key] = raw_model

    comparisons = []
    for key in sorted(main_prices.keys() & check_prices.keys()):
        main_median = statistics.median(main_prices[key])
        catalog_model = selected_by_key[key]
        matched_config = [
            row for row in check_prices[key]
            if row["ram"] == catalog_model["default_ram"]
            and row["storage"] == catalog_model["default_storage"]
            and row["ram"] is not None
            and row["storage"] is not None
        ]
        used_check_rows = matched_config or check_prices[key]
        check_median = statistics.median(row["price"] for row in used_check_rows)
        main_php = main_median * main_rate
        check_php = check_median * check_rate
        brand, series = main_names[key]
        comparison_configs = sorted({
            "{}/{}".format(row["ram"] or "?", row["storage"] or "?")
            for row in check_prices[key]
        })
        comparisons.append({
            "brand": brand,
            "main_series": series,
            "main_ram": catalog_model["default_ram"],
            "main_storage": catalog_model["default_storage"],
            "comparison_model": check_names[key],
            "comparison_configs": "; ".join(comparison_configs),
            "configuration_match": "yes" if matched_config else "no",
            "comparison_basis": "matching RAM/storage" if matched_config else "all configurations; not like-for-like",
            "main_median_source_price": round(main_median, 2),
            "main_currency": main_currency,
            "main_median_php": round(main_php, 2),
            "comparison_median_source_price": round(check_median, 2),
            "comparison_currency": check_currency,
            "comparison_median_php": round(check_php, 2),
            "main_to_comparison_ratio": round(main_php / check_php, 2),
            "main_rows": len(main_prices[key]),
            "comparison_rows": len(check_prices[key]),
            "comparison_used_rows": len(used_check_rows),
        })
    return comparisons


def build_sql(models, rate, rate_date, main_currency, include_prices=True):
    lines = [
        "-- Generated by import_catalog.py. Review catalog_preview.csv first.",
        "insert into public.laptop_models "
        "(brand, series, model_number, cpu, gpu, screen_size, resolution, default_ram, default_storage, release_year) values",
    ]
    if include_prices:
        lines.insert(1, "-- Main price currency assumed {}; conversion: {} PHP per {} (rate date {}).".format(
            main_currency, rate, main_currency, rate_date
        ))
        lines.insert(2, "-- The comparison dataset is not included in this SQL.")
    model_rows = []
    for model in models:
        model_rows.append("({}, {}, null, {}, {}, {}, {}, {}, {}, {})".format(
            sql(model["brand"]),
            sql(model["series"]),
            sql(model["cpu"]),
            sql(model["gpu"]),
            sql(model["screen_size"]),
            sql(model["resolution"]),
            sql(model["default_ram"]),
            sql(model["default_storage"]),
            sql(model["release_year"]),
        ))
    lines.append(",\n".join(model_rows) + "\non conflict do nothing;\n")

    if not include_prices:
        return "\n".join(lines)

    base_rows = ",\n".join(
        "  ({}, {}, {})".format(sql(model["brand"]), sql(model["series"]), model["price_php"])
        for model in models
    )
    condition_values = ", ".join(
        "({}, {})".format(sql(condition), multiplier)
        for condition, multiplier in CONDITION_MULT.items()
    )
    lines.append("""-- PLACEHOLDER prices in PHP (estimates from the main dataset, not real Philippine used prices)
with base(brand, series, price) as (values
{base_rows}
)
insert into public.price_reports (model_id, ram, storage, condition, low, median, high, sample_size, source, is_estimate)
select m.id, m.default_ram, m.default_storage, c.cond,
       round(b.price * c.mult * 0.85, -2), round(b.price * c.mult, -2), round(b.price * c.mult * 1.15, -2),
       0, 'main dataset estimate', true
from base b
join public.laptop_models m on m.brand = b.brand and m.series = b.series
cross join (values {conditions}) as c(cond, mult)
where not exists (
  select 1 from public.price_reports p where p.model_id = m.id and p.condition = c.cond
);
""".format(base_rows=base_rows, conditions=condition_values))
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("catalog_csv", help="Main CSV used for models, specs, and estimates")
    parser.add_argument("--price-check", required=True, help="Comparison CSV; never inserted into SQL")
    parser.add_argument("--rate", type=float, required=True, help="PHP per 1 unit of the main CSV currency")
    parser.add_argument("--check-rate", type=float, required=True, help="PHP per 1 unit of the comparison currency")
    parser.add_argument("--max", type=int, default=400, help="Maximum catalog models, most common first")
    parser.add_argument("--currency", default="EUR", help="Assumed currency of the main CSV price column")
    parser.add_argument("--check-currency", default="INR", help="Assumed currency of the comparison price column")
    parser.add_argument("--rate-date", default="2026-11-13", help="Date for the supplied FX assumptions")
    parser.add_argument("--output-dir", default=".", help="Directory for generated files")
    parser.add_argument(
        "--models-only", action="store_true",
        help="Write catalog_models_only.sql without price_reports estimates",
    )
    args = parser.parse_args()

    if args.rate <= 0 or args.check_rate <= 0:
        parser.error("--rate and --check-rate must be positive")
    if args.max <= 0:
        parser.error("--max must be positive")

    main_rows = read_csv(args.catalog_csv, [
        "Company", "TypeName", "Inches", "ScreenResolution", "Cpu", "Gpu", "Ram_GB", "Total_Storage_GB", "Price"
    ])
    check_rows = read_csv(args.price_check, ["brand", "model", "price"])
    models = build_catalog(main_rows, args.rate, args.max)
    if not models:
        parser.error("No valid catalog models were found in the main CSV")

    comparisons = build_price_check(
        main_rows, check_rows, models, args.rate, args.check_rate, args.currency, args.check_currency
    )
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    preview_fields = [
        "brand", "series", "cpu", "gpu", "screen_size", "resolution", "default_ram",
        "default_storage", "release_year", "price_source", "currency", "price_php", "rows",
    ]
    preview = [
        {**model, "currency": args.currency}
        for model in models
    ]
    csv_write(output_dir / "catalog_preview.csv", preview_fields, preview)
    csv_write(output_dir / "catalog_price_check.csv", [
        "brand", "main_series", "main_ram", "main_storage", "comparison_model", "comparison_configs",
        "configuration_match", "comparison_basis", "main_median_source_price", "main_currency",
        "main_median_php", "comparison_median_source_price", "comparison_currency",
        "comparison_median_php", "main_to_comparison_ratio", "main_rows", "comparison_rows",
        "comparison_used_rows",
    ], comparisons)
    sql_name = "catalog_models_only.sql" if args.models_only else "catalog_import.sql"
    sql = build_sql(models, args.rate, args.rate_date, args.currency, include_prices=not args.models_only)
    (output_dir / sql_name).write_text(sql, encoding="utf-8")

    print("{} models written to {}".format(len(models), output_dir / "catalog_preview.csv"))
    print("{} exact model matches written to {}".format(len(comparisons), output_dir / "catalog_price_check.csv"))
    print("SQL written to {}. Review the preview and price-check files before importing.".format(
        output_dir / sql_name
    ))


if __name__ == "__main__":
    main()
