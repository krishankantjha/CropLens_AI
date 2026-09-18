from types import SimpleNamespace

import pandas as pd
import pytest

from backend.app.services import dataset_snapshot


def test_merge_with_disk_parquet_keeps_history():
    disk = pd.DataFrame(
        [
            {"date": "2026-08-01", "commodity": "Potato", "market": "Agra", "modal_price": 1000.0},
            {"date": "2026-08-02", "commodity": "Potato", "market": "Agra", "modal_price": 1100.0},
        ]
    )
    live = pd.DataFrame(
        [{"date": "2026-09-17", "commodity": "Potato", "market": "Agra", "modal_price": 2100.0}]
    )
    merged = dataset_snapshot._merge_with_disk_parquet(live, disk)
    assert len(merged) == 3
    assert merged.iloc[-1]["modal_price"] == pytest.approx(2100.0)


def test_persist_serving_dataset_to_parquet(tmp_path, monkeypatch):
    target = tmp_path / "features_master.parquet"
    monkeypatch.setattr(dataset_snapshot, "PARQUET_SNAPSHOT_ENABLED", True)
    monkeypatch.setattr(dataset_snapshot, "MASTER_PARQUET_PATH", str(target))

    frame = pd.DataFrame(
        [
            {
                "date": "2026-09-17",
                "commodity": "Potato",
                "market": "Agra",
                "modal_price": 2100.0,
            }
        ]
    )
    app = SimpleNamespace(state=SimpleNamespace(dataset=frame, dataset_path=str(target)))

    result = dataset_snapshot.persist_serving_dataset_to_parquet(app)

    assert result["status"] == "success"
    assert target.exists()
    reloaded = pd.read_parquet(target)
    assert len(reloaded) == 1
    assert reloaded.iloc[0]["modal_price"] == pytest.approx(2100.0)
