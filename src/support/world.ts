import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { InvoiceApiClient, InvoicePayload } from './api-client';
import Ajv from 'ajv';

export class RfeWorld extends World {
  public apiClient: InvoiceApiClient;
  public lastResponse: any = null;
  public currentInvoice: InvoicePayload = {};
  public authToken: string = '';
  public ajv: Ajv;

  constructor(options: IWorldOptions) {
    super(options);
    this.apiClient = new InvoiceApiClient();
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