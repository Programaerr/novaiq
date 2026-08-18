import React from 'react';
import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';

interface LogoutConfirmDialogProps {
  isAr: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Shared confirm-before-sign-out screen for both CustomerDashboard and AdminDashboard —
// signing out drops the current session immediately with no undo, so it's worth one
// deliberate extra click rather than firing on the first tap.
//
// Portaled to <body>: both dashboards render inside the page's `.page-in` entrance
// animation wrapper, whose keyframes end on `transform: translate3d(0,0,0)` — a non-none
// transform (animation-fill-mode: both keeps it applied after the animation finishes)
// makes that wrapper the containing block for `fixed` descendants, so this dialog was
// sizing/positioning itself against that tall content div instead of the real viewport
// (showing low/cut off instead of centered on screen). Same root cause and fix as the
// site-menu-drawer bug in TemplateInteractiveSandbox.tsx.
export const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({ isAr, onConfirm, onCancel }) =>
  createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-paper/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-paper border border-ink/10 rounded-3xl p-6 space-y-5 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-white/70 border border-ink/10 flex items-center justify-center text-ink mx-auto">
          <LogOut className="w-6 h-6" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="text-base font-bold text-ink">{isAr ? 'تسجيل الخروج؟' : 'Sign out?'}</h3>
          <p className="text-xs text-ink/60">
            {isAr ? 'سيتم تسجيل خروجك من حسابك في NOVAIQ.' : 'You will be signed out of your NOVAIQ account.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="nq-btn nq-btn--solid flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
          >
            <span className="nq-btn-beam" aria-hidden="true" />
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="nq-btn nq-btn--solid flex-1 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer"
          >
            <span className="nq-btn-beam" aria-hidden="true" />
            {isAr ? 'تسجيل الخروج' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
