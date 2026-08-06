import { ContractData, PaymentRecord } from '../types';

export function sumPayments(payments: PaymentRecord[] | undefined): number {
  return (payments || []).reduce((sum, p) => sum + (Number(p.amountIQD) || 0), 0);
}

/** unpaid/partial/paid derived purely from money actually collected vs. the agreed price —
 *  keeps the two fields from ever drifting out of sync with each other or with the ledger. */
export function derivePaymentStatus(paidIQD: number, totalIQD: number): NonNullable<ContractData['paymentStatus']> {
  if (paidIQD <= 0) return 'unpaid';
  if (paidIQD >= totalIQD) return 'paid';
  return 'partial';
}

export function newPaymentId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
