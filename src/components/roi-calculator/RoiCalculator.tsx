'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Star, 
  MessageSquare, 
  Target, 
  Briefcase, 
  TrendingUp, 
  ShieldCheck, 
  MousePointer2 
} from 'lucide-react';
import { Translations, Locale } from '@/lib/translations';
import { 
  calculateReviewsNeededRange, 
  calculateVisibilityImpact, 
  calculateLeadPotential, 
  sanitizeNumericInput, 
  formatRange 
} from '@/lib/roi-calculator/calculations';
import { BusinessType } from '@/lib/roi-calculator/constants';
import { RoiCalculatorInputs, RoiCalculatorResults } from './roi-calculator.types';
import RoiResultCard from './RoiResultCard';

interface RoiCalculatorProps {
  locale: Locale;
  t: Translations;
}

const RoiCalculator: React.FC<RoiCalculatorProps> = ({ locale, t }) => {
  const [inputs, setInputs] = useState<RoiCalculatorInputs>({
    monthlyCustomers: 300,
    currentRating: 4.1,
    currentReviews: 87,
    targetRating: 4.5,
    businessType: 'restaurant',
  });

  const [results, setResults] = useState<RoiCalculatorResults | null>(null);

  useEffect(() => {
    // Perform calculations reactively
    const reviewsNeeded = calculateReviewsNeededRange(inputs);
    const visibilityImpact = calculateVisibilityImpact(inputs);
    const leadPotential = calculateLeadPotential(inputs, visibilityImpact);

    setResults({
      reviewsNeeded,
      visibilityImpact,
      leadPotential,
    });
  }, [inputs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: name === 'businessType' ? value : sanitizeNumericInput(value),
    }));
  };

  const getVisibilityLabel = (level: string) => {
    switch (level) {
      case 'strong': return t.roi_result_visibility_strong;
      case 'medium': return t.roi_result_visibility_medium;
      case 'low': return t.roi_result_visibility_low;
      default: return '';
    }
  };

  const getVisibilityMsg = (level: string) => {
    return t.roi_result_visibility_msg;
  };

  return (
    <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#F7F4F0] relative overflow-hidden" id="roi-calculator">
      {/* Background Accent */}
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#EA580C]/5 rounded-full blur-[120px] translate-y-1/2 translate-x-1/2 -z-0" />
      
      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border-2 border-[#1f1e1d] rounded-full shadow-[3px_3px_0_0_#1f1e1d] mb-4">
            <TrendingUp size={14} className="text-[#EA580C]" strokeWidth={3} />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1f1e1d]">Business Impact</span>
          </div>
          <h2 className="text-[36px] sm:text-[56px] font-black leading-[0.95] tracking-tight text-[#111827]">
            {t.roi_title}
          </h2>
          <p className="text-[16px] sm:text-[18px] text-[#6b6760] font-bold max-w-[650px] mx-auto">
            {t.roi_desc}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-5 bg-white p-8 sm:p-10 rounded-[40px] border-[4px] border-[#1f1e1d] shadow-[12px_16px_0_0_#1f1e1d] space-y-8">
            <div className="space-y-6">
              {/* Monthly Customers */}
              <div className="space-y-2">
                <label className="text-[12px] font-black text-[#1f1e1d] uppercase tracking-widest flex items-center gap-2" htmlFor="monthlyCustomers">
                  <Users size={14} /> {t.roi_label_monthly_customers}
                </label>
                <input
                  type="number"
                  id="monthlyCustomers"
                  name="monthlyCustomers"
                  value={inputs.monthlyCustomers || ''}
                  onChange={handleInputChange}
                  placeholder={t.roi_placeholder_monthly_customers}
                  className="w-full px-5 py-4 bg-[#F7F4F0] border-[3px] border-[#1f1e1d] rounded-2xl font-black text-[16px] focus:outline-none focus:ring-4 focus:ring-[#FDBF1D]/20 transition-all"
                />
              </div>

              {/* Current Rating */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#1f1e1d] uppercase tracking-widest flex items-center gap-2" htmlFor="currentRating">
                    <Star size={14} /> {t.roi_label_current_rating}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    id="currentRating"
                    name="currentRating"
                    value={inputs.currentRating || ''}
                    onChange={handleInputChange}
                    placeholder={t.roi_placeholder_current_rating}
                    className="w-full px-5 py-4 bg-[#F7F4F0] border-[3px] border-[#1f1e1d] rounded-2xl font-black text-[16px] focus:outline-none focus:ring-4 focus:ring-[#FDBF1D]/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-[#1f1e1d] uppercase tracking-widest flex items-center gap-2" htmlFor="currentReviews">
                    <MessageSquare size={14} /> {t.roi_label_current_reviews}
                  </label>
                  <input
                    type="number"
                    id="currentReviews"
                    name="currentReviews"
                    value={inputs.currentReviews || ''}
                    onChange={handleInputChange}
                    placeholder={t.roi_placeholder_current_reviews}
                    className="w-full px-5 py-4 bg-[#F7F4F0] border-[3px] border-[#1f1e1d] rounded-2xl font-black text-[16px] focus:outline-none focus:ring-4 focus:ring-[#FDBF1D]/20 transition-all"
                  />
                </div>
              </div>

              {/* Target Rating */}
              <div className="space-y-2">
                <label className="text-[12px] font-black text-[#1f1e1d] uppercase tracking-widest flex items-center gap-2" htmlFor="targetRating">
                  <Target size={14} /> {t.roi_label_target_rating}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  id="targetRating"
                  name="targetRating"
                  value={inputs.targetRating || ''}
                  onChange={handleInputChange}
                  placeholder={t.roi_placeholder_target_rating}
                  className="w-full px-5 py-4 bg-[#F7F4F0] border-[3px] border-[#1f1e1d] rounded-2xl font-black text-[16px] focus:outline-none focus:ring-4 focus:ring-[#FDBF1D]/20 transition-all"
                />
              </div>

              {/* Business Type */}
              <div className="space-y-2">
                <label className="text-[12px] font-black text-[#1f1e1d] uppercase tracking-widest flex items-center gap-2" htmlFor="businessType">
                  <Briefcase size={14} /> {t.roi_label_business_type}
                </label>
                <select
                  id="businessType"
                  name="businessType"
                  value={inputs.businessType}
                  onChange={handleInputChange}
                  className="w-full px-5 py-4 bg-[#FDBF1D] border-[3px] border-[#1f1e1d] rounded-2xl font-black text-[14px] uppercase tracking-widest shadow-[0_4px_0_0_#1f1e1d] focus:outline-none active:translate-y-1 active:shadow-none transition-all cursor-pointer appearance-none"
                >
                  <option value="restaurant">{t.roi_opt_restaurant}</option>
                  <option value="cafe">{t.roi_opt_cafe}</option>
                  <option value="hotel">{t.roi_opt_hotel}</option>
                  <option value="clinic">{t.roi_opt_clinic}</option>
                  <option value="other">{t.roi_opt_other}</option>
                </select>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-[11px] text-[#ada89f] font-bold leading-relaxed">
                <ShieldCheck size={14} className="inline mr-1" />
                {t.roi_disclaimer}
              </p>
            </div>
          </div>

          {/* Right Column: Result Cards */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {results && (
                <>
                  <RoiResultCard
                    title={t.roi_result_reviews_title}
                    value={results.reviewsNeeded === "TARGET_MET" ? "✓" : formatRange(results.reviewsNeeded.min, results.reviewsNeeded.max)}
                    msg={results.reviewsNeeded === "TARGET_MET" 
                      ? t.roi_result_reviews_met 
                      : t.roi_result_reviews_msg.replace('{range}', formatRange(results.reviewsNeeded.min, results.reviewsNeeded.max))}
                    icon={MessageSquare}
                    accentColor="#FDBF1D"
                  />
                  
                  <RoiResultCard
                    title={t.roi_result_visibility_title}
                    value={getVisibilityLabel(results.visibilityImpact)}
                    msg={getVisibilityMsg(results.visibilityImpact)}
                    icon={TrendingUp}
                    accentColor="#EA580C"
                    badge={results.visibilityImpact}
                  />
                </>
              )}
            </div>

            {results && (
              <div className="w-full">
                <RoiResultCard
                  title={t.roi_result_lead_title}
                  value={`+${formatRange(results.leadPotential.min, results.leadPotential.max)}`}
                  msg={t.roi_result_lead_msg.replace('{range}', formatRange(results.leadPotential.min, results.leadPotential.max))}
                  icon={MousePointer2}
                  accentColor="#1f1e1d"
                />
              </div>
            )}

            <div className="mt-4 p-8 bg-[#111827] rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[8px_10px_0_0_#ea580c] flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-full bg-[#FDBF1D]/5 -z-0" />
              <div className="relative z-10 space-y-1 text-center sm:text-left">
                <h4 className="text-white text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Solution</h4>
                <p className="text-white text-[20px] font-black tracking-tight leading-none">
                  {locale === 'tr' ? 'Etkiyi Gerçekleştirmeye Başlayın' : 'Start Realizing Potential Impact'}
                </p>
              </div>
              <a
                href="#pricing"
                className="relative z-10 px-8 py-4 bg-[#FDBF1D] border-[3px] border-[#1f1e1d] text-[#111827] font-black text-[13px] uppercase tracking-widest rounded-xl shadow-[0_5px_0_0_#ea580c] active:translate-y-[5px] active:shadow-none transition-all whitespace-nowrap"
              >
                {t.roi_cta}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RoiCalculator;
