const BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

async function apiFetch(path: string, options?: RequestInit) {
  const url = `${BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Origin": "https://service-manager-businessware.replit.app",
        "Referer": "https://service-manager-businessware.replit.app/",
        ...(options?.headers || {}),
      },
    });
  } catch (networkErr: unknown) {
    const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    throw new Error(`Σφάλμα δικτύου: ${msg}`);
  }
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const body = await res.text();
      const parsed = JSON.parse(body);
      errMsg = parsed.error || parsed.message || body || errMsg;
    } catch {
      errMsg = res.statusText || errMsg;
    }
    throw new Error(errMsg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Tickets
export const api = {
  tickets: {
    list: (params?: { status?: string; search?: string; technicianId?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.search) qs.set("search", params.search);
      if (params?.technicianId) qs.set("technicianId", String(params.technicianId));
      return apiFetch(`/tickets?${qs.toString()}`);
    },
    get: (id: number) => apiFetch(`/tickets/${id}`),
    getByServiceId: (serviceId: string) => apiFetch(`/tickets/by-service-id/${encodeURIComponent(serviceId)}`),
    create: (data: Record<string, unknown>) => apiFetch("/tickets", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) => apiFetch(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    updateStatus: (id: number, data: Record<string, unknown>) => apiFetch(`/tickets/${id}/status`, { method: "PATCH", body: JSON.stringify(data) }),
    submitWorkSummary: (id: number, data: Record<string, unknown>) => apiFetch(`/tickets/${id}/work-summary`, { method: "POST", body: JSON.stringify(data) }),
    addNote: (id: number, note: string, technicianId?: number) => apiFetch(`/tickets/${id}/notes`, { method: "POST", body: JSON.stringify({ note, technicianId }) }),
    publicStatus: (serviceId: string) => apiFetch(`/public/status/${encodeURIComponent(serviceId)}`),
  },
  parts: {
    listForTicket: (ticketId: number) => apiFetch(`/tickets/${ticketId}/parts`),
    addToTicket: (ticketId: number, data: Record<string, unknown>) => apiFetch(`/tickets/${ticketId}/parts`, { method: "POST", body: JSON.stringify(data) }),
    removeFromTicket: (ticketId: number, partId: number) => apiFetch(`/tickets/${ticketId}/parts/${partId}`, { method: "DELETE" }),
    list: (search?: string, barcode?: string) => {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (barcode) qs.set("barcode", barcode);
      return apiFetch(`/parts?${qs.toString()}`);
    },
    create: (data: Record<string, unknown>) => apiFetch("/parts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) => apiFetch(`/parts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/parts/${id}`, { method: "DELETE" }),
  },
  labor: {
    list: (ticketId: number) => apiFetch(`/tickets/${ticketId}/labor`),
    add: (ticketId: number, data: Record<string, unknown>) => apiFetch(`/tickets/${ticketId}/labor`, { method: "POST", body: JSON.stringify(data) }),
    stop: (ticketId: number, laborId: number) => apiFetch(`/tickets/${ticketId}/labor/${laborId}/stop`, { method: "PATCH" }),
  },
  auditLog: {
    get: (ticketId: number) => apiFetch(`/tickets/${ticketId}/audit-log`),
  },
  technicians: {
    list: () => apiFetch("/technicians"),
    login: (pin: string) => apiFetch("/technicians/login", { method: "POST", body: JSON.stringify({ pin }) }),
    create: (data: Record<string, unknown>) => apiFetch("/technicians", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) => apiFetch(`/technicians/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deactivate: (id: number) => apiFetch(`/technicians/${id}`, { method: "DELETE" }),
  },
  settings: {
    get: () => apiFetch("/settings"),
    update: (data: Record<string, unknown>) => apiFetch("/settings", { method: "PATCH", body: JSON.stringify(data) }),
  },
  analytics: {
    get: (period?: string) => apiFetch(`/analytics/dashboard?period=${period || "month"}`),
  },
  seed: () => apiFetch("/seed", { method: "POST" }),
};
