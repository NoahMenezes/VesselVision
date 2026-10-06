"""Headless EDA: stats to stdout + figures to docs/figures/.

Run:  uv run python -m app.eda
Uses only the cleaned frame (app.data.clean) so numbers match the notebook.
"""

from __future__ import annotations

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.metrics import roc_auc_score

from app.data import clean

FIG_DIR = None  # resolved in main() from repo layout


def class_balance(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for target in ("cad", "lad", "lcx", "rca", "cath"):
        pos = int(df[target].sum())
        rows.append({"target": target, "n_pos": pos, "n_neg": len(df) - pos,
                     "pos_rate": round(pos / len(df), 3)})
    return pd.DataFrame(rows)


def leakage_check(df: pd.DataFrame) -> pd.DataFrame:
    """How strongly do Cath/LAD/LCX/RCA alone predict CAD?

    Justifies excluding them from every feature matrix (see docs).
    Single-binary-feature ROC-AUC of each leakage column vs CAD.
    """
    rows = []
    for col in ("cath", "lad", "lcx", "rca"):
        auc = roc_auc_score(df["cad"], df[col])
        p_cad_given_pos = df.loc[df[col] == 1, "cad"].mean()
        rows.append({"feature": col, "single_feature_auc_vs_cad": round(auc, 3),
                     "P(CAD | feature=1)": round(float(p_cad_given_pos), 3)})
    return pd.DataFrame(rows)


def save_figures(df: pd.DataFrame, fig_dir) -> list[str]:
    fig_dir.mkdir(parents=True, exist_ok=True)
    made = []

    # 1. class balance
    bal = class_balance(df)
    fig, ax = plt.subplots(figsize=(7, 3.5))
    x = range(len(bal))
    ax.bar(x, bal["n_neg"], label="Negative")
    ax.bar(x, bal["n_pos"], bottom=bal["n_neg"], label="Positive")
    ax.set_xticks(list(x), bal["target"])
    ax.set_ylabel("Patients (n=303)")
    ax.set_title("Class balance per target")
    ax.legend()
    p = fig_dir / "eda_class_balance.png"
    fig.tight_layout()
    fig.savefig(p, dpi=120)
    plt.close(fig)
    made.append(str(p))

    # 2. missingness (expect all-zero; proves the check ran)
    miss = df.isna().sum()
    fig, ax = plt.subplots(figsize=(7, 2.5))
    ax.bar(range(len(miss)), miss.values)
    ax.set_title(f"Missing values per column (total={int(miss.sum())})")
    ax.set_xlabel("Column index")
    p = fig_dir / "eda_missingness.png"
    fig.tight_layout()
    fig.savefig(p, dpi=120)
    plt.close(fig)
    made.append(str(p))

    # 3. correlation heatmap (numeric features only)
    num = df.select_dtypes(include="number").drop(columns=["cad", "lad", "lcx", "rca", "cath"])
    corr = num.corr(numeric_only=True)
    fig, ax = plt.subplots(figsize=(9, 8))
    im = ax.imshow(corr.values, vmin=-1, vmax=1, cmap="coolwarm")
    ax.set_xticks(range(len(corr.columns)), corr.columns, rotation=90, fontsize=6)
    ax.set_yticks(range(len(corr.columns)), corr.columns, fontsize=6)
    ax.set_title("Feature correlation (numeric)")
    fig.colorbar(im, ax=ax, shrink=0.8)
    p = fig_dir / "eda_correlation.png"
    fig.tight_layout()
    fig.savefig(p, dpi=120)
    plt.close(fig)
    made.append(str(p))

    # 4. age + typical distributions by CAD status
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.5))
    for i, col in enumerate(["age", "typical_chest_pain"]):
        axes[i].hist([df.loc[df.cad == 0, col], df.loc[df.cad == 1, col]],
                     label=["Normal", "CAD"], bins=15 if col == "age" else 2)
        axes[i].set_title(f"{col} by CAD status")
        axes[i].legend()
    p = fig_dir / "eda_distributions.png"
    fig.tight_layout()
    fig.savefig(p, dpi=120)
    plt.close(fig)
    made.append(str(p))
    return made


def main() -> None:
    from pathlib import Path

    global FIG_DIR
    repo_root = Path(__file__).resolve().parent.parent.parent
    fig_dir = repo_root / "docs" / "figures"
    df, _registry = clean()
    print("shape:", df.shape)
    print("\ndtypes:\n", df.dtypes.value_counts().to_string())
    print("\nclass balance:\n", class_balance(df).to_string(index=False))
    print("\nleakage check (single-feature AUC vs CAD):\n",
          leakage_check(df).to_string(index=False))
    print("\nNOTE: cath AUC = 1.0 because CAD is defined as (Cath == CAD); "
          "vessel AUCs are high because CAD = any-vessel-stenotic. "
          "This is exactly why LAD/LCX/RCA/Cath must never be features.")
    for p in save_figures(df, fig_dir):
        print("wrote", p)


if __name__ == "__main__":
    main()
