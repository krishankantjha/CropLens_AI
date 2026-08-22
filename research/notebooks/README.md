# EDA Notebook Workflow

The EDA notebook is `eda.ipynb`. Run it from the repository root or use a notebook runner configured with the repository root as its working directory so relative paths resolve consistently.

Before committing notebook changes, execute the notebook from top to bottom, confirm that the expected dataset is loaded, inspect the generated figures and diagnostic tables, and review the Git diff. Avoid committing incidental kernel metadata or unrelated output changes. When a figure is intentionally regenerated, commit the notebook logic and the corresponding report artifacts together.

The notebook writes EDA figures and tabular diagnostics to `reports/eda_insights/`. The generated `artifact_manifest.csv` records each exported artifact, its relative path, type, size, and generation timestamp.
