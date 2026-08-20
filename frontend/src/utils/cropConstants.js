/**
 * cropConstants.js — Single Source of Truth for Crop Information
 * Centralizes crop identities, icons, multi-language names, baseline prices, and MSP values.
 */

export const CROPS = [
  { id: 'Potato', labelEn: 'Potato', labelHi: 'आलू', icon: '🥔', category: 'Vegetables', defaultPrice: 1480, defaultMsp: 800 },
  { id: 'Onion', labelEn: 'Onion', labelHi: 'प्याज', icon: '🧅', category: 'Vegetables', defaultPrice: 2250, defaultMsp: 1200 },
  { id: 'Tomato', labelEn: 'Tomato', labelHi: 'टमाटर', icon: '🍅', category: 'Vegetables', defaultPrice: 2420, defaultMsp: 1500 },
  { id: 'Wheat', labelEn: 'Wheat', labelHi: 'गेहूं', icon: '🌾', category: 'Cereals', defaultPrice: 2180, defaultMsp: 2275 },
  { id: 'Paddy(Dhan)', labelEn: 'Paddy / Rice', labelHi: 'धान / चावल', icon: '🌾', category: 'Cereals', defaultPrice: 2120, defaultMsp: 2183 },
  { id: 'Maize', labelEn: 'Maize', labelHi: 'मक्का', icon: '🌽', category: 'Cereals', defaultPrice: 1890, defaultMsp: 2090 },
  { id: 'Soyabean', labelEn: 'Soybean', labelHi: 'सोयाबीन', icon: '🟡', category: 'Oilseeds', defaultPrice: 4650, defaultMsp: 4600 },
  { id: 'Mustard', labelEn: 'Mustard', labelHi: 'सरसों', icon: '🟡', category: 'Oilseeds', defaultPrice: 5350, defaultMsp: 5650 },
  { id: 'Gram(Chana)', labelEn: 'Gram (Chana)', labelHi: 'चना', icon: '🫘', category: 'Pulses', defaultPrice: 5280, defaultMsp: 5440 },
  { id: 'Chilli Red', labelEn: 'Dry Chilli', labelHi: 'लाल मिर्च', icon: '🌶️', category: 'Spices', defaultPrice: 16800, defaultMsp: 12000 },
];

export const CROP_DEFAULT_PRICES = CROPS.reduce((acc, c) => {
  acc[c.id] = c.defaultPrice;
  return acc;
}, {});
