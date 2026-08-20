# CropLens AI — Research Paper Draft
## Section IX: Conclusion & IEEE References

---

### **Section IX: Conclusion**

In this paper, we presented **CropLens AI**, a calibrated multi-quantile probabilistic forecasting and multi-source feature fusion framework designed specifically for agricultural price intelligence across Indian APMC spot mandis. Addressing the fundamental limitations of classical point-forecast models—which fail to quantify downside market risk—and unconstrained quantile models—which suffer from quantile crossings and uncalibrated interval coverage—CropLens AI establishes an end-to-end mathematically guaranteed risk quantification pipeline.

The primary contributions and empirical conclusions of this research are summarized as follows:
1. **Multi-Source Agro-Feature Benchmark Corpus:** We constructed a harmonized, leakage-free multi-source dataset comprising 135,471 observations across 10 major commodities and 10 geographically diverse APMC mandis over a continuous 7-year timeline (2019–2025). The engineered 47-feature taxonomy systematically integrates daily auction price spreads, physical arrival volumes, meteorological stress observations, Sentinel-2 satellite NDVI vegetation health, spatial transport gradients, and cultural festival demand dynamics.
2. **Guaranteed Monotonicity and Conformal Calibration:** By coupling multi-quantile LightGBM regressors with Chernozhukov Monotonic Rearrangement, the framework mathematically eliminated all 2,942 raw quantile crossings down to **0 (0.00% crossing rate)** without altering prediction sharpness. Applying Group-Conditional Mondrian Conformalized Quantile Regression (CQR) on an independent calibration pool achieved an empirical out-of-sample coverage rate of **79.85%** (against an nominal 80.0% target) on the strictly held-out 2025 test partition ($19,303\text{ observations}$), with a sharp Mean Prediction Interval Width (MPIW) of **Rs 166.91/quintal**.
3. **Rigorous Point-Forecast and Multi-Loss Benchmarking:** On point-forecast accuracy, LightGBM P50 significantly outperformed the zero-shot Naive Persistence baseline across **7 of the 10 evaluated commodities**, achieving substantial error reductions: Potato ($+46.6\%$), Maize ($+45.0\%$), Onion ($+38.6\%$), Paddy ($+29.3\%$), Tomato ($+27.8\%$), Soyabean ($+21.2\%$), and Wheat ($+20.3\%$). Exhaustive pairwise Diebold-Mariano tests with Newey-West HAC robust standard errors confirmed statistically significant differences across loss formulations.
4. **Spatial Generalization and Interpretability:** Leave-One-Mandi-Out (LOMO) spatial cross-validation confirmed robust spatial transfer across 8 of 10 mandis ($\text{MAE } \text{Rs } 25.40 - 44.80/\text{qtl}$). Global TreeSHAP feature attributions and grouped Granger causality with Benjamini-Hochberg FDR correction established that physical arrivals, thermal extremes, and precipitation provide genuine predictive precedence beyond autoregressive price memory alone.

By transforming agricultural price forecasting from a point-regression estimate into a calibrated, distribution-free risk envelope, CropLens AI provides actionable decision support for smallholder farmers seeking protection against distress selling and institutional agencies executing large-scale procurement operations.

---

### **References**

```bibtex
@article{koenker1978regression,
  title={Regression quantiles},
  author={Koenker, Roger and Bassett Jr, Gilbert},
  journal={Econometrica: journal of the Econometric Society},
  pages={33--50},
  year={1978}
}

@article{chernozhukov2010quantile,
  title={Quantile and probability curves without sorting},
  author={Chernozhukov, Victor and Fern{\'a}ndez-Val, Iv{\'a}n and Galichon, Alfred},
  journal={Econometrica},
  volume={78},
  number={3},
  pages={1093--1125},
  year={2010}
}

@article{romano2019conformalized,
  title={Conformalized quantile regression},
  author={Romano, Yaniv and Patterson, Evan and Cand{\`e}s, Emmanuel},
  journal={Advances in Neural Information Processing Systems (NeurIPS)},
  volume={32},
  year={2019}
}

@book{vovk2005algorithmic,
  title={Algorithmic learning in a random world},
  author={Vovk, Vladimir and Gammerman, Alex and Shafer, Glenn},
  year={2005},
  publisher={Springer Science \& Business Media}
}

@article{shafer2008tutorial,
  title={A tutorial on conformal prediction},
  author={Shafer, Glenn and Vovk, Vladimir},
  journal={Journal of Machine Learning Research},
  volume={9},
  number={Mar},
  pages={371--421},
  year={2008}
}

@article{ke2017lightgbm,
  title={LightGBM: A highly efficient gradient boosting decision tree},
  author={Ke, Guolin and Meng, Qi and Finley, Thomas and Wang, Taifeng and Chen, Wei and Ma, Weidong and Ye, Qiwei and Liu, Tie-Yan},
  journal={Advances in Neural Information Processing Systems (NeurIPS)},
  volume={30},
  year={2017}
}

@inproceedings{chen2016xgboost,
  title={XGBoost: A scalable tree boosting system},
  author={Chen, Tianqi and Guestrin, Carlos},
  booktitle={Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining},
  pages={785--794},
  year={2016}
}

@article{prokhorenkova2018catboost,
  title={CatBoost: unbiased boosting with categorical features},
  author={Prokhorenkova, Liudmila and Gusev, Gleb and Vorobev, Aleksandr and Dorogush, Anna Veronika and Gulin, Andrey},
  journal={Advances in Neural Information Processing Systems (NeurIPS)},
  volume={31},
  year={2018}
}

@article{grinsztajn2022tree,
  title={Why do tree-based models still outperform deep learning on typical tabular data?},
  author={Grinsztajn, L{\'e}o and Oyallon, Edouard and Varoquaux, Ga{\"e}l},
  journal={Advances in Neural Information Processing Systems (NeurIPS)},
  volume={35},
  pages={507--520},
  year={2022}
}

@article{lim2021temporal,
  title={Temporal fusion transformers for interpretable multi-horizon time series forecasting},
  author={Lim, Bryan and Ar{\i}k, Sercan {\"O} and Loeff, Nicolas and Pfister, Tomas},
  journal={International Journal of Forecasting},
  volume={37},
  number={4},
  pages={1748--1764},
  year={2021}
}

@article{hochreiter1997long,
  title={Long short-term memory},
  author={Hochreiter, Sepp and Schmidhuber, J{\"u}rgen},
  journal={Neural Computation},
  volume={9},
  number={8},
  pages={1735--1780},
  year={1997}
}

@article{cho2014learning,
  title={Learning phrase representations using RNN encoder-decoder for statistical machine translation},
  author={Cho, Kyunghyun and Van Merri{\"e}nboer, Bart and Gulcehre, Caglar and Bahdanau, Dzmitry and Bougares, Fethi and Schwenk, Holger and Bengio, Yoshua},
  journal={arXiv preprint arXiv:1406.1078},
  year={2014}
}

@article{diebold1995comparing,
  title={Comparing predictive accuracy},
  author={Diebold, Francis X and Mariano, Roberto S},
  journal={Journal of Business \& Economic Statistics},
  volume={13},
  number={3},
  pages={253--263},
  year={1995}
}

@article{newey1987simple,
  title={A simple, positive semi-definite, heteroskedasticity and autocorrelation consistent covariance matrix},
  author={Newey, Whitney K and West, Kenneth D},
  journal={Econometrica},
  pages={703--708},
  year={1987}
}

@article{ljung1978measure,
  title={On a measure of lack of fit in time series models},
  author={Ljung, Greta M and Box, George EP},
  journal={Biometrika},
  volume={65},
  number={2},
  pages={297--303},
  year={1978}
}

@article{lundberg2020local,
  title={From local explanations to global understanding with explainable AI for trees},
  author={Lundberg, Scott M and Erion, Gabriel and Chen, Hugh and DeGrave, Alex and Prutkin, Jordan M and Nair, Bala and Katz, Ronit and Himmelfarb, Jonathan and Bansal, Nisha and Lee, Su-In},
  journal={Nature Machine Intelligence},
  volume={2},
  number={1},
  pages={56--67},
  year={2020}
}

@article{benjamini1995controlling,
  title={Controlling the false discovery rate: a practical and powerful approach to multiple testing},
  author={Benjamini, Yoav and Hochberg, Yosef},
  journal={Journal of the Royal Statistical Society: Series B (Methodological)},
  volume={57},
  number={1},
  pages={289--300},
  year={1995}
}

@article{angelopoulos2021gentle,
  title={A gentle introduction to conformal prediction and distribution-free uncertainty quantification},
  author={Angelopoulos, Anastasios N and Bates, Stephen},
  journal={arXiv preprint arXiv:2107.07511},
  year={2021}
}

@article{hyndman2006another,
  title={Another look at measures of forecast accuracy},
  author={Hyndman, Rob J and Koehler, Anne B},
  journal={International Journal of Forecasting},
  volume={22},
  number={4},
  pages={679--688},
  year={2006}
}

@book{box2015time,
  title={Time series analysis: forecasting and control},
  author={Box, George EP and Jenkins, Gwilym M and Reinsel, Gregory C and Ljung, Greta M},
  year={2015},
  publisher={John Wiley \& Sons}
}
```
