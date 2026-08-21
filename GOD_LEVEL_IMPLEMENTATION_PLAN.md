# CropLens AI — God-Level Implementation Plan

## 1. Introduction
This plan outlines a comprehensive, production-grade refactoring and optimization strategy for **CropLens AI**. The goal is to transition the project from a research-heavy prototype to an enterprise-ready agricultural intelligence platform. Every step is designed to maximize performance, security, and maintainability while preserving the scientific integrity of the LightGBM-based forecasting models.

---

## 2. Phase 1: Surgical Cleanup & Research Isolation
*Objective: Remove dead code, redundant dependencies, and isolate research artifacts to lighten the production footprint.*

### 2.1 Dependency Pruning
*   **Problem:** `requirements.txt` contains `xgboost`, `catboost`, `optuna`, and `torch`, which are not used in the current production inference service.
*   **Solution:** Strip these dependencies from the primary `requirements.txt` and move them to a new `research-requirements.txt`.
*   **Impact:** Reduced build times, smaller Docker images, and lower memory overhead.

### 2.2 Research Artifact Isolation
*   **Problem:** The `backend/app/evaluation` folder and `reports/research_results` are polluting the production backend.
*   **Solution:** 
    *   Create a top-level `research/` directory.
    *   Move `backend/app/evaluation` to `research/evaluation`.
    *   Move experimental notebooks and raw research results to `research/artifacts`.
*   **Impact:** Clear separation of concerns; production code remains focused only on serving users.

### 2.3 Dead Code Removal
*   **Problem:** `drift_monitor.py` and `demo.ts` are present but unused.
*   **Solution:** Delete `backend/app/services/drift_monitor.py` and `frontend/src/data/demo.ts`.
*   **Impact:** Cleaner codebase, reduced cognitive load for future developers.

---

## 3. Phase 2: Architectural Consolidation
*Objective: Eliminate duplication and unify data processing pipelines.*

### 3.1 The "DataResolver" Unified Service
*   **Problem:** Feature extraction and historical data lookup are duplicated across `predict_price_service` and `predict_7day_forecast_service`.
*   **Solution:** 
    *   Implement a central `DataResolver` service in `backend/app/services/data_resolver.py`.
    *   This service will handle all interactions with the Parquet feature store and apply unified feature transformations.
*   **Impact:** Single source of truth for feature engineering; fixes to the data pipeline only need to be made in one place.

### 3.2 Dynamic Resource Discovery
*   **Problem:** The `/system/resources` endpoint and frontend commodity lists are hardcoded.
*   **Solution:** 
    *   Update the backend to dynamically generate the commodity/mandi list from the `constants.py` and the actual database records.
    *   Expose a single `GET /api/v1/system/catalog` endpoint that the frontend consumes on startup.
*   **Impact:** Adding a new crop or market no longer requires updating both frontend and backend code.

---

## 4. Phase 3: Advanced Backend Optimization
*Objective: Refactor complex logic into maintainable, professional patterns.*

### 4.1 Recursive Forecasting Refactor
*   **Problem:** The 7-day recursive forecasting loop in `api_service.py` manually recalculates EMAs and technical indicators, which is error-prone.
*   **Solution:** 
    *   Refactor the loop to call the `Canonical Feature Engineering` service for each step.
    *   Ensure the recursive state (lagged prices) is passed correctly through the unified pipeline.
*   **Impact:** Drastically reduces the complexity of the forecasting service and ensures 100% consistency between training and inference features.

### 4.2 API Route Consolidation
*   **Problem:** Redundant endpoints like `GET` and `POST` for the same forecast logic.
*   **Solution:** 
    *   Consolidate all forecasting into a single `POST /api/v1/predict/forecast` endpoint.
    *   Use a `horizon` parameter to distinguish between single-day and multi-day requests.
*   **Impact:** Simplified API surface area; easier for mobile apps or external partners to integrate.

---

## 5. Phase 4: Frontend Professionalization
*Objective: Align the UI architecture with modern React best practices.*

### 5.1 Route-Level Component Standardization
*   **Problem:** Mixed use of `pages/` and `views/` directories.
*   **Solution:** 
    *   Move all components associated with a route to the `src/pages/` directory.
    *   Reserve `src/components/` for reusable, shared UI elements (atomic design).
*   **Impact:** Predictable project structure; faster onboarding for new developers.

### 5.2 UI Primitive Consolidation
*   **Problem:** Overlap between custom `ManusDialog.tsx` and Radix UI primitives.
*   **Solution:** 
    *   Standardize on a single design system (Radix + Tailwind).
    *   Refactor custom dialogs to use the unified Radix pattern.
*   **Impact:** Consistent look-and-feel across the entire application.

---

## 6. Execution & Risk Management
*   **Identity:** All commits will be made under `Krishan Kant Jha <jhakrishankant89@gmail.com>`.
*   **Workflow:** Each sub-task will be performed in a separate feature branch and merged into `main` only after verification.
*   **Rollback:** Every phase includes a `git revert` point to ensure zero downtime.

---
**Prepared by Manus AI for Krishan Kant Jha.**
