"""Data loading, cleaning, and column registry (Phase 2).

Source: extension of the Z-Alizadeh Sani dataset (UCI ID 411, CC BY 4.0).
303 patients x 59 columns. No missing values in the raw file, but the
pipeline still guards against them so future files do not break silently.

Key facts baked in here (verified against the raw .xlsx):
- ``Cath`` (CAD/Normal) IS the overall CAD label; ``CAD = (Cath == 'CAD')``.
- Vessel targets LAD/LCX/RCA are Normal/Stenotic strings -> 1 = Stenotic.
- ``Sex`` contains a source typo: 'Fmale' -> Female.
- ``Exertional CP`` is constant ('N' for all 303 rows) -> dropped.
- ``BBB`` has 3 levels (N/LBBB/RBBB); ``VHD`` is ordinal (N/mild/Moderate/Severe).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

from app.config import DATA_DIR, PROCESSED_DIR, TARGETS

# UCI provenance (used only to document / re-fetch the raw file).
UCI_ID = 411
UCI_ZIP_URL = (
    "https://archive.ics.uci.edu/static/public/411/"
    "extention+of+z+alizadeh+sani+dataset.zip"
)
RAW_XLSX_NAME = "extention of Z-Alizadeh sani dataset.xlsx"

# Local files accepted by load_raw(), in priority order.
RAW_CANDIDATES: list[str] = [
    RAW_XLSX_NAME,
    f"raw/{RAW_XLSX_NAME}",
    "z-alizadeh-sani.csv",
    "raw/z-alizadeh-sani.csv",
]

BINARY_YN = {"Y": 1, "N": 0}

# clean_name -> (group, human label, unit, normal range hint for the UI)
COLUMN_META: dict[str, tuple[str, str, str | None, str | None]] = {
    # demographic / history
    "age": ("demographic", "Age", "years", "30-86 in cohort"),
    "weight": ("demographic", "Weight", "kg", "48-120 in cohort"),
    "length": ("demographic", "Height", "cm", "140-188 in cohort"),
    "sex": ("demographic", "Sex", None, "Male / Female"),
    "bmi": ("demographic", "BMI", "kg/m2", "18.5-24.9"),
    "dm": ("demographic", "Diabetes mellitus", None, "No / Yes"),
    "htn": ("demographic", "Hypertension", None, "No / Yes"),
    "current_smoker": ("demographic", "Current smoker", None, "No / Yes"),
    "ex_smoker": ("demographic", "Ex-smoker", None, "No / Yes"),
    "fh": ("demographic", "Family history of CAD", None, "No / Yes"),
    "obesity": ("demographic", "Obesity", None, "No / Yes"),
    "crf": ("demographic", "Chronic renal failure", None, "No / Yes"),
    "cva": ("demographic", "Cerebrovascular accident", None, "No / Yes"),
    "airway_disease": ("demographic", "Airway disease", None, "No / Yes"),
    "thyroid_disease": ("demographic", "Thyroid disease", None, "No / Yes"),
    "chf": ("demographic", "Congestive heart failure", None, "No / Yes"),
    "dlp": ("demographic", "Dyslipidemia", None, "No / Yes"),
    # symptoms / examination
    "bp": ("symptom_exam", "Blood pressure (systolic)", "mmHg", "< 120"),
    "pr": ("symptom_exam", "Pulse rate", "bpm", "60-100"),
    "edema": ("symptom_exam", "Edema", None, "No / Yes"),
    "weak_peripheral_pulse": ("symptom_exam", "Weak peripheral pulse", None, "No / Yes"),
    "lung_rales": ("symptom_exam", "Lung rales", None, "No / Yes"),
    "systolic_murmur": ("symptom_exam", "Systolic murmur", None, "No / Yes"),
    "diastolic_murmur": ("symptom_exam", "Diastolic murmur", None, "No / Yes"),
    "typical_chest_pain": ("symptom_exam", "Typical chest pain", None, "No / Yes"),
    "dyspnea": ("symptom_exam", "Dyspnea", None, "No / Yes"),
    "function_class": ("symptom_exam", "Function class", None, "0-3"),
    "atypical": ("symptom_exam", "Atypical chest pain", None, "No / Yes"),
    "nonanginal": ("symptom_exam", "Nonanginal pain", None, "No / Yes"),
    "lowth_ang": ("symptom_exam", "Low-threshold angina", None, "No / Yes"),
    # ECG
    "q_wave": ("ecg", "Q wave", None, "No / Yes"),
    "st_elevation": ("ecg", "ST elevation", None, "No / Yes"),
    "st_depression": ("ecg", "ST depression", None, "No / Yes"),
    "tinversion": ("ecg", "T inversion", None, "No / Yes"),
    "lvh": ("ecg", "Left ventricular hypertrophy", None, "No / Yes"),
    "poor_r_progression": ("ecg", "Poor R-wave progression", None, "No / Yes"),
    "bbb": ("ecg", "Bundle branch block", None, "None / LBBB / RBBB"),
    # lab + echo
    "fbs": ("lab_echo", "Fasting blood sugar", "mg/dL", "70-100"),
    "cr": ("lab_echo", "Creatinine", "mg/dL", "0.6-1.2"),
    "tg": ("lab_echo", "Triglycerides", "mg/dL", "< 150"),
    "ldl": ("lab_echo", "LDL cholesterol", "mg/dL", "< 100"),
    "hdl": ("lab_echo", "HDL cholesterol", "mg/dL", ">= 40"),
    "bun": ("lab_echo", "Blood urea nitrogen", "mg/dL", "7-20"),
    "esr": ("lab_echo", "ESR", "mm/hr", "0-20"),
    "hb": ("lab_echo", "Hemoglobin", "g/dL", "12-18"),
    "k": ("lab_echo", "Potassium", "mEq/L", "3.5-5.0"),
    "na": ("lab_echo", "Sodium", "mEq/L", "135-145"),
    "wbc": ("lab_echo", "WBC", "cells/mcL", "4500-11000"),
    "lymph": ("lab_echo", "Lymphocytes", "%", "20-40"),
    "neut": ("lab_echo", "Neutrophils", "%", "40-70"),
    "plt": ("lab_echo", "Platelets", "x1000/mcL", "150-400"),
    "ef_tte": ("lab_echo", "Ejection fraction (TTE)", "%", ">= 55"),
    "region_rwma": ("lab_echo", "RWMA regions", "count", "0"),
    "vhd": ("lab_echo", "Valvular heart disease", None, "None / mild / Moderate / Severe"),
    # targets
    "lad": ("target", "LAD stenosis", None, "Normal / Stenotic"),
    "lcx": ("target", "LCX stenosis", None, "Normal / Stenotic"),
    "rca": ("target", "RCA stenosis", None, "Normal / Stenotic"),
    "cath": ("target", "Angiography result (Cath)", None, "Normal / CAD"),
    "cad": ("target", "Coronary artery disease", None, "Normal / CAD"),
}

# Columns dropped during cleaning (documented, not silent).
DROPPED_COLUMNS: dict[str, str] = {
    "Exertional CP": "constant ('N' for all 303 rows), zero variance",
}

VHD_ORDER = {"N": 0, "mild": 1, "Moderate": 2, "Severe": 3}


def normalize_name(name: str) -> str:
    """Lowercase, strip, non-alphanumerics -> single underscore."""
    slug = re.sub(r"[^a-z0-9]+", "_", name.strip().lower())
    return slug.strip("_")


def _find_raw() -> Path:
    for cand in RAW_CANDIDATES:
        path = DATA_DIR / cand
        if path.exists():
            return path
    raise FileNotFoundError(
        f"No raw dataset found. Looked for {[str(DATA_DIR / c) for c in RAW_CANDIDATES]}. "
        f"Download '{RAW_XLSX_NAME}' from UCI ID {UCI_ID} ({UCI_ZIP_URL}) "
        "into data/raw/ ."
    )


def load_raw(path: str | Path | None = None) -> pd.DataFrame:
    """Load the raw file (xlsx or csv) without modification."""
    raw = Path(path) if path else _find_raw()
    if raw.suffix.lower() in (".xlsx", ".xls"):
        return pd.read_excel(raw)
    return pd.read_csv(raw)


def clean(df: pd.DataFrame | None = None) -> tuple[pd.DataFrame, dict]:
    """Clean the raw frame -> (clean_df, registry).

    Deterministic: same input bytes always produce identical output
    (fixed mappings, sorted columns, no randomness).
    """
    raw = df.copy() if df is not None else load_raw()
    rename = {c: normalize_name(str(c)) for c in raw.columns}
    raw = raw.rename(columns=rename)

    # Drop documented zero-variance columns.
    for original, _reason in DROPPED_COLUMNS.items():
        raw = raw.drop(columns=[normalize_name(original)], errors="ignore")

    out = pd.DataFrame(index=raw.index)

    # Sex: source typo 'Fmale' -> Female; encode Male=1, Female=0.
    out["sex"] = raw["sex"].map({"Male": 1, "Fmale": 0}).astype("int64")

    # Y/N binaries.
    yn_cols = [
        "obesity", "crf", "cva", "airway_disease", "thyroid_disease", "chf", "dlp",
        "weak_peripheral_pulse", "lung_rales", "systolic_murmur", "diastolic_murmur",
        "dyspnea", "atypical", "nonanginal", "lowth_ang", "lvh", "poor_r_progression",
    ]
    for col in yn_cols:
        mapped = raw[col].map(BINARY_YN)
        if mapped.isna().any():
            bad = sorted(raw.loc[mapped.isna(), col].unique().tolist())
            raise ValueError(f"Unexpected values in {col!r}: {bad}")
        out[col] = mapped.astype("int64")

    # Already-numeric 0/1 + small-int columns: coerce and validate.
    int_cols = [
        "dm", "htn", "current_smoker", "ex_smoker", "fh", "edema",
        "typical_chest_pain", "function_class", "q_wave", "st_elevation",
        "st_depression", "tinversion", "region_rwma",
    ]
    for col in int_cols:
        out[col] = pd.to_numeric(raw[col], errors="raise").astype("int64")

    # Continuous numerics.
    float_cols = [
        "age", "weight", "length", "bmi", "bp", "pr", "fbs", "cr", "tg", "ldl",
        "hdl", "bun", "esr", "hb", "k", "na", "wbc", "lymph", "neut", "plt", "ef_tte",
    ]
    for col in float_cols:
        out[col] = pd.to_numeric(raw[col], errors="raise").astype("float64")

    # BBB: keep 3-level category (one-hot happens in the feature pipeline).
    if sorted(raw["bbb"].unique().tolist()) != ["LBBB", "N", "RBBB"]:
        raise ValueError(f"Unexpected BBB levels: {sorted(raw['bbb'].unique().tolist())}")
    out["bbb"] = raw["bbb"].astype("string")

    # VHD ordinal: N=0, mild=1, Moderate=2, Severe=3.
    vhd = raw["vhd"].map(VHD_ORDER)
    if vhd.isna().any():
        raise ValueError(f"Unexpected VHD levels: {sorted(raw.loc[vhd.isna(), 'vhd'].unique().tolist())}")
    out["vhd"] = vhd.astype("int64")

    # Targets: vessels Stenotic=1; Cath CAD/Normal; CAD derived from Cath.
    for vessel in ("lad", "lcx", "rca"):
        mapped = raw[vessel].map({"Stenotic": 1, "Normal": 0})
        if mapped.isna().any():
            raise ValueError(f"Unexpected {vessel} levels: {sorted(raw.loc[mapped.isna(), vessel].unique().tolist())}")
        out[vessel] = mapped.astype("int64")
    cath = raw["cath"].map({"CAD": 1, "Normal": 0})
    if cath.isna().any():
        raise ValueError(f"Unexpected Cath levels: {sorted(raw.loc[cath.isna(), 'cath'].unique().tolist())}")
    out["cath"] = cath.astype("int64")
    out["cad"] = out["cath"].astype("int64")  # overall CAD label == angiography result

    # Stable column order: features alphabetically, then targets in TARGETS order.
    target_order = [t.lower() for t in TARGETS] + ["cath"]
    feature_cols = sorted(c for c in out.columns if c not in target_order)
    out = out[feature_cols + [c for c in target_order if c in out.columns]]

    registry = build_registry(raw_columns=list(rename.values()))
    return out, registry


def build_registry(raw_columns: list[str] | None = None) -> dict:
    """clean name -> {original, label, unit, normal, group, kind}."""
    back = {normalize_name(str(c)): str(c) for c in (raw_columns or [])}
    registry: dict[str, dict] = {}
    for name, (group, label, unit, normal) in COLUMN_META.items():
        if name in ("bbb",):
            kind = "categorical"
        elif name in ("lad", "lcx", "rca", "cath", "cad"):
            kind = "target"
        elif name == "vhd":
            kind = "ordinal"
        else:
            kind = "binary" if normal in ("No / Yes", "Male / Female") else "numeric"
        registry[name] = {
            "original": back.get(name, name),
            "label": label,
            "unit": unit,
            "normal": normal,
            "group": group,
            "kind": kind,
        }
    return registry


def save_processed(df: pd.DataFrame, registry: dict) -> tuple[Path, Path]:
    """Write data/processed/clean.csv + data/feature_schema.json (CSV: no new deps)."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    clean_path = PROCESSED_DIR / "clean.csv"
    schema_path = DATA_DIR / "feature_schema.json"
    df.to_csv(clean_path, index=False)

    schema = {
        "targets": [t.lower() for t in TARGETS] + ["cath"],
        "features": {
            name: {**meta, "dtype": str(df[name].dtype)}
            for name, meta in registry.items()
            if name in df.columns and meta["group"] != "target"
        },
    }
    schema_path.write_text(json.dumps(schema, indent=2))
    return clean_path, schema_path
