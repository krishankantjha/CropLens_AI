"""
CropLens AI — Canonical Backend Constants & Single Source of Truth
Defines whitelisted commodities, APMC mandis, coordinates, and vernacular dictionaries.
"""

from typing import List, Dict, Any

VALID_COMMODITIES: List[str] = [
    "Chilli Red",
    "Gram(Chana)",
    "Maize",
    "Mustard",
    "Onion",
    "Paddy(Dhan)",
    "Potato",
    "Soyabean",
    "Tomato",
    "Wheat",
]

VALID_MARKETS: List[str] = [
    "Agra",
    "Azadpur",
    "Farrukhabad",
    "Guntur",
    "Indore",
    "Karnal",
    "Khanna",
    "Kolkata",
    "Lasalgaon",
    "Mathura",
]

CROP_NAMES_HI: Dict[str, str] = {
    "Potato": "आलू",
    "Onion": "प्याज",
    "Tomato": "टमाटर",
    "Wheat": "गेहूं",
    "Paddy(Dhan)": "धान",
    "Maize": "मक्का",
    "Soyabean": "सोयाबीन",
    "Mustard": "सरसों",
    "Gram(Chana)": "चना",
    "Chilli Red": "लाल मिर्च",
}

MANDI_NAMES_HI: Dict[str, str] = {
    "Agra": "आगरा मंडी",
    "Azadpur": "आज़ादपुर मंडी",
    "Farrukhabad": "फर्रुखाबाद मंडी",
    "Guntur": "गुंटूर मंडी",
    "Indore": "इंदौर मंडी",
    "Karnal": "करनाल मंडी",
    "Khanna": "खन्ना मंडी",
    "Kolkata": "कोलकाता मंडी",
    "Lasalgaon": "लासलगांव मंडी",
    "Mathura": "मथुरा मंडी",
    "Agra APMC": "आगरा मंडी",
    "Azadpur APMC": "आज़ादपुर मंडी",
    "Farrukhabad APMC": "फर्रुखाबाद मंडी",
    "Guntur APMC": "गुंटूर मंडी",
    "Indore APMC": "इंदौर मंडी",
    "Karnal APMC": "करनाल मंडी",
    "Khanna APMC": "खन्ना मंडी",
    "Kolkata APMC": "कोलकाता मंडी",
    "Lasalgaon APMC": "लासलगांव मंडी",
    "Mathura APMC": "मथुरा मंडी",
}

MANDI_COORDINATES: Dict[str, Dict[str, Any]] = {
    "Agra": {"lat": 27.1767, "lon": 78.0081, "state": "Uttar Pradesh"},
    "Khanna": {"lat": 30.7071, "lon": 76.2167, "state": "Punjab"},
    "Azadpur": {"lat": 28.7041, "lon": 77.1725, "state": "Delhi"},
    "Mathura": {"lat": 27.4924, "lon": 77.6737, "state": "Uttar Pradesh"},
    "Lasalgaon": {"lat": 20.1477, "lon": 74.2252, "state": "Maharashtra"},
    "Karnal": {"lat": 29.6857, "lon": 76.9905, "state": "Haryana"},
    "Indore": {"lat": 22.7196, "lon": 75.8577, "state": "Madhya Pradesh"},
    "Farrukhabad": {"lat": 27.3826, "lon": 79.5830, "state": "Uttar Pradesh"},
    "Guntur": {"lat": 16.3067, "lon": 80.4365, "state": "Andhra Pradesh"},
    "Kolkata": {"lat": 22.5726, "lon": 88.3639, "state": "West Bengal"},
}
