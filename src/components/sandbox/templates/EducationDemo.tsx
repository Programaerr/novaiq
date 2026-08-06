import React from 'react';
import {
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';
import { SAMPLE_COURSES, SAMPLE_GRADES, SAMPLE_ATTENDANCE, COMPANY_PROFILES } from '../../../data/sandboxDemoData';
import type { Course, Enrollment } from '../../../data/sandboxDemoData';
import { cosmicAudio } from '../../../lib/audio';
import type { SandboxCtx } from '../context';

// The academy demo: course catalogue, enrolment and the student dashboard.
// Rendered by TemplateInteractiveSandbox. Everything shared with the other demos arrives via
// `ctx`; this demo's own state stays owned by the shell, which needs to read it for the
// account page and for the "what did the customer configure" contract summary.
interface EducationDemoProps {
  ctx: SandboxCtx;
  confirmEnrollment: (course: Course) => void;
  courseCategoryFilter: 'all' | 'programming' | 'languages' | 'business' | 'design';
  enrollments: Enrollment[];
  selectedCourseId: string;
  setCourseCategoryFilter: React.Dispatch<React.SetStateAction<'all' | 'programming' | 'languages' | 'business' | 'design'>>;
  setSelectedCourseId: React.Dispatch<React.SetStateAction<string>>;
  setStudentNameInput: React.Dispatch<React.SetStateAction<string>>;
  studentNameInput: string;
}

export function EducationDemo({ ctx, confirmEnrollment, courseCategoryFilter, enrollments, selectedCourseId, setCourseCategoryFilter, setSelectedCourseId, setStudentNameInput, studentNameInput }: EducationDemoProps) {
  const { activeTab, gridCols, price, renderCompanyHome, setActiveTab, themeStyle } = ctx;

  const eduTab = ['home', 'courses', 'enroll', 'dashboard'].includes(activeTab) ? activeTab : 'home';
  const selectedCourse = SAMPLE_COURSES.find(c => c.id === selectedCourseId) || SAMPLE_COURSES[0];
  const filteredCourses = courseCategoryFilter === 'all' ? SAMPLE_COURSES : SAMPLE_COURSES.filter(c => c.category === courseCategoryFilter);

  return (
    <div className="space-y-6 text-slate-100">
      {/* Navigation Bar */}
      <div className={`sticky top-1 sm:top-2 z-20 flex flex-row items-center justify-between gap-3 m-1 sm:m-2 p-3.5 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl`}>
        <div className="group flex items-center gap-2.5">
          <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
          <div className={`navbar-logo-mark w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} shrink-0 shadow-lg ring-1 ring-white/20`}>
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="navbar-logo-word font-extrabold text-sm sm:text-base text-white tracking-wide">Design</span>
        </div>
        {renderSiteMenuButton()}
      </div>

      {eduTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-EDU-08'])}

      {eduTab === 'courses' && (
        <div className="space-y-4 animate-fade-in text-xs">
          <div className="flex flex-wrap gap-2">
            {(['all', 'programming', 'languages', 'business', 'design'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCourseCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  courseCategoryFilter === cat ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}` : 'bg-white/5 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'all' && 'الكل'}
                {cat === 'programming' && 'برمجة'}
                {cat === 'languages' && 'لغات'}
                {cat === 'business' && 'أعمال'}
                {cat === 'design' && 'تصميم'}
              </button>
            ))}
          </div>

          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4`}>
            {filteredCourses.map((course) => (
              <div key={course.id} className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden hover:border-white/25 transition-all">
                <div className={`h-20 bg-gradient-to-br ${course.imageBg} flex items-center justify-center`}>
                  <GraduationCap className="w-7 h-7 text-white/70" />
                </div>
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{course.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full ${themeStyle.badgeBg} text-[10px] font-bold shrink-0`}>{course.level}</span>
                  </div>
                  <p className="text-slate-400">{course.instructor} • {course.durationWeeks} أسابيع</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{price(course.priceIQD)}</span>
                    <button
                      onClick={() => { setSelectedCourseId(course.id); setActiveTab('enroll'); cosmicAudio.playPing(); }}
                      className={`px-3 py-1.5 rounded-lg ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer`}
                    >
                      سجل الآن
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {eduTab === 'enroll' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <GraduationCap className={`w-4 h-4 ${themeStyle.primaryText}`} />
            <span>تأكيد التسجيل في: {selectedCourse.title}</span>
          </h4>
          <p className="text-slate-400">{selectedCourse.instructor} • {selectedCourse.level} • {selectedCourse.durationWeeks} أسابيع</p>
          <div className="space-y-1.5">
            <label className="block text-slate-400 font-bold">اسم الطالب:</label>
            <input
              type="text"
              value={studentNameInput}
              onChange={(e) => setStudentNameInput(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-white">رسوم الدورة:</span>
            <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{price(selectedCourse.priceIQD)}</span>
          </div>
          <button
            onClick={() => confirmEnrollment(selectedCourse)}
            className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center justify-center gap-2`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تأكيد التسجيل</span>
          </button>
        </div>
      )}

      {eduTab === 'dashboard' && (
        <div className="space-y-4 animate-fade-in text-xs">
          {enrollments.length > 0 && (
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2">
              <span className="font-bold text-white block">دوراتك المسجلة:</span>
              {enrollments.map((e) => (
                <div key={e.id} className="p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-2">
                  <span className="text-white font-bold truncate">{e.courseTitle}</span>
                  <span className="font-mono text-slate-300 shrink-0">{e.date}</span>
                </div>
              ))}
            </div>
          )}
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2">
            <span className="font-bold text-white block">الدرجات:</span>
            {SAMPLE_GRADES.map((g, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-2">
                <span className="text-white truncate">{g.course}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{g.grade}</span>
                  <span className="text-slate-500">{g.status}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2">
            <span className="font-bold text-white block">سجل الحضور:</span>
            {SAMPLE_ATTENDANCE.map((a, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-2">
                <span className="font-mono text-slate-300">{a.date}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${a.status === 'حاضر' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
