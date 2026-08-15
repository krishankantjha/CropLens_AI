import React, { useState } from 'react';
import { History, Download, FileText, CheckCircle2 } from 'lucide-react';
import { downloadProcurementPdfApi } from '../../../services/api';
import { useLanguage } from '../../../context/LanguageContext';

export default function FarmerActivityView({ crop, mandi }) {
  const { lang } = useLanguage();
  const isHi = lang === 'hi';
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await downloadProcurementPdfApi(crop, mandi);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CropLens_${crop}_${mandi}_Advisory.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF Download error:", err);
    } finally {
      setDownloading(false);
    }
  };

  const ACTIVITIES = [
    { id: 1, action: `Price Forecast Generated for ${crop}`, time: "Today, 10:30 AM", status: "Success" },
    { id: 2, action: `Mandi Spatial Profit Check (${mandi} vs Hathras)`, time: "Yesterday, 4:15 PM", status: "Success" },
    { id: 3, action: `Downloaded Procurement PDF Report`, time: "10 Aug 2026", status: "Downloaded" }
  ];

  return (
    <div className="space-y-6 font-['Inter']">
      {/* Title Header */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#046c4e] font-extrabold text-xs uppercase tracking-wider">
            <History className="h-4 w-4" />
            {isHi ? "गतिविधि इतिहास एवं रिपोर्ट डाउनलोड" : "Activity Log & Report Download Center"}
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">
            Audit History & PDF Reports
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {isHi ? "हाल ही में जांची गई फसल दरें और आधिकारिक पीडीएफ रिपोर्ट की प्रतियां" : "Your recent price prediction logs and official procurement PDF reports"}
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-4 py-2.5 rounded-2xl bg-[#046c4e] hover:bg-[#065f46] text-white font-extrabold text-xs shadow-md transition flex items-center gap-2 self-start md:self-auto disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Generating PDF..." : "Download Official PDF Advisory"}
        </button>
      </div>

      {/* Activity Timeline List */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#046c4e]" />
          Recent Activity Timeline
        </h3>

        <div className="space-y-3">
          {ACTIVITIES.map(act => (
            <div key={act.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4 text-xs font-semibold">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-[#046c4e]" />
                </div>
                <div>
                  <p className="text-slate-900 font-bold">{act.action}</p>
                  <span className="text-[10px] text-slate-400 font-medium">{act.time}</span>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#046c4e] border border-emerald-200 text-[10px] font-extrabold">
                {act.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
