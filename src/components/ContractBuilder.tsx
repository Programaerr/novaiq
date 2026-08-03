import React, { useState, useRef, useEffect } from 'react';
import { Template, ContractData } from '../types';
import { templatesData } from '../data/templatesData';
import {
  FileSignature,
  Building2,
  CheckSquare,
  Square,
  RotateCcw,
  ShieldCheck,
  Layers,
  ArrowLeft,
  ArrowRight,
  FileCheck,
  PenLine
} from 'lucide-react';
import { cosmicAudio } from '../lib/audio';
import { Language, getTranslation } from '../lib/i18n';
import { formatPrice } from '../lib/currency';

interface ContractBuilderProps {
  selectedTemplate: Template | null;
  onContractGenerated: (contract: ContractData) => void;
  language?: Language;
  initialCustomFeaturesText?: string;
  initialPrimaryColor?: string;
}

export const ContractBuilder: React.FC<ContractBuilderProps> = ({
  selectedTemplate,
  onContractGenerated,
  language = 'ar' as Language,
  initialCustomFeaturesText,
  initialPrimaryColor,
}) => {
  const lang: Language = language;
  const isAr = lang === 'ar';

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [template, setTemplate] = useState<Template>(selectedTemplate || templatesData[0]);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [repName, setRepName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country] = useState('العراق');
  const [city, setCity] = useState('بغداد');

  // Phone Validation helper (Must start with 07 and be 11 digits)
  const isValidIraqiPhone = (num: string) => {
    const clean = num.replace(/[\s\-\+\(\)]/g, '');
    return /^07\d{9}$/.test(clean);
  };

  // Customizations
  const [selectedSpecIds, setSelectedSpecIds] = useState<string[]>([]);
  const [customFeaturesText, setCustomFeaturesText] = useState('');
  const [showCustomRequest, setShowCustomRequest] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#8b5cf6');
  const [themePreference, setThemePreference] = useState<'dark' | 'light' | 'cosmic'>('cosmic');
  const [languageSupport, setLanguageSupport] = useState<'ar' | 'en' | 'ar_en'>('ar_en');
  const [paymentPlan] = useState<'50_50' | '100_upfront' | '3_milestones'>('50_50');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Digital Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signaturePadRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  // Drives an inline highlight on the pad instead of an alert() — a modal popup that just
  // says "go sign" makes the user dismiss it and then hunt for the pad themselves.
  const [signatureMissing, setSignatureMissing] = useState(false);

  useEffect(() => {
    if (selectedTemplate) {
      setTemplate(selectedTemplate);
      const rec = selectedTemplate.specificationsOptions
        .filter(s => s.recommended)
        .map(s => s.id);
      setSelectedSpecIds(rec);
      if (initialCustomFeaturesText) {
        setCustomFeaturesText(initialCustomFeaturesText);
        setShowCustomRequest(true);
      }
      if (initialPrimaryColor) setPrimaryColor(initialPrimaryColor);
    }
  }, [selectedTemplate, initialCustomFeaturesText, initialPrimaryColor]);

  // Canvas drawing handlers.
  // The canvas has a fixed internal drawing resolution (width={700} height={150})
  // but is displayed at a responsive CSS size (w-full h-36), which is almost never
  // 700x150px. Without scaling, clientX/clientY (in CSS pixels) were used directly as
  // drawing-buffer coordinates, so the stroke landed wherever the cursor/finger was
  // MINUS the mismatch between the two sizes — the line simply didn't track the pointer.
  const getCanvasPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // On touch devices, without this the browser can interpret the first drag as a page
    // scroll instead of a stroke — the canvas then never receives the movement at all.
    if ('touches' in e) e.preventDefault();

    setIsDrawing(true);
    setHasSignature(true);
    setSignatureMissing(false);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const point = getCanvasPoint(canvas, clientX, clientY);

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ('touches' in e) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const point = getCanvasPoint(canvas, clientX, clientY);

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f4f4f5';
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Price Calculation in IQD
  const basePriceIQD = template.basePriceIQD || 0;
  const selectedSpecsPriceIQD = selectedSpecIds.reduce((total, id) => {
    const spec = template.specificationsOptions.find(s => s.id === id);
    return total + (spec ? (spec.priceIQD || 0) : 0);
  }, 0);

  const totalPriceIQD = basePriceIQD + selectedSpecsPriceIQD;

  const toggleSpec = (specId: string) => {
    if (selectedSpecIds.includes(specId)) {
      setSelectedSpecIds(selectedSpecIds.filter(id => id !== specId));
    } else {
      setSelectedSpecIds([...selectedSpecIds, specId]);
    }
    cosmicAudio.playPing();
  };

  const handleSubmitContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !repName || !email || !phone) {
      alert(isAr ? 'يرجى تعبئة كافة بيانات الشركة المطلوبة في الخطوة الأولى' : 'Please complete company details in step 1');
      setCurrentStep(1);
      return;
    }

    if (!isValidIraqiPhone(phone)) {
      alert(isAr ? 'خطأ في رقم الهاتف: يجب أن يبدأ رقم الهاتف العراقي بـ 07 ويتكون من 11 رقماً بالضبط' : 'Invalid Iraqi phone number format. Must start with 07 and be 11 digits.');
      setCurrentStep(1);
      return;
    }

    if (!agreedToTerms) {
      alert(isAr ? 'يرجى الموافقة على الشروط والأحكام العامة للبدء' : 'Please accept the terms and conditions');
      return;
    }

    if (!hasSignature) {
      // Take the user straight to the pad and highlight it, rather than popping an alert
      // that has to be dismissed before they can act on it.
      setCurrentStep(4);
      setSignatureMissing(true);
      requestAnimationFrame(() => {
        signaturePadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    let signatureDataUrl = '';
    if (canvasRef.current && hasSignature) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    }

    const contractNumber = `NVQ-CTR-${Date.now().toString().slice(-6)}`;
    const selectedSpecsLabels = selectedSpecIds.map(id => {
      const spec = template.specificationsOptions.find(s => s.id === id);
      return spec ? spec.label : id;
    });

    const contractData: ContractData = {
      contractNumber,
      companyName,
      crNumber,
      repName,
      email,
      phone,
      country,
      city,
      templateId: template.id,
      templateTitle: template.title,
      selectedSpecs: selectedSpecsLabels,
      customFeaturesText,
      primaryColor,
      themePreference,
      languageSupport,
      basePriceIQD,
      selectedSpecsPriceIQD,
      totalPriceIQD,
      basePriceSAR: basePriceIQD,
      selectedSpecsPriceSAR: selectedSpecsPriceIQD,
      totalPriceSAR: totalPriceIQD,
      paymentPlan,
      deliveryTimelineWeeks: template.deliveryWeeks,
      signatureDataUrl,
      agreedToTerms,
      status: 'submitted',
      createdAt: new Date().toISOString(),
    };

    cosmicAudio.playWarp();
    onContractGenerated(contractData);
  };

  return (
    <section id="contract-section" className="py-4 sm:py-6 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center mb-5">
          <h2 className="text-xl sm:text-3xl font-extrabold text-white mb-1.5">
            {getTranslation('builderTitle', lang)}
          </h2>
          <p className="text-zinc-300 text-xs sm:text-sm max-w-2xl mx-auto">
            {getTranslation('builderSubtext', lang)}
          </p>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {[
            { step: 1, title: isAr ? 'بيانات الشركة' : 'Company Details', icon: Building2 },
            { step: 2, title: isAr ? 'مواصفات القالب' : 'Template Specs', icon: Layers },
            { step: 3, title: isAr ? 'الشروط والأسعار' : 'Terms & Pricing', icon: ShieldCheck },
            { step: 4, title: isAr ? 'التوقيع والإنشاء' : 'Signature & Save', icon: FileSignature },
          ].map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  setCurrentStep(s.step);
                  cosmicAudio.playPing();
                }}
                className={`p-3 rounded-2xl border text-[11px] sm:text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isCurrent
                    ? 'bg-zinc-800 border-white text-white shadow-lg glow-white'
                    : isCompleted
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-300'
                    : 'bg-zinc-950 border-zinc-900 text-zinc-600'
                }`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  isCurrent ? 'bg-white text-black font-bold' : 'bg-zinc-800 text-zinc-300'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate text-right">
                  <span className="text-[10px] text-zinc-400 block font-mono">{isAr ? `الخطوة ${s.step}` : `Step ${s.step}`}</span>
                  <span className="truncate">{s.title}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmitContract} className="bg-zinc-950/90 border border-zinc-800 p-4 sm:p-6 rounded-3xl space-y-5 shadow-2xl">
          
          {/* STEP 1: Company Details */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-white" />
                  <span>{getTranslation('stepCompanyInfo', lang)}</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {getTranslation('companyNameLabel', lang)} *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={getTranslation('companyNamePlaceholder', lang)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {getTranslation('crNumberLabel', lang)}
                  </label>
                  <input
                    type="text"
                    value={crNumber}
                    onChange={(e) => setCrNumber(e.target.value)}
                    placeholder={getTranslation('crNumberPlaceholder', lang)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {getTranslation('repNameLabel', lang)} *
                  </label>
                  <input
                    type="text"
                    required
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    placeholder={getTranslation('repNamePlaceholder', lang)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {getTranslation('emailLabel', lang)} *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={getTranslation('emailPlaceholder', lang)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {getTranslation('phoneLabel', lang)} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    maxLength={11}
                    onChange={(e) => {
                      const cleanDigits = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setPhone(cleanDigits);
                    }}
                    placeholder={getTranslation('phonePlaceholder', lang)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs font-mono"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {isAr ? 'مثال: 07701234567 (11 رقماً)' : 'e.g. 07701234567 (11 digits)'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {getTranslation('cityLabel', lang)}
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={isAr ? 'بغداد - الكرادة' : 'Baghdad'}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Template & Specifications */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-white" />
                  <span>{getTranslation('stepTechSpecs', lang)}</span>
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={template.previewImage}
                    alt={template.title}
                    className="w-16 h-16 rounded-xl object-cover border border-zinc-700"
                  />
                  <div>
                    <span className="text-[10px] font-bold text-white bg-zinc-800 border border-zinc-700 px-2.5 py-0.5 rounded-full">
                      {template.categoryLabel}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1">
                      {template.title}
                    </h4>
                  </div>
                </div>

                <select
                  value={template.id}
                  onChange={(e) => {
                    const found = templatesData.find(t => t.id === e.target.value);
                    if (found) setTemplate(found);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs font-semibold"
                >
                  {templatesData.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({formatPrice(t.basePriceIQD, lang)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Specifications Checklist */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-zinc-300">
                  {getTranslation('optionsLabel', lang)}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {template.specificationsOptions.map((spec) => {
                    const isSelected = selectedSpecIds.includes(spec.id);
                    return (
                      <div
                        key={spec.id}
                        onClick={() => toggleSpec(spec.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-zinc-800 border-white text-white font-semibold glow-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-500 glow-white-hover'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-white shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                          )}
                          <span className="text-xs font-medium text-zinc-200">{spec.label}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-white">
                          +{formatPrice(spec.priceIQD || 0, lang)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                onClick={() => setShowCustomRequest(v => !v)}
                className={`p-3.5 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  showCustomRequest
                    ? 'bg-zinc-800 border-white text-white font-semibold glow-white'
                    : 'bg-zinc-900/60 border-zinc-700 text-zinc-400 hover:border-zinc-500 glow-white-hover'
                }`}
              >
                <div className="flex items-center gap-3">
                  {showCustomRequest ? (
                    <CheckSquare className="w-4 h-4 text-white shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                  )}
                  <div className="flex items-center gap-2">
                    <PenLine className="w-4 h-4 text-white shrink-0" />
                    <span className="text-xs sm:text-sm font-bold">
                      {isAr ? 'لم تجد ما تريده في القائمة أعلاه؟ اطلب ميزة مخصصة' : "Didn't find what you need above? Request a custom feature"}
                    </span>
                  </div>
                </div>
              </div>

              {showCustomRequest && (
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border-2 border-dashed border-zinc-700 animate-fade-in">
                  <p className="text-[11px] text-zinc-400 mb-2.5">
                    {isAr
                      ? 'اكتب طلبك بالضبط هنا — أي ميزة أو فكرة خاصة بموقعك غير مذكورة في الإضافات الجاهزة، وسنقوم بدراستها وتسعيرها ضمن مشروعك.'
                      : 'Describe exactly what you want here — any feature or idea for your site not covered by the ready-made add-ons above, and we\'ll scope and price it as part of your project.'}
                  </p>
                  <textarea
                    rows={3}
                    value={customFeaturesText}
                    onChange={(e) => setCustomFeaturesText(e.target.value)}
                    placeholder={getTranslation('customFeaturesPlaceholder', lang)}
                    className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs"
                    autoFocus
                  />
                </div>
              )}

              {/* Color Scheme Picker */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  {getTranslation('colorSchemeLabel', lang)}
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { hex: '#8b5cf6', label: isAr ? 'بنفسجي' : 'Purple' },
                    { hex: '#10b981', label: isAr ? 'زمردي' : 'Emerald' },
                    { hex: '#06b6d4', label: isAr ? 'سماوي' : 'Cyan' },
                    { hex: '#f59e0b', label: isAr ? 'ذهبي' : 'Amber' },
                    { hex: '#f43f5e', label: isAr ? 'ياقوتي' : 'Rose' },
                    { hex: '#71717a', label: isAr ? 'رمادي' : 'Monochrome' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setPrimaryColor(c.hex)}
                      title={c.label}
                      className={`w-9 h-9 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-center ${
                        primaryColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-zinc-700 hover:border-zinc-500'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {primaryColor === c.hex && <CheckSquare className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Theme Preference */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {isAr ? 'نمط الوضع (فاتح/داكن):' : 'Interface Mode:'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'dark' as const, label: isAr ? 'داكن' : 'Dark' },
                      { id: 'light' as const, label: isAr ? 'فاتح' : 'Light' },
                      { id: 'cosmic' as const, label: isAr ? 'فضائي' : 'Cosmic' },
                    ]).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setThemePreference(opt.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          themePreference === opt.id
                            ? 'bg-zinc-800 border-white text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Support */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {getTranslation('languageSupportLabel', lang)}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'ar' as const, label: getTranslation('langAr', lang) },
                      { id: 'en' as const, label: getTranslation('langEn', lang) },
                      { id: 'ar_en' as const, label: isAr ? 'ثنائي' : 'Both' },
                    ]).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setLanguageSupport(opt.id)}
                        title={opt.label}
                        className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all truncate ${
                          languageSupport === opt.id
                            ? 'bg-zinc-800 border-white text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* STEP 3: Terms & Pricing */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-white" />
                  <span>{getTranslation('stepTermsPayment', lang)}</span>
                </h3>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3 font-mono">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{isAr ? 'سعر القالب الأساسي:' : 'Base Template Price:'}</span>
                  <span>{formatPrice(basePriceIQD, lang)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{isAr ? 'إجمالي الإضافات المختارة:' : 'Selected Add-ons Total:'}</span>
                  <span>+{formatPrice(selectedSpecsPriceIQD, lang)}</span>
                </div>
                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-base font-bold text-white">
                  <span>{getTranslation('totalCostSummary', lang)}</span>
                  <span className="text-xl text-white font-extrabold">
                    {formatPrice(totalPriceIQD, lang)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-white focus:ring-white cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-white">
                    {getTranslation('agreeTermsCheckbox', lang)}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: Digital Signature */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-white" />
                  <span>{getTranslation('stepSignature', lang)}</span>
                </h3>
              </div>

              <div className="space-y-2" ref={signaturePadRef}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">
                    {isAr ? 'لوحة التوقيع الحي:' : 'Live Digital Signature Pad:'}
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{getTranslation('clearSignature', lang)}</span>
                  </button>
                </div>

                <div
                  className={`relative rounded-2xl overflow-hidden border-2 border-dashed bg-zinc-900 transition-colors ${
                    signatureMissing ? 'border-white ring-2 ring-white/40' : 'border-zinc-700'
                  }`}
                >
                  <canvas
                    ref={canvasRef}
                    width={700}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-36 cursor-crosshair touch-none"
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-zinc-500 text-xs font-semibold">
                      {isAr ? '[ ارسم توقيعك هنا ]' : '[ Draw your signature here ]'}
                    </div>
                  )}
                </div>

                {signatureMissing && (
                  <p className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <PenLine className="w-3.5 h-3.5 shrink-0" />
                    <span>{isAr ? 'التوقيع مطلوب لإتمام العقد — ارسم توقيعك في المساحة أعلاه.' : 'A signature is required to complete the contract — draw yours in the area above.'}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Form Navigation Buttons */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>{isAr ? 'الخطوة السابقة' : 'Previous Step'}</span>
              </button>
            ) : <div />}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1 && (!companyName || !repName || !email || !phone)) {
                    alert(isAr ? 'يرجى كتابة كافة البيانات الأساسية المكتملة أولاً' : 'Please complete basic info');
                    return;
                  }
                  setCurrentStep(currentStep + 1);
                  cosmicAudio.playPing();
                }}
                className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold white-btn-glow flex items-center gap-2 cursor-pointer border border-white"
              >
                <span>{isAr ? 'الخطوة التالية' : 'Next Step'}</span>
                <ArrowLeft className="w-4 h-4 text-black" />
              </button>
            ) : (
              <button
                type="submit"
                className="px-8 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs sm:text-sm font-extrabold white-btn-glow flex items-center gap-2 cursor-pointer transition-all border border-white"
              >
                <FileCheck className="w-4 h-4 text-black" />
                <span>{getTranslation('generateContractBtn', lang)}</span>
              </button>
            )}
          </div>

        </form>

      </div>
    </section>
  );
};
