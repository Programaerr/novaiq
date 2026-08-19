import type React from 'react';
import {
  ArrowUpDown,
  Car,
  ChefHat,
  Dumbbell,
  ShieldCheck,
  Snowflake,
  Wifi,
  Zap,
} from 'lucide-react';
import type { SandboxTheme } from '../context';
import type { SiteAccount } from '../../../data/sandboxDemoData';
import type { AmenityKey, RentalBooking, RentalUnit } from '../../../data/rentalDemoData';

/**
 * Everything the two halves of the Sakan demo — the website and the phone app — need from the
 * shell around them.
 *
 * They receive the *same* object, and that is the demo's entire argument. `bookings` and `book`
 * are one list and one writer; booking a unit in the app puts it in the website's account page
 * because there is no second list for it to go into.
 */
export interface RentalCtx {
  /** Formats an IQD amount in whichever currency the visitor is browsing in. */
  price: (amountIQD: number) => string;
  theme: SandboxTheme;
  /** The chosen palette as a raw hex — for the 3D building's lit windows and anywhere a colour
   *  has to be handed to something that is not a Tailwind class. */
  accentHex: string;
  isNarrow: boolean;
  account: SiteAccount | null;
  bookings: RentalBooking[];
  book: (booking: Omit<RentalBooking, 'id'>) => void;
  /** Opens the shell's sign-in / account area. */
  openAccount: () => void;
  units: RentalUnit[];
}

export const AMENITY_ICON: Record<AmenityKey, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  parking: Car,
  elevator: ArrowUpDown,
  generator: Zap,
  ac: Snowflake,
  security: ShieldCheck,
  gym: Dumbbell,
  kitchen: ChefHat,
};
