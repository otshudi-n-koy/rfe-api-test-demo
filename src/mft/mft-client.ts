import axios, { AxiosInstance, AxiosResponse } from 'axios';

export class MftClient {
  private axiosInstance: AxiosInstance;

  constructor(baseUrl: string = process.env.MFT_BASE_URL || 'http://localhost:3100') {
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.axiosInstance.interceptors.request.use((config) => {
      console.log(`  [MFT] → ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`  [MFT] ← ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.log(`  [MFT] ← ERROR ${error.response?.status}: ${error.response?.statusText}`);
        return Promise.resolve(error.response);
      }
    );
  }

  async healthCheck(): Promise<AxiosResponse> {
    return this.axiosInstance.get('/mft/health');
  }

  async checkDirectories(): Promise<AxiosResponse> {
    return this.axiosInstance.get('/mft/directories');
  }

  async depositFile(payload: MftFilePayload): Promise<AxiosResponse> {
    return this.axiosInstance.post('/mft/deposit', payload);
  }

  async depositBatch(files: MftFilePayload[]): Promise<AxiosResponse> {
    return this.axiosInstance.post('/mft/deposit/batch', { files });
  }

  async getLogs(): Promise<AxiosResponse> {
    return this.axiosInstance.get('/mft/logs');
  }

  async reset(): Promise<AxiosResponse> {
    return this.axiosInstance.delete('/mft/reset');
  }
}

export interface MftFilePayload {
  numero_facture: string;
  siren_emetteur: string;
  siren_destinataire?: string;
  montant_ht?: number;
  taux_tva?: number;
  devise?: string;
  format?: string;
  corrupted?: boolean;
}