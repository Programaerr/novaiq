import React from 'react';
import {
  CheckCircle2,
  Stethoscope,
  Calendar,
} from 'lucide-react';
import { SAMPLE_DOCTORS, SAMPLE_LAB_RESULTS, COMPANY_PROFILES } from '../../../data/sandboxDemoData';
import type { Appointment } from '../../../data/sandboxDemoData';
import { cosmicAudio } from '../../../lib/audio';
import type { SandboxCtx } from '../context';

// Galaxy Health — the medical demo: doctors, appointment booking and lab results.
// Rendered by TemplateInteractiveSandbox. Everything shared with the other demos arrives via
// `ctx`; this demo's own state stays owned by the shell, which needs to read it for the
// account page and for the "what did the customer configure" contract summary.
interface HealthDemoProps {
  ctx: SandboxCtx;
  appointmentDate: string;
  appointmentTime: string;
  appointments: Appointment[];
  selectedDoctorId: string;
  setAppointmentDate: React.Dispatch<React.SetStateAction<string>>;
  setAppointmentTime: React.Dispatch<React.SetStateAction<string>>;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  setSelectedDoctorId: React.Dispatch<React.SetStateAction<string>>;
}

export function HealthDemo({ ctx, appointmentDate, appointmentTime, appointments, selectedDoctorId, setAppointmentDate, setAppointmentTime, setAppointments, setSelectedDoctorId }: HealthDemoProps) {
  const { activeTab, gridCols, renderCompanyHome, setActiveTab, themeStyle } = ctx;

  const healthTab = ['home', 'doctors', 'booking', 'results', 'consultation'].includes(activeTab) ? activeTab : 'home';

  return (
    <div className="space-y-6 text-slate-100">
      {/* Navigation Bar */}
      <div className={`sticky top-1 sm:top-2 z-20 flex flex-row items-center justify-between gap-3 m-1 sm:m-2 p-3.5 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl`}>
        <div className="group flex items-center gap-2.5">
          <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
          <div className={`navbar-logo-mark w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} shrink-0 shadow-lg ring-1 ring-white/20`}>
            <Stethoscope className="w-5 h-5" />
          </div>
          <span className="navbar-logo-word font-extrabold text-sm sm:text-base text-white tracking-wide">Design</span>
        </div>
        {renderSiteMenuButton()}
      </div>

      {healthTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-HEALTH-05'])}

      {healthTab === 'doctors' && (
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4 animate-fade-in text-xs`}>
          {SAMPLE_DOCTORS.map((doc) => (
            <div key={doc.id} className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-3 hover:border-white/25 transition-all">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${doc.imageBg} shrink-0 flex items-center justify-center text-white font-bold text-lg`}>
                {doc.name.replace('د. ', '').charAt(0)}
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{doc.name}</h4>
                <p className="text-slate-400 truncate">{doc.specialty}</p>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-amber-400 font-bold">★ {doc.rating}</span>
                  {doc.availableToday ? (
                    <span className="text-emerald-400 font-bold">متوفر اليوم</span>
                  ) : (
                    <span className="text-slate-500">غير متوفر اليوم</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedDoctorId(doc.id);
                  setActiveTab('booking');
                  cosmicAudio.playPing();
                }}
                className={`px-3 py-2 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer shrink-0`}
              >
                حجز موعد
              </button>
            </div>
          ))}
        </div>
      )}

      {healthTab === 'booking' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className={`w-4 h-4 ${themeStyle.primaryText}`} />
            <span>حجز موعد طبي جديد</span>
          </h4>

          <div className="space-y-1.5">
            <label className="block text-slate-400 font-bold">اختر الطبيب:</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white cursor-pointer"
            >
              {SAMPLE_DOCTORS.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.name} - {doc.specialty}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-slate-400 font-bold">التاريخ:</label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-slate-400 font-bold">الوقت:</label>
              <input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono"
              />
            </div>
          </div>

          <button
            onClick={() => {
              const doc = SAMPLE_DOCTORS.find((d) => d.id === selectedDoctorId);
              setAppointments((prev) => [
                { id: `APT-${Math.floor(1000 + Math.random() * 9000)}`, doctorName: doc?.name || '', specialty: doc?.specialty || '', date: appointmentDate, time: appointmentTime },
                ...prev
              ]);
              cosmicAudio.playPing();
            }}
            className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center justify-center gap-2`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تأكيد الحجز</span>
          </button>

          {appointments.length > 0 && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              <span className="font-bold text-white block">مواعيدك المحجوزة:</span>
              {appointments.map((apt) => (
                <div key={apt.id} className="p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-white font-bold block truncate">{apt.doctorName}</span>
                    <span className="text-slate-500 text-[10px] truncate block">{apt.specialty}</span>
                  </div>
                  <span className="font-mono text-slate-300 shrink-0">{apt.date} - {apt.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {healthTab === 'results' && (
        <div className="space-y-2.5 animate-fade-in text-xs">
          {SAMPLE_LAB_RESULTS.map((lab) => (
            <div key={lab.id} className="p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-white font-bold block truncate">{lab.name}</span>
                <span className="text-slate-500 text-[10px] font-mono block truncate">{lab.id} • {lab.date} • {lab.doctor}</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${lab.status === 'جاهز' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}`}>
                {lab.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {healthTab === 'consultation' && (
        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-center space-y-3 animate-fade-in text-xs">
          <div className={`w-14 h-14 rounded-full ${themeStyle.badgeBg} flex items-center justify-center mx-auto`}>
            <Stethoscope className={`w-6 h-6 ${themeStyle.primaryText}`} />
          </div>
          <h4 className="text-sm font-bold text-white">غرفة الاستشارة المرئية عن بُعد</h4>
          <p className="text-slate-400 max-w-sm mx-auto">محاكاة لواجهة مكالمة الفيديو مع الطبيب المعالج، مع دردشة نصية مباشرة فور بدء الاستشارة.</p>
          <button
            onClick={() => alert('تم بدء الاتصال التجريبي بغرفة الاستشارة المرئية بنجاح!')}
            className={`px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer`}
          >
            بدء الاستشارة الآن
          </button>
        </div>
      )}
    </div>
  );
}
