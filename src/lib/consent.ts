export type ConsentStatus = 'accepted' | 'rejected';

const STORAGE_KEY = 'novaiq_cookie_consent';
const CONSENT_EVENT = 'novaiq_consent_changed';

export function getConsentStatus(): ConsentStatus | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'accepted' || value === 'rejected' ? value : null;
  } catch {
    return null;
  }
}

export function setConsentStatus(status: ConsentStatus) {
  try {
    localStorage.setItem(STORAGE_KEY, status);
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: status }));
  } catch {
    // ignore
  }
}

