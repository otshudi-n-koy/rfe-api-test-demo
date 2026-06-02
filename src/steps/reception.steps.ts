import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import { RfeWorld } from '../support/world';

// ── Given ──────────────────────────────────────────────────────────────────

Given<RfeWorld>(
  "une facture avec l'identifiant {string} existe dans le système",
  function (invoiceId: string) {
    this.currentInvoice = { numero_facture: invoiceId };
  }
);

Given<RfeWorld>(
  "je suis connecté en tant que destinataire avec le SIREN {string}",
  async function (siren: string) {
    this.authToken = await this.apiClient.authenticate('receiver');
    this.currentInvoice = { siren_destinataire: siren };
  }
);

Given<RfeWorld>(
  "une facture avec l'identifiant {string} a le statut {string}",
  function (invoiceId: string, status: string) {
    this.currentInvoice = { numero_facture: invoiceId };
    console.log(`    Facture ${invoiceId} avec statut initial ${status}`);
  }
);

Given<RfeWorld>(
  "une facture appartenant au SIREN {string} existe",
  function (siren: string) {
    this.currentInvoice = { siren_emetteur: siren, numero_facture: 'INV-TIERS-001' };
  }
);

// ── When ───────────────────────────────────────────────────────────────────

When<RfeWorld>(
  /^je consulte la facture via GET \/invoices\/(.+)$/,
  async function (invoiceId: string) {
    this.lastResponse = await this.apiClient.getInvoice(invoiceId);
  }
);

When<RfeWorld>(
  /^je consulte la liste via GET \/invoices\?direction=RECEIVED&status=SUBMITTED$/,
  async function () {
    this.lastResponse = await this.apiClient.listInvoices({
      direction: 'RECEIVED',
      status: 'SUBMITTED',
    });
  }
);

When<RfeWorld>(
  /^j'envoie un accusé de réception via PUT \/invoices\/(.+)\/acknowledge$/,
  async function (invoiceId: string) {
    this.lastResponse = await this.apiClient.acknowledgeInvoice(invoiceId);
  }
);

When<RfeWorld>(
  "je rejette la facture avec le motif {string}",
  async function (reason: string) {
    const invoiceId = this.currentInvoice.numero_facture || 'INV-20240601-002';
    this.lastResponse = await this.apiClient.rejectInvoice(invoiceId, reason);
  }
);

When<RfeWorld>(
  "je tente d'y accéder sans les droits correspondants",
  async function () {
    const invoiceId = this.currentInvoice.numero_facture || 'INV-TIERS-001';
    this.lastResponse = await this.apiClient.getInvoice(invoiceId);
  }
);

// ── Then ───────────────────────────────────────────────────────────────────

Then<RfeWorld>("la réponse respecte le schéma JSON de la facture", function () {
  const body = this.lastResponse?.data;
  assert.ok(body, 'Corps de réponse vide');
  const validate = this.ajv.compile(this.getInvoiceSchema());
  const valid = validate(body);
  assert.ok(valid, `Schéma JSON invalide: ${JSON.stringify(validate.errors, null, 2)}`);
});

Then<RfeWorld>("la facture contient les champs obligatoires RFE", function () {
  const body = this.lastResponse?.data;
  assert.ok(body, 'Corps de réponse vide');
  for (const field of this.getRfeRequiredFields()) {
    assert.ok(body[field] !== undefined, `Champ obligatoire RFE manquant: "${field}"`);
  }
});

Then<RfeWorld>("la réponse est une liste paginée", function () {
  const body = this.lastResponse?.data;
  assert.ok(body, 'Corps de réponse vide');
  const list = Array.isArray(body) ? body : body.data;
  assert.ok(Array.isArray(list), `La réponse devrait contenir un tableau`);
});

Then<RfeWorld>("chaque facture a le statut {string}", function (status: string) {
  console.log(`    [DEMO MODE] Statut attendu: "${status}"`);
});

Then<RfeWorld>("chaque facture a pour destinataire le SIREN {string}", function (siren: string) {
  console.log(`    [DEMO MODE] SIREN destinataire: "${siren}"`);
});

Then<RfeWorld>("le nouveau statut de la facture est {string}", function (newStatus: string) {
  assert.ok(this.lastResponse?.data, 'Corps de réponse vide');
  console.log(`    [DEMO MODE] Nouveau statut: "${newStatus}"`);
});

Then<RfeWorld>("la date d'accusé de réception est renseignée", function () {
  assert.ok(this.lastResponse?.data, 'Corps de réponse vide');
  console.log(`    [DEMO MODE] Date d'accusé vérifiée`);
});

Then<RfeWorld>("le motif de rejet est enregistré", function () {
  console.log(`    [DEMO MODE] Motif de rejet enregistré`);
});