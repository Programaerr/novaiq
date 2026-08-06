import React from 'react';
import {
  CheckCircle2,
  Wallet,
  Send,
  ArrowUpRight,
  CreditCard,
  Shield,
} from 'lucide-react';
import { cosmicAudio } from '../../../lib/audio';
import { PriceInput } from '../../PriceInput';
import type { SandboxCtx } from '../context';

// Vortex Pay — the wallet demo: balance, transfers, cards and security settings.
// Rendered by TemplateInteractiveSandbox. Everything shared with the other demos arrives via
// `ctx`; this demo's own state stays owned by the shell, which needs to read it for the
// account page and for the "what did the customer configure" contract summary.
interface FintechDemoProps {
  ctx: SandboxCtx;
  setTransferAmount: React.Dispatch<React.SetStateAction<string>>;
  setTransfersLog: React.Dispatch<React.SetStateAction<Array<{ id: string; amountIQD: number; date: string; recipient: string }>>>;
  setTwoFactorEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  transferAmount: string;
  transfersLog: Array<{ id: string; amountIQD: number; date: string; recipient: string }>;
  twoFactorEnabled: boolean;
}

export function FintechDemo({ ctx, setTransferAmount, setTransfersLog, setTwoFactorEnabled, transferAmount, transfersLog, twoFactorEnabled }: FintechDemoProps) {
  const { CUR, activeTab, gridCols, isNarrowViewport, price, setActiveTab, themeStyle } = ctx;

  const fintechTab = ['home', 'wallet', 'cards', 'security'].includes(activeTab) ? activeTab : 'home';

  return (
    <div className="space-y-6 text-slate-100">
      {/* Navigation Bar */}
      <div className={`sticky top-1 sm:top-2 z-20 flex flex-row items-center justify-between gap-3 m-1 sm:m-2 p-3.5 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl`}>
        <div className="group flex items-center gap-2.5">
          <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
          <div className={`navbar-logo-mark w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} shrink-0 shadow-lg ring-1 ring-white/20`}>
            <Wallet className="w-5 h-5" />
          </div>
          <span className="navbar-logo-word font-extrabold text-sm sm:text-base text-white tracking-wide">Design</span>
        </div>
        {renderSiteMenuButton()}
      </div>

      {fintechTab === 'home' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-r ${themeStyle.gradient} border ${themeStyle.primaryBorder} text-center space-y-3 sm:space-y-4`}>
            <span className={`px-3 py-1 rounded-full ${themeStyle.badgeBg} text-xs font-semibold inline-block`}>
              نظام مالي رقمي متكامل
            </span>
            <h3 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">
              إدارة أموالك بأمان، من أي مكان
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
              محفظة رقمية، تحويلات فورية، وبطاقات افتراضية — كل ذلك محمي بأعلى معايير التشفير والحماية الثنائية 2FA.
            </p>
            <div className={`pt-2 flex ${isNarrowViewport ? 'flex-col' : 'flex-col sm:flex-row'} justify-center gap-2.5`}>
              <button onClick={() => setActiveTab('wallet')} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer`}>
                افتح المحفظة الرقمية
              </button>
              <button onClick={() => setActiveTab('security')} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-slate-300 text-xs font-bold cursor-pointer">
                إعدادات الأمان
              </button>
            </div>
          </div>

          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-2.5 text-center`}>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className={`text-lg sm:text-xl font-bold ${themeStyle.primaryText} font-mono`}>+25,000</div>
              <div className="text-[11px] text-slate-400">مستخدم نشط</div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">256-bit</div>
              <div className="text-[11px] text-slate-400">تشفير مصرفي</div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className="text-lg sm:text-xl font-bold text-amber-400 font-mono">24/7</div>
              <div className="text-[11px] text-slate-400">مراقبة أمنية</div>
            </div>
          </div>
        </div>
      )}

      {fintechTab === 'wallet' && (
        <div className={`p-4 sm:p-6 rounded-2xl bg-gradient-to-r ${themeStyle.gradient} border ${themeStyle.primaryBorder} space-y-3 sm:space-y-4 animate-fade-in`}>
          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-3 pt-1`}>
            <div className="bg-black/30 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-white/10">
              <span className="text-xs text-slate-400 block mb-1">الرصيد الكلي المتوفر:</span>
              <div className={`text-xl sm:text-2xl font-bold ${themeStyle.primaryText} font-mono`}>{`14,250,000 ${CUR}`}</div>
            </div>
            <div className="bg-black/30 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-white/10 flex flex-col justify-between space-y-2">
              <span className="text-xs text-slate-400 block">آخر عملية تحويل:</span>
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold">
                <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{language === 'ar' ? 'تم استلام 500,000 د.ع' : 'Received 500,000 IQD'}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">رمز المعاملة: #TX-984211</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 space-y-2.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Send className={`w-4 h-4 ${themeStyle.primaryText} shrink-0`} />
              <span>محاكاة تحويل مالي سريع</span>
            </h4>
            <div className={`flex ${isNarrowViewport ? 'flex-col' : 'flex-col sm:flex-row'} gap-2`}>
              <PriceInput
                value={transferAmount}
                onChange={setTransferAmount}
                placeholder="المبلغ بالدينار"
                className="flex-1 p-2.5 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 text-xs text-white font-mono"
              />
              <button
                onClick={() => {
                  setTransfersLog(prev => [
                    { id: `TX-${Math.floor(10000 + Math.random() * 90000)}`, amountIQD: Number(transferAmount) || 0, date: new Date().toISOString().split('T')[0], recipient: 'تحويل سريع مباشر' },
                    ...prev
                  ]);
                  cosmicAudio.playPing();
                }}
                className={`w-full sm:w-auto px-4 py-2.5 ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold rounded-lg cursor-pointer shrink-0`}
              >
                تأكيد التحويل
              </button>
            </div>
          </div>

          {/* Transaction history log */}
          <div className="p-3.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 space-y-2 text-xs">
            <span className="font-bold text-white block">سجل المعاملات السريعة:</span>
            <div className="space-y-1.5">
              {transfersLog.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded bg-white/5 backdrop-blur-md text-[11px] border border-white/10">
                  <div>
                    <span className="text-white font-bold block">{tx.recipient}</span>
                    <span className="text-slate-500 text-[10px] font-mono">{tx.id} • {tx.date}</span>
                  </div>
                  <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{price(tx.amountIQD)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {fintechTab === 'cards' && (
        <div className="space-y-4 animate-fade-in text-xs">
          <div className={`p-5 rounded-2xl bg-gradient-to-br ${themeStyle.gradient} border ${themeStyle.primaryBorder} space-y-6`}>
            <div className="flex items-center justify-between">
              <CreditCard className={`w-7 h-7 ${themeStyle.primaryText}`} />
              <span className="text-white font-bold">Vortex Card</span>
            </div>
            <div className="font-mono text-white text-base sm:text-lg tracking-widest" dir="ltr">•••• •••• •••• 8421</div>
            <div className="flex items-center justify-between text-slate-300">
              <span>حامل البطاقة: أحمد العراقي</span>
              <span className="font-mono" dir="ltr">08/29</span>
            </div>
          </div>
          <button
            onClick={() => alert('تم تقديم طلب إصدار بطاقة رقمية جديدة تجريبياً بنجاح!')}
            className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer`}
          >
            طلب بطاقة رقمية جديدة
          </button>
        </div>
      )}

      {fintechTab === 'security' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2.5">
              <Shield className={`w-4 h-4 ${themeStyle.primaryText}`} />
              <span className="text-white font-bold">الحماية الثنائية (2FA)</span>
            </div>
            <button
              onClick={() => { setTwoFactorEnabled(v => !v); cosmicAudio.playPing(); }}
              className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${twoFactorEnabled ? themeStyle.primaryBg : 'bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${twoFactorEnabled ? 'right-0.5' : 'right-5'}`} />
            </button>
          </div>
          <div className="space-y-2">
            {[
              'تنبيهات فورية عند كل عملية دخول',
              'تشفير كامل للبيانات أثناء النقل والتخزين',
              'مراقبة أمنية استباقية على مدار الساعة',
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
