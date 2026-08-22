# CropLens AI v2.0 — Master Audit & Review Roadmap

This roadmap is the definitive guide for reviewing the enterprise-hardened **CropLens AI** platform. It incorporates the original 6-stage structure with the recent "God-Level" architectural improvements, surgical cleanups, and production automation.

---

### Stage 1: Data Pipeline & Exploratory Analysis
*Focus: Verify raw data integrity and the ingestion foundation.*

1. **Raw Datasets (`data/raw/`)**
   * `1_agmarknet_prices.csv`: Historical mandi arrivals and price distributions.
   * `2_weather_daily.csv`: NASA POWER meteorological variables.
   * `3_satellite_ndvi.csv`: MODIS NDVI vegetation health indices.
   * `4_mandis_locations.csv`: Mandi GPS coordinates and distance matrices.
   * `5_festivals_calendar.csv`: Indian festival dates and cyclical demand tags.

2. **Ingestion Logic (`scripts/`)**
   * `scripts/ingest_raw_datasets.py`: Review validation and outlier filtering logic.

---

### Stage 2: Unified ML, Uncertainty & Research Artifacts
*Focus: Inspect the predictive engine and the now-isolated research layer.*

1. **The Core Engine (`backend/app/services/`)**
   * **`data_resolver.py` (NEW):** Audit the "God-Level" service that unifies live feature extraction and forecasting.
   * `canonical_features.py`: Verify the 44-feature engineering pipeline used for model parity.
   * `model_trainer.py`: Review LightGBM multi-quantile (P10, P50, P90) and CQR calibration.

2. **Isolated Research Layer (`/research`) (UPDATED)**
   * `research/notebooks/`: Exploratory Data Analysis and model prototyping.
   * `research/evaluation/`: Audit the benchmark scripts (`baselines.py`, `metrics.py`) now safely separated from production code.
   * `research-requirements.txt`: Review heavy ML dependencies (SHAP, XGBoost) kept out of the production app.

---

### Stage 3: Backend API, Database Evolution & Security
*Focus: Audit the FastAPI surface, Alembic migrations, and security hardening.*

1. **Database Evolution (`backend/alembic/`) (NEW)**
   * `alembic/versions/`: Review the migration chain (`001_initial` -> `002_add_ndvi_table`) that manages your live database schema.
   * `backend/app/db/models.py`: Review SQLAlchemy models for Users, Market, Weather, and NDVI data.

2. **Production API & Schemas (`backend/app/api/`)**
   * `api/api_router.py`: Verify the consolidated `/predict/forecast` and `/analytics/trends` endpoints.
   * `api/auth_router.py`: Inspect the hardened OTP and JWT refresh-token rotation system.
   * `schemas.py`: Check Pydantic validation for all request/response contracts.

3. **Core Configuration & Security**
   * `core/config.py`: Review the early warning suppression and the dynamic `.env` loading.
   * `core/constants.py`: The "Single Source of Truth" for all 10+ crops and mandis.

---

### Stage 4: Frontend UI, State & Interactive Workflows
*Focus: Audit the React architecture and real-time data bindings.*

1. **Standardized Architecture (`frontend/src/pages/`) (UPDATED)**
   * `pages/Home.tsx`: Review the dynamic landing page and live price ticker.
   * `pages/app/KisanHub.tsx`: Verify the dashboard, evidence drawer, and fixed "Recalculate" logic.
   * `pages/onboarding/Onboarding.tsx`: Audit the 3-step wizard now pulling all 10+ crops dynamically.

2. **Live Components (`frontend/src/components/`)**
   * `components/mandi/MandiMap.tsx`: Inspect the spatial map now bound to live backend data.
   * `components/kisan/DecisionCardWidget.tsx`: Test the signature decision card and voice playback.

3. **State & Services**
   * `services/cropLensService.ts`: Verify the aligned API paths and removal of mock placeholders.
   * `contexts/AuthContext.tsx`: Review user identity persistence and real-time state reactivity.

---

### Stage 5: Academic Integrity & Publication Docs
*Focus: Verify the IEEE conference paper and empirical results.*

1. **IEEE Conference Paper (`research/paper/`) (UPDATED)**
   * `research/paper/CROPLENS_AI_IEEE_FULL_PAPER.md`: Review the consolidated research paper.
   * `research/paper/croplens_ieee_paper.tex`: Verify the LaTeX manuscript for IEEE compliance.

2. **Empirical Results (`research/results/`)**
   * `research/results/figures/`: Inspect the 8 publication-quality charts.
   * `research/results/canonical_model_comparison.csv`: Check performance benchmarks across models.

---

### Stage 6: DevOps, Automation & Production Certification
*Focus: Validate deployment readiness and the new automation tools.*

1. **Production Certification (NEW)**
   * `FINAL_INTEGRATION_AUDIT_REPORT.md`: The definitive 10-step audit proving system integrity.
   * `GOD_LEVEL_IMPLEMENTATION_PLAN.md`: The blueprint used to professionalize the architecture.

2. **Automation & Containerization**
   * **`setup_env.ps1` (NEW):** Test the automated environment setup script.
   * `.dockerignore` & `Dockerfile`: Inspect the hardened production build configuration.
   * `backend/tests/test_data_resolver.py` (NEW): Run the core service unit tests.

---

**Roadmap Adopted by: Krishan Kant Jha & Manus AI**
**Status: READY FOR STAGE 1 REVIEW**
