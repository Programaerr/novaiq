import { auth } from './firebase';

export interface ManagedUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  disabled: boolean;
  createdAt: string;
  lastSignInAt: string;
}

// Every call here needs the current admin's own ID token (server verifies both that
// it's valid AND that the email is in the admins allowlist) — listing/editing/deleting
// OTHER people's accounts can only happen server-side, with a real service account key
// that never reaches the browser.
async function authedFetch(path: string, options: RequestInit = {}): Promise<any> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const idToken = await user.getIdToken();

  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
      Authorization: `Bearer ${idToken}`,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body;
}

export async function listAllUsers(): Promise<ManagedUser[]> {
  const data = await authedFetch('/api/admin/users');
  return data.users;
}

export async function setUserDisabled(uid: string, disabled: boolean): Promise<void> {
  await authedFetch(`/api/admin/users/${uid}`, {
    method: 'PATCH',
    body: JSON.stringify({ disabled }),
  });
}

export async function deleteUserAccount(uid: string): Promise<void> {
  await authedFetch(`/api/admin/users/${uid}`, { method: 'DELETE' });
}
