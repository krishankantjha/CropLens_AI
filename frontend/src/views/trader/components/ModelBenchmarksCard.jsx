import React from 'react';
import { Cpu, Award } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export default function ModelBenchmarksCard() {
  const { lang } = useLanguage();
  const isHi = lang === 'hi';

  const models = [
    {
      name: "LightGBM Quantile Regressors",
      type: "Multi-Quantile (P10/P50/P90)*",
      r2: "0.998",
      rmse: "₹212.87",
      mae: "₹59.58",
      mape: "0.78%",
      latency: "1.2 ms",
      isBest: true
    },
    {
      name: "XGBoost Regressor",
      type: "Extreme Gradient Boosting",
      r2: "0.998",
      rmse: "₹198.50",
      mae: "₹57.16",
      mape: "0.82%",
      latency: "1.8 ms",
      isBest: false
    },
    {
      name: "CatBoost Regressor",
      type: "Categorical Gradient Boosting",
      r2: "0.998",
      rmse: "₹211.52",
      mae: "₹84.33",
      mape: "1.42%",
      latency: "2.4 ms",
      isBest: false
    },
    {
      name: "Ridge Linear Baseline",
      type: "L2 Regularized Linear",
      r2: "0.992",
      rmse: "₹59.36",
      mae: "₹29.77",
      mape: "0.60%",
      latency: "0.4 ms",
      isBest: false
    },
    {
      name: "PyTorch 2-Layer LSTM",
      type: "Deep Recurrent Sequence (47 Feat)",
      r2: "0.996",
      rmse: "₹327.80",
      mae: "₹112.98",
      mape: "1.53%",
      latency: "12.0 ms",
      isBest: false
    },
    {
      name: "PyTorch 2-Layer GRU",
      type: "Deep Recurrent Sequence (47 Feat)",
      r2: "0.996",
      rmse: "₹331.64",
      mae: "₹110.05",
      mape: "1.54%",
      latency: "11.5 ms",
      isBest: false
    },
    {
      name: "Temporal Fusion Transformer (TFT)",
      type: "Deep Attention (30d Horizon)",
      r2: "0.997",
      rmse: "₹246.73",
      mae: "₹87.53",
      mape: "3.73%",
      latency: "85.0 ms",
      isBest: false
    },
    {
      name: "Classical ARIMA(1,1,1)",
      type: "Stochastic Time Series Baseline",
      r2: "0.960",
      rmse: "₹1009.80",
      mae: "₹668.08",
      mape: "14.71%",
      latency: "45.0 ms",
      isBest: false
    }
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4 font-['Inter']">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center text-[#046c4e]">
            <Cpu className="h-5 w-5 text-[#046c4e]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              {isHi ? "एआई मॉडल प्रदर्शन मेट्रिक्स" : "Multi-Model Benchmark Evaluation"}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {isHi ? "135,471 मंडी रिकॉर्ड्स पर तुलनात्मक परीक्षण (2019-2025)" : "Comparative benchmark metrics evaluated on 2025 Holdout Test Set (19,303 days)"}
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-[#046c4e] bg-[#f0fdf4] px-3 py-1 rounded-full border border-[#bbf7d0]">
          Hybrid AI Engine
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-['Inter']">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">{isHi ? "मॉडल नाम" : "Model Name"}</th>
              <th className="py-3 px-4">{isHi ? "आर्किटेक्चर" : "Architecture"}</th>
              <th className="py-3 px-4">R² Score</th>
              <th className="py-3 px-4">RMSE</th>
              <th className="py-3 px-4">MAE</th>
              <th className="py-3 px-4">MAPE (%)</th>
              <th className="py-3 px-4">{isHi ? "प्रतिक्रिया समय" : "Inference Latency"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {models.map((m, idx) => (
              <tr key={idx} className={m.isBest ? "bg-[#f0fdf4]/60 font-semibold" : "hover:bg-slate-50"}>
                <td className="py-3.5 px-4 flex items-center gap-2 font-bold text-slate-900">
                  {m.name}
                  {m.isBest && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300 font-bold">
                      <Award className="h-3 w-3 text-amber-600" /> Best Production Model
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-slate-600">{m.type}</td>
                <td className="py-3.5 px-4 font-bold text-[#046c4e]">{m.r2}</td>
                <td className="py-3.5 px-4 text-slate-800">{m.rmse}</td>
                <td className="py-3.5 px-4 text-slate-800">{m.mae}</td>
                <td className="py-3.5 px-4 font-bold text-[#046c4e]">{m.mape}</td>
                <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{m.latency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
