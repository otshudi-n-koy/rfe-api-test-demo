import { setWorldConstructor, IWorldOptions } from '@cucumber/cucumber';
import { InvoiceApiClient, InvoicePayload } from './api-client';
import { MftClient } from '../mft/mft-client';
import Ajv from 'ajv';

export class RfeWorld {
  public apiClient: InvoiceApiClient;
  public mftClient: MftClient;
  public lastResponse: any = null;
  public currentInvoice: InvoicePayload = {};
  public currentFile: any = {};
  public currentBatch: any[] = [];
  public authToken: string = '';
  public ajv: Ajv;
  public parameters: any;

  constructor(options: IWorldOptions) {
    this.parameters = options.parameters;
    this.apiClient = new InvoiceApiClient();
    this.mftClient = new MftClient();
    this.ajv = new Ajv({ allErrors: true });
  }

  getInvoiceSchema() {
    return {
      type: 'object',
      required: ['id', 'numero_facture', 'status'],
      properties: {
        id: { type: 'string' },
        numero_facture: { type: 'string', minLength: 1 },
        status: { type: 'string' },
        montant_ht: { type: 'number' },
        taux_tva: { type: 'number' },
        devise: { type: 'string' },
        siren_emetteur: { type: 'string' },
        siren_destinataire: { type: 'string' },
      },
      additionalProperties: true,
    };
  }

  getRfeRequiredFields(): string[] {
    return ['id', 'numero_facture', 'status', 'siren_emetteur', 'siren_destinataire'];
  }
}

setWorldConstructor(RfeWorld);