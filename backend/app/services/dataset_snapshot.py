"""
Persist the in-memory serving dataset back to features_master.parquet.

Merges live rows into the on-disk parquet instead of blind overwrites so the
historical training panel is never truncated by a partial in-memory state.
"""

from __future__ import annotations

import datetime as dt
import os
import shutil
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd

from backend.app.core.config import (
    MASTER_PARQUET_PATH,
    PARQUET_SNAPSHOT_ENABLED,
    PARQUET_SNAPSHOT_MAX_BACKUPS,
)


def resolve_master_parquet_path(app: Any) -> Optional[Path]:
    """Resolve the canonical parquet path for the loaded serving dataset."""
    configured = MASTER_PARQUET_PATH.strip()
    if configured:
        return Path(configured).expanduser().resolve()

    state_path = getattr(getattr(app, "state", None), "dataset_path", None)
    if state_path:
        return Path(str(state_path)).expanduser().resolve()

    base_dir = Path(__file__).resolve().parents[3]
    candidates = [
        base_dir / "data" / "processed" / "features_master.parquet",
        Path.cwd() / "data" / "processed" / "features_master.parquet",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()
    return candidates[0].resolve()


def _merge_with_disk_parquet(
    in_memory: pd.DataFrame,
    disk_df: pd.DataFrame,
) -> pd.DataFrame:
    """Combine in-memory serving rows with the on-disk master without dropping history."""
    left = in_memory.copy()
    right = disk_df.copy()
    left["date"] = pd.to_datetime(left["date"], errors="coerce")
    right["date"] = pd.to_datetime(right["date"], errors="coerce")

    if len(left) >= len(right):
        combined = left
    else:
        combined = pd.concat([right, left], ignore_index=True)

    combined = combined.drop_duplicates(
        subset=["commodity", "market", "date"],
        keep="last",
    ).sort_values(["market", "commodity", "date"])
    return combined.reset_index(drop=True)


def persist_serving_dataset_to_parquet(app: Any) -> Dict[str, Any]:
    """Merge the current serving dataset into parquet with a rolling backup."""
    if not PARQUET_SNAPSHOT_ENABLED:
        return {"status": "skipped", "reason": "Parquet snapshots are disabled"}

    dataset = getattr(getattr(app, "state", None), "dataset", None)
    if not isinstance(dataset, pd.DataFrame) or dataset.empty:
        return {"status": "skipped", "reason": "Serving dataset is not loaded"}

    target_path = resolve_master_parquet_path(app)
    target_path.parent.mkdir(parents=True, exist_ok=True)

    export_df = dataset.copy()
    if target_path.exists():
        disk_df = pd.read_parquet(target_path)
        if len(export_df) < len(disk_df):
            export_df = _merge_with_disk_parquet(export_df, disk_df)
        backup_dir = target_path.parent / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        timestamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup_path = backup_dir / f"features_master.{timestamp}.parquet"
        shutil.copy2(target_path, backup_path)

        backups = sorted(
            backup_dir.glob("features_master.*.parquet"),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        for stale_backup in backups[PARQUET_SNAPSHOT_MAX_BACKUPS:]:
            try:
                stale_backup.unlink()
            except OSError:
                pass

    if "date" in export_df.columns:
        export_df["date"] = pd.to_datetime(export_df["date"], errors="coerce")

    temp_path = target_path.with_suffix(".parquet.tmp")
    export_df.to_parquet(temp_path, index=False)
    os.replace(temp_path, target_path)

    latest_date = None
    if "date" in export_df.columns:
        valid_dates = export_df["date"].dropna()
        if not valid_dates.empty:
            latest_date = valid_dates.max().date().isoformat()

    app.state.dataset_path = str(target_path)
    return {
        "status": "success",
        "path": str(target_path),
        "rows": len(export_df),
        "latest_date": latest_date,
    }


__all__ = ["persist_serving_dataset_to_parquet", "resolve_master_parquet_path", "_merge_with_disk_parquet"]
