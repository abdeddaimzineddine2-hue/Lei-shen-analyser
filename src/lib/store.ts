import { create } from 'zustand';

interface AppState {
  clientId: string | null;
  clientSecret: string | null;
  setCredentials: (id: string, secret: string) => void;
  hasCredentials: () => boolean;
  clearCredentials: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  clientId: localStorage.getItem('wcl_client_id'),
  clientSecret: localStorage.getItem('wcl_client_secret'),
  
  setCredentials: (id, secret) => {
    localStorage.setItem('wcl_client_id', id);
    localStorage.setItem('wcl_client_secret', secret);
    set({ clientId: id, clientSecret: secret });
  },

  hasCredentials: () => {
    const { clientId, clientSecret } = get();
    return !!clientId && !!clientSecret;
  },

  clearCredentials: () => {
    localStorage.removeItem('wcl_client_id');
    localStorage.removeItem('wcl_client_secret');
    set({ clientId: null, clientSecret: null });
  }
}));
