import React from 'react';
import { LogOut } from 'lucide-react';

interface LogoutConfirmDialogProps {
  isAr: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Shared confirm-before-sign-out screen for both CustomerDashboard and AdminDashboard —
// signing out drops the current session immediately with no undo, so it's worth one
// deliberate extra click rather than firing on the first tap.
export const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({ isAr, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
    <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl">
      <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mx-auto">
        <LogOut className="w-6 h-6" />
      </div>
      <div className="text-center space-y-1.5">
        <h3 className="text-base font-bold text-white">{isAr ? 'تسجيل الخروج؟' : 'Sign out?'}</h3>
        <p className="text-xs text-zinc-400">
          {isAr ? 'سيتم تسجيل خروجك من حسابك في NOVAIQ.' : 'You will be signed out of your NOVAIQ account.'}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold cursor-pointer transition-colors"
        >
          {isAr ? 'إلغاء' : 'Cancel'}
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-extrabold cursor-pointer transition-all border border-white"
        >
          {isAr ? 'تسجيل الخروج' : 'Sign Out'}
        </button>
      </div>
    </div>
  </div>
);
