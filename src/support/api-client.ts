import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

export class InvoiceApiClient {
  private axiosInstance: AxiosInstance;

  constructor(baseUrl: string = process.env.API_BASE_URL || 'http://localhost:3099') {
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.axiosInstance.interceptors.request.use((config) => {
      console.log(`  → ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`  ← ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.log(`  ← ERROR ${error.response?.status}: ${error.response?.statusText}`);
        return Promise.resolve(error.response);
      }
    );
  }

  setToken(token: string): void {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  async healthCheck(): Promise<AxiosResponse> {
    return this.axiosInstance.get('/health');
  }

  async authenticate(role: 'emitter' | 'receiver'): Promise<string> {
    const response = await this.axiosInstance.post('/auth/login', { role });
    const token = response?.data?.token || `mock-token-${role}-${Date.now()}`;
    this.setToken(token);
    return token;
  }

  async submitInvoice(payload: InvoicePayload): Promise<AxiosResponse> {
    return this.axiosInstance.post('/invoices', payload);
  }

  async getInvoice(invoiceId: string): Promise<AxiosResponse> {
    return this.axiosInstance.get(`/invoices/${invoiceId}`);
  }

  async listInvoices(params: InvoiceListParams = {}): Promise<AxiosResponse> {
    const query = new URLSearchParams();
    if (params.direction) query.set('direction', params.direction);
    if (params.status) query.set('status', params.status);
    if (params.siren) query.set('siren', params.siren);
    return this.axiosInstance.get(`/invoices?${query.toString()}`);
  }

  async acknowledgeInvoice(invoiceId: string): Promise<AxiosResponse> {
    return this.axiosInstance.put(`/invoices/${invoiceId}/acknowledge`, {});
  }

  async rejectInvoice(invoiceId: string, reason: string): Promise<AxiosResponse> {
    return this.axiosInstance.put(`/invoices/${invoiceId}`, {
      status: 'REJECTED',
      rejectionReason: reason,
    });
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface InvoicePayload {
  numero_facture?: string;
  date_emission?: string;
  montant_ht?: number;
  taux_tva?: number;
  montant_ttc?: number;
  devise?: string;
  siren_emetteur?: string;
  siren_destinataire?: string;
  type?: 'INVOICE' | 'CREDIT_NOTE';
  facture_originale?: string;
}

export interface InvoiceListParams {
  direction?: 'SENT' | 'RECEIVED';
  status?: string;
  siren?: string;
}