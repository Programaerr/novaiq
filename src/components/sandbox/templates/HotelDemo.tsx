import React from 'react';
import {
  CheckCircle2,
  Plus,
  Minus,
  Calendar,
  Hotel,
} from 'lucide-react';
import { SAMPLE_ROOMS, COMPANY_PROFILES } from '../../../data/sandboxDemoData';
import type { HotelRoom, HotelBooking } from '../../../data/sandboxDemoData';
import { cosmicAudio } from '../../../lib/audio';
import type { SandboxCtx } from '../context';

// The hotel demo: rooms and suites, booking dates and reservation confirmation.
// Rendered by TemplateInteractiveSandbox. Everything shared with the other demos arrives via
// `ctx`; this demo's own state stays owned by the shell, which needs to read it for the
// account page and for the "what did the customer configure" contract summary.
interface HotelDemoProps {
  ctx: SandboxCtx;
  checkInDate: string;
  checkOutDate: string;
  computeNights: (checkIn: string, checkOut: string) => number;
  confirmHotelBooking: (room: HotelRoom) => void;
  guestsCount: number;
  hotelBookings: HotelBooking[];
  selectedRoomId: string;
  setCheckInDate: React.Dispatch<React.SetStateAction<string>>;
  setCheckOutDate: React.Dispatch<React.SetStateAction<string>>;
  setGuestsCount: React.Dispatch<React.SetStateAction<number>>;
  setSelectedRoomId: React.Dispatch<React.SetStateAction<string>>;
}

export function HotelDemo({ ctx, checkInDate, checkOutDate, computeNights, confirmHotelBooking, guestsCount, hotelBookings, selectedRoomId, setCheckInDate, setCheckOutDate, setGuestsCount, setSelectedRoomId }: HotelDemoProps) {
  const { activeTab, gridCols, price, renderCompanyHome, setActiveTab, themeStyle } = ctx;

  const hotelTab = ['home', 'rooms', 'booking', 'confirmation'].includes(activeTab) ? activeTab : 'home';
  const selectedRoom = SAMPLE_ROOMS.find(r => r.id === selectedRoomId) || SAMPLE_ROOMS[0];
  const nightsPreview = computeNights(checkInDate, checkOutDate);
  const latestBooking = hotelBookings[0];

  return (
    <div className="space-y-6 text-slate-100">
      {/* Navigation Bar */}
      <div className={`sticky top-1 sm:top-2 z-20 flex flex-row items-center justify-between gap-3 m-1 sm:m-2 p-3.5 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl`}>
        <div className="group flex items-center gap-2.5">
          <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
          <div className={`navbar-logo-mark w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} shrink-0 shadow-lg ring-1 ring-white/20`}>
            <Hotel className="w-5 h-5" />
          </div>
          <span className="navbar-logo-word font-extrabold text-sm sm:text-base text-white tracking-wide">Design</span>
        </div>
        {renderSiteMenuButton()}
      </div>

      {hotelTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-HOTEL-09'])}

      {hotelTab === 'rooms' && (
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4 animate-fade-in text-xs`}>
          {SAMPLE_ROOMS.map((room) => (
            <div key={room.id} className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden hover:border-white/25 transition-all">
              <div className={`h-24 bg-gradient-to-br ${room.imageBg} flex items-center justify-center`}>
                <Hotel className="w-7 h-7 text-white/70" />
              </div>
              <div className="p-3.5 space-y-2">
                <h4 className="text-sm font-bold text-white">{room.name}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {room.amenities.map((a, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 text-slate-400 text-[10px]">{a}</span>
                  ))}
                </div>
                <p className="text-slate-400">يتسع لـ {room.capacity} ضيوف</p>
                <div className="flex items-center justify-between pt-1">
                  <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{price(room.pricePerNightIQD)} / ليلة</span>
                  <button
                    onClick={() => { setSelectedRoomId(room.id); setActiveTab('booking'); cosmicAudio.playPing(); }}
                    className={`px-3 py-1.5 rounded-lg ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer`}
                  >
                    احجز الآن
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hotelTab === 'booking' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className={`w-4 h-4 ${themeStyle.primaryText}`} />
            <span>حجز: {selectedRoom.name}</span>
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-slate-400 font-bold">تاريخ الوصول:</label>
              <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-slate-400 font-bold">تاريخ المغادرة:</label>
              <input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-slate-400 font-bold">عدد الضيوف:</label>
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg px-2 py-2 w-fit">
              <button onClick={() => setGuestsCount(g => Math.max(1, g - 1))} className="text-white cursor-pointer"><Minus className="w-3.5 h-3.5" /></button>
              <span className="font-mono font-bold text-white w-6 text-center">{guestsCount}</span>
              <button onClick={() => setGuestsCount(g => Math.min(selectedRoom.capacity, g + 1))} className="text-white cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="font-bold text-white">الإجمالي ({nightsPreview} ليالٍ):</span>
            <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{price((nightsPreview * selectedRoom.pricePerNightIQD))}</span>
          </div>

          <button
            onClick={() => confirmHotelBooking(selectedRoom)}
            className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center justify-center gap-2`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تأكيد الحجز</span>
          </button>
        </div>
      )}

      {hotelTab === 'confirmation' && (
        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-center space-y-3 animate-fade-in text-xs">
          {latestBooking ? (
            <>
              <div className={`w-14 h-14 rounded-full ${themeStyle.badgeBg} flex items-center justify-center mx-auto`}>
                <CheckCircle2 className={`w-6 h-6 ${themeStyle.primaryText}`} />
              </div>
              <h4 className="text-sm font-bold text-white">تم تأكيد حجزك بنجاح</h4>
              <p className="text-slate-400 font-mono">رقم المرجع: {latestBooking.id}</p>
              <div className="max-w-xs mx-auto p-4 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-start space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-400">الغرفة:</span><span className="text-white font-bold">{latestBooking.roomName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">الوصول:</span><span className="text-white font-mono">{latestBooking.checkIn}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">المغادرة:</span><span className="text-white font-mono">{latestBooking.checkOut}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">عدد الليالي:</span><span className="text-white font-mono">{latestBooking.nights}</span></div>
                <div className="flex justify-between pt-1.5 border-t border-white/10"><span className="text-slate-400">الإجمالي:</span><span className={`font-bold ${themeStyle.primaryText}`}>{price(latestBooking.totalIQD)}</span></div>
              </div>
            </>
          ) : (
            <p className="text-slate-500 py-6">لا يوجد حجز مؤكد بعد — أكمل خطوة الحجز أولاً.</p>
          )}
        </div>
      )}
    </div>
  );
}
