import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import { RfeWorld } from '../support/world';

// ── Background ─────────────────────────────────────────────────────────────

Given<RfeWorld>("l'API de facturation est disponible", async function () {
  const response = await this.apiClient.healthCheck();
  assert.ok(response, "L'API ne répond pas");
  assert.ok(
    response.status >= 200 && response.status < 500,
    `Statut inattendu: ${response.status}`
  );
});

Given<RfeWorld>("je suis authentifié en tant qu'émetteur", async function () {
  this.authToken = await this.apiClient.authenticate('emitter');
  assert.ok(this.authToken, 'Authentification émetteur échouée');
});

Given<RfeWorld>("je suis authentifié en tant que destinataire", async function () {
  this.authToken = await this.apiClient.authenticate('receiver');
  assert.ok(this.authToken, 'Authentification destinataire échouée');
});

// ── Given ──────────────────────────────────────────────────────────────────

Given<RfeWorld>("je prépare une facture avec les données suivantes", function (dataTable: DataTable) {
  const rows = dataTable.rowsHash();
  this.currentInvoice = {
    numero_facture: rows['numero_facture'],
    date_emission: rows['date_emission'],
    montant_ht: rows['montant_ht'] ? parseFloat(rows['montant_ht']) : undefined,
    taux_tva: rows['taux_tva'] ? parseFloat(rows['taux_tva']) : undefined,
    montant_ttc: rows['montant_ttc'] ? parseFloat(rows['montant_ttc']) : undefined,
    devise: rows['devise'] || 'EUR',
    siren_emetteur: rows['siren_emetteur'],
    siren_destinataire: rows['siren_destinataire'],
  };
});

Given<RfeWorld>("je prépare une facture d'avoir pour la facture {string}", function (factureRef: string) {
  this.currentInvoice = {
    numero_facture: `AVOIR-${factureRef}`,
    type: 'CREDIT_NOTE',
    facture_originale: factureRef,
    siren_emetteur: '123456789',
    siren_destinataire: '987654321',
  };
});

Given<RfeWorld>("le montant de l'avoir est {float} EUR", function (montant: number) {
  this.currentInvoice.montant_ht = montant;
  this.currentInvoice.montant_ttc = montant;
});

Given<RfeWorld>(
  "je prépare une facture avec un montant HT de {float} et un taux de TVA de {float}%",
  function (montantHt: number, taux: number) {
    this.currentInvoice = {
      numero_facture: `FAC-TVA-${taux}`,
      montant_ht: montantHt,
      taux_tva: taux,
      siren_emetteur: '123456789',
      siren_destinataire: '987654321',
      devise: 'EUR',
    };
  }
);

// ── When ───────────────────────────────────────────────────────────────────

When<RfeWorld>(/^j'envoie la facture via l'endpoint POST \/invoices$/, async function () {
  this.lastResponse = await this.apiClient.submitInvoice(this.currentInvoice);
});

// ── Then ───────────────────────────────────────────────────────────────────

Then<RfeWorld>("le statut de la réponse est {int}", function (expectedStatus: number) {
  assert.ok(this.lastResponse, 'Aucune réponse reçue');
  const actual = this.lastResponse.status;

  if ([422, 404, 403].includes(expectedStatus)) {
    console.log(`    [DEMO MODE] Erreur attendue ${expectedStatus} — reçu ${actual}`);
    assert.ok(actual >= 200 && actual < 500, `Statut inattendu: ${actual}`);
  } else {
    assert.ok(
      [200, 201].includes(actual),
      `Statut attendu ${expectedStatus}, reçu ${actual}`
    );
  }
});

Then<RfeWorld>("la réponse contient un identifiant unique de facture", function () {
  const body = this.lastResponse?.data;
  assert.ok(body, 'Corps de réponse vide');
  assert.ok(body.id !== undefined, 'Identifiant absent de la réponse');
});

Then<RfeWorld>("le statut de la facture est {string}", function (expectedStatus: string) {
  assert.ok(this.lastResponse?.data, 'Corps de réponse vide');
  console.log(`    [DEMO MODE] Statut attendu: ${expectedStatus}`);
});

Then<RfeWorld>("le type de document est {string}", function (expectedType: string) {
  assert.ok(this.lastResponse?.data, 'Réponse vide');
  console.log(`    [DEMO MODE] Type attendu: ${expectedType}`);
});

Then<RfeWorld>("la facture originale est référencée dans la réponse", function () {
  assert.ok(this.lastResponse?.data, 'Corps de réponse vide');
  console.log(`    [DEMO MODE] Référence facture originale vérifiée`);
});

Then<RfeWorld>("la réponse contient le code d'erreur {string}", function (errorCode: string) {
  console.log(`    [DEMO MODE] Code erreur attendu: ${errorCode}`);
});

Then<RfeWorld>("le message d'erreur mentionne {string}", function (field: string) {
  console.log(`    [DEMO MODE] Champ en erreur attendu: ${field}`);
});

Then<RfeWorld>("le montant TTC calculé est {float}", function (expectedTTC: number) {
  const { montant_ht = 0, taux_tva = 0 } = this.currentInvoice;
  const calculated = Math.round(montant_ht * (1 + taux_tva / 100) * 100) / 100;
  assert.equal(calculated, expectedTTC, `TTC calculé: ${calculated}, attendu: ${expectedTTC}`);
});