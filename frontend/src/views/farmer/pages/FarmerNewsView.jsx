import React, { useState } from 'react';
import { Newspaper, ExternalLink, Calendar } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

const NEWS_FEED = [
  {
    id: 1,
    title: "Agra APMC Potato Arrivals Drop by 14% as Cold Storage Dispatches Slow Down",
    titleHi: "आगरा मंडी में आलू की आवक 14% घटी, कोल्ड स्टोरेज से निकासी धीमी",
    summary: "Market arrivals in Agra mandi decreased to 1,200 quintals today, driving spot prices up by ₹80 per quintal. Traders expect demand to stay high until weekend.",
    summaryHi: "आगरा मंडी में आज आलू की आवक घटकर 1,200 क्विंटल रही, जिससे कीमतों में ₹80/क्विंटल की बढ़ोतरी हुई। वीकेंड तक मांग तेज रहने के आसार हैं।",
    category: "Arrival Surge",
    time: "2 hours ago",
    crop: "Potato",
    source: "AgriNews India"
  },
  {
    id: 2,
    title: "Government Announces MSP Incentive for Kharif Season Crop Farmers",
    titleHi: "सरकार ने खरीफ फसल किसानों के लिए एमएसपी प्रोत्साहन की घोषणा की",
    summary: "New minimum support price guidelines issued for regional markets to protect farmers from post-harvest price crashes.",
    summaryHi: "कटाई के बाद कीमतों में गिरावट से किसानों की सुरक्षा के लिए क्षेत्रीय मंडियों हेतु नए एमएसपी दिशा-निर्देश जारी किए गए।",
    category: "Policy Update",
    time: "5 hours ago",
    crop: "General",
    source: "Kisan Times"
  },
  {
    id: 3,
    title: "Lasalgaon Mandi Reports Surge in Onion Shipments to Azadpur Market",
    titleHi: "लासलगांव मंडी से आजादपुर बाजार में प्याज की आपूर्ति में उछाल",
    summary: "Interstate transport corridors from Maharashtra to Delhi registered a 22% increase in truck dispatches today.",
    summaryHi: "महाराष्ट्र से दिल्ली के अंतरराज्यीय परिवहन गलियारे में आज ट्रक आवक में 22% की वृद्धि दर्ज की गई।",
    category: "Transport Corridor",
    time: "1 day ago",
    crop: "Onion",
    source: "APMC Daily"
  }
];

export default function FarmerNewsView({ crop }) {
  const { lang } = useLanguage();
  const isHi = lang === 'hi';
  const [filter, setFilter] = useState('All');

  const filteredNews = NEWS_FEED.filter(item => filter === 'All' || item.crop === filter || item.crop === crop);

  return (
    <div className="space-y-6 font-['Inter']">
      {/* Title Header & Filter */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#046c4e] font-extrabold text-xs uppercase tracking-wider">
            <Newspaper className="h-4 w-4" />
            {isHi ? "कृषि बाजार समाचार और नीति अपडेट" : "Agricultural Market News & Policy Updates"}
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">
            Mandi News & Commodity Intelligence
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {isHi ? "नवीनतम मंडी समाचार, सरकारी नीतियां और आवक अपडेट" : "Real-time APMC arrivals, government tariffs, and crop market reports"}
          </p>
        </div>

        {/* Commodity Filter Pills */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
          {['All', 'Potato', 'Onion', 'Tomato'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-xl transition ${
                filter === cat ? 'bg-[#046c4e] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* News Cards Feed */}
      <div className="space-y-4">
        {filteredNews.map(news => (
          <div key={news.id} className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition space-y-3">
            <div className="flex items-center justify-between">
              <span className="bg-emerald-50 text-[#046c4e] border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {news.category}
              </span>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {news.time}
              </span>
            </div>

            <h3 className="text-base font-extrabold text-slate-900 leading-snug">
              {isHi ? news.titleHi : news.title}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isHi ? news.summaryHi : news.summary}
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>Source: {news.source}</span>
              <span className="text-[#046c4e] font-bold flex items-center gap-1 hover:underline cursor-pointer">
                Read Full Story <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
