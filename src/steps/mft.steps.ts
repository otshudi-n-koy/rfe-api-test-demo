import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import { RfeWorld } from '../support/world';

// ── Background ─────────────────────────────────────────────────────────────

Given<RfeWorld>('le système MFT est disponible', async function () {
  const response = await this.mftClient.healthCheck();
  assert.ok(response, 'Le système MFT ne répond pas');
  assert.ok(
    response.status >= 200 && response.status < 500,
    `Statut inattendu: ${response.status}`
  );
});

Given<RfeWorld>('le répertoire de dépôt est accessible', async function () {
  const response = await this.mftClient.checkDirectories();
  assert.ok(response, 'Les répertoires MFT ne sont pas accessibles');
  assert.equal(response.data?.status, 'ACCESSIBLE', 'Répertoire de dépôt inaccessible');
});

// ── Given ──────────────────────────────────────────────────────────────────

Given<RfeWorld>(
  'je prépare un fichier de facture JSON avec les données suivantes',
  function (dataTable: DataTable) {
    const rows = dataTable.rowsHash();
    this.currentFile = {
      numero_facture: rows['numero_facture'],
      siren_emetteur: rows['siren_emetteur'],
      siren_destinataire: rows['siren_destinataire'],
      montant_ht: rows['montant_ht'] ? parseFloat(rows['montant_ht']) : undefined,
      taux_tva: rows['taux_tva'] ? parseFloat(rows['taux_tva']) : undefined,
      devise: rows['devise'] || 'EUR',
      format: 'json',
    };
  }
);

Given<RfeWorld>('je prépare un fichier de facture corrompu', function () {
  this.currentFile = {
    numero_facture: 'FAC-CORRUPTED-001',
    siren_emetteur: '123456789',
    montant_ht: 1000.00,
    taux_tva: 20,
    format: 'json',
    corrupted: true,
  };
});

Given<RfeWorld>(
  'je prépare un fichier de facture avec un format invalide {string}',
  function (format: string) {
    this.currentFile = {
      numero_facture: 'FAC-FORMAT-001',
      siren_emetteur: '123456789',
      montant_ht: 1000.00,
      taux_tva: 20,
      format,
    };
  }
);

Given<RfeWorld>(
  'je prépare un lot de {int} fichiers de factures valides',
  function (count: number) {
    this.currentBatch = Array.from({ length: count }, (_, i) => ({
      numero_facture: `FAC-BATCH-00${i + 1}`,
      siren_emetteur: '123456789',
      siren_destinataire: '987654321',
      montant_ht: 1000.00 * (i + 1),
      taux_tva: 20,
      devise: 'EUR',
      format: 'json',
    }));
  }
);

Given<RfeWorld>(
  'un fichier {string} a déjà été transféré',
  async function (numeroFacture: string) {
    // Dépose une première fois pour simuler un transfert existant
    await this.mftClient.depositFile({
      numero_facture: numeroFacture,
      siren_emetteur: '123456789',
      siren_destinataire: '987654321',
      montant_ht: 1000.00,
      taux_tva: 20,
      format: 'json',
    });
    // Prépare le même fichier pour le When suivant
    this.currentFile = {
      numero_facture: numeroFacture,
      siren_emetteur: '123456789',
      siren_destinataire: '987654321',
      montant_ht: 1000.00,
      taux_tva: 20,
      format: 'json',
    };
  }
);

// ── When ───────────────────────────────────────────────────────────────────

When<RfeWorld>("je dépose le fichier dans le répertoire d'émission", async function () {
  this.lastResponse = await this.mftClient.depositFile(this.currentFile);
});

When<RfeWorld>("je dépose le lot dans le répertoire d'émission", async function () {
  this.lastResponse = await this.mftClient.depositBatch(this.currentBatch);
});

When<RfeWorld>(
  'je tente de déposer à nouveau le même fichier',
  async function () {
    this.lastResponse = await this.mftClient.depositFile(this.currentFile);
  }
);

// ── Then ───────────────────────────────────────────────────────────────────

Then<RfeWorld>('le fichier est accepté par le système MFT', function () {
  assert.ok(this.lastResponse, 'Aucune réponse reçue');
  assert.equal(
    this.lastResponse.status, 201,
    `Statut attendu 201, reçu ${this.lastResponse.status}`
  );
  assert.equal(
    this.lastResponse.data?.status, 'SUCCESS',
    `Statut MFT attendu SUCCESS, reçu ${this.lastResponse.data?.status}`
  );
});

Then<RfeWorld>("un accusé de dépôt est généré", function () {
  const data = this.lastResponse?.data;
  assert.ok(data?.accuse_id, "Accusé de dépôt absent de la réponse");
  assert.ok(data?.timestamp, "Timestamp de l'accusé absent");
  console.log(`    [MFT] Accusé généré : ${data.accuse_id}`);
});

Then<RfeWorld>("le fichier est transféré vers le répertoire de destination", function () {
  const data = this.lastResponse?.data;
  assert.ok(data?.destination_path, 'Chemin de destination absent');
  console.log(`    [MFT] Fichier transféré vers : ${data.destination_path}`);
});

Then<RfeWorld>('le fichier est rejeté par le système MFT', function () {
  assert.ok(this.lastResponse, 'Aucune réponse reçue');
  assert.ok(
    [409, 422].includes(this.lastResponse.status),
    `Statut de rejet attendu 409 ou 422, reçu ${this.lastResponse.status}`
  );
  assert.equal(
    this.lastResponse.data?.status, 'REJECTED',
    `Statut MFT attendu REJECTED, reçu ${this.lastResponse.data?.status}`
  );
});

Then<RfeWorld>('le code d\'erreur est {string}', function (errorCode: string) {
  const data = this.lastResponse?.data;
  assert.equal(
    data?.error_code, errorCode,
    `Code erreur attendu ${errorCode}, reçu ${data?.error_code}`
  );
});

Then<RfeWorld>("une alerte de transfert est générée", function () {
  const data = this.lastResponse?.data;
  assert.ok(data?.accuse_id, "Accusé d'erreur absent de la réponse");
  console.log(`    [MFT] Alerte générée : ${data.accuse_id}`);
});

Then<RfeWorld>(
  'tous les fichiers sont acceptés par le système MFT',
  function () {
    const data = this.lastResponse?.data;
    assert.ok(data, 'Réponse vide');
    assert.equal(
      data.success, data.total,
      `Attendu ${data.total} succès, reçu ${data.success}`
    );
  }
);

Then<RfeWorld>('{int} accusés de dépôt sont générés', function (count: number) {
  const data = this.lastResponse?.data;
  const accuses = data?.results?.filter((r: any) => r.accuse_id);
  assert.equal(
    accuses?.length, count,
    `Attendu ${count} accusés, reçu ${accuses?.length}`
  );
});

Then<RfeWorld>(
  'le lot est transféré vers le répertoire de destination',
  function () {
    const data = this.lastResponse?.data;
    assert.ok(data?.success > 0, 'Aucun fichier transféré');
    console.log(`    [MFT] Lot transféré : ${data.success}/${data.total} fichiers`);
  }
);