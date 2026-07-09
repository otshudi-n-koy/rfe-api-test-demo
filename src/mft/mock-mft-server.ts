import express, { Request, Response } from 'express';
import { Server } from 'http';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
app.use(express.json());

// ── Répertoires simulés ────────────────────────────────────────────────────
const EMISSION_DIR = path.join(process.cwd(), 'src', 'mft', 'fixtures', 'emission');
const DESTINATION_DIR = path.join(process.cwd(), 'src', 'mft', 'fixtures', 'destination');
const ACCUSE_DIR = path.join(process.cwd(), 'src', 'mft', 'fixtures', 'accuses');

// ── Formats acceptés ───────────────────────────────────────────────────────
const ACCEPTED_FORMATS = ['json', 'xml'];

// ── État en mémoire ────────────────────────────────────────────────────────
const transferredFiles = new Set<string>();
const transferLog: TransferLog[] = [];

// ── Types ──────────────────────────────────────────────────────────────────
interface InvoiceFile {
  numero_facture: string;
  siren_emetteur: string;
  siren_destinataire?: string;
  montant_ht: number;
  taux_tva: number;
  devise?: string;
  format?: string;
  corrupted?: boolean;
}

interface TransferLog {
  id: string;
  filename: string;
  status: 'SUCCESS' | 'REJECTED';
  error_code?: string;
  timestamp: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function generateAccuseId(): string {
  return `ACK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function ensureDirectories(): void {
  [EMISSION_DIR, DESTINATION_DIR, ACCUSE_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function validateInvoiceFile(file: InvoiceFile): { valid: boolean; error_code?: string } {
  if (file.corrupted) return { valid: false, error_code: 'FILE_CORRUPTED' };
  if (file.format && !ACCEPTED_FORMATS.includes(file.format.toLowerCase())) {
    return { valid: false, error_code: 'INVALID_FORMAT' };
  }
  if (file.siren_emetteur === '000000000') {
    return { valid: false, error_code: 'INVALID_SIREN' };
  }
  return { valid: true };
}

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/mft/health', (_req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'rfe-mock-mft' });
});

// ── Répertoires ────────────────────────────────────────────────────────────
app.get('/mft/directories', (_req: Request, res: Response) => {
  ensureDirectories();
  res.json({
    emission: EMISSION_DIR,
    destination: DESTINATION_DIR,
    accuses: ACCUSE_DIR,
    status: 'ACCESSIBLE',
  });
});

// ── POST /mft/deposit — Dépôt d'un fichier ────────────────────────────────
app.post('/mft/deposit', (req: Request, res: Response) => {
  ensureDirectories();
  const file: InvoiceFile = req.body;
  const filename = `${file.numero_facture}.${file.format || 'json'}`;

  // Vérification doublon
  if (transferredFiles.has(file.numero_facture)) {
    const log: TransferLog = {
      id: generateAccuseId(),
      filename,
      status: 'REJECTED',
      error_code: 'DUPLICATE_FILE',
      timestamp: new Date().toISOString(),
    };
    transferLog.push(log);
    return res.status(409).json({
      status: 'REJECTED',
      error_code: 'DUPLICATE_FILE',
      message: `Le fichier ${filename} a déjà été transféré`,
      accuse_id: log.id,
    });
  }

  // Validation du fichier
  const validation = validateInvoiceFile(file);
  if (!validation.valid) {
    const log: TransferLog = {
      id: generateAccuseId(),
      filename,
      status: 'REJECTED',
      error_code: validation.error_code,
      timestamp: new Date().toISOString(),
    };
    transferLog.push(log);
    return res.status(422).json({
      status: 'REJECTED',
      error_code: validation.error_code,
      message: `Fichier rejeté : ${validation.error_code}`,
      accuse_id: log.id,
    });
  }

  // Dépôt accepté — écriture dans le répertoire d'émission
  const emissionPath = path.join(EMISSION_DIR, filename);
  fs.writeFileSync(emissionPath, JSON.stringify(file, null, 2));

  // Transfert vers destination
  const destinationPath = path.join(DESTINATION_DIR, filename);
  fs.copyFileSync(emissionPath, destinationPath);

  // Génération accusé
  const accuseId = generateAccuseId();
  const accuse = {
    id: accuseId,
    filename,
    status: 'SUCCESS',
    emission_path: emissionPath,
    destination_path: destinationPath,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(ACCUSE_DIR, `${accuseId}.json`), JSON.stringify(accuse, null, 2));

  // Marquage comme transféré
  transferredFiles.add(file.numero_facture);
  transferLog.push({ id: accuseId, filename, status: 'SUCCESS', timestamp: accuse.timestamp });

  return res.status(201).json({
    status: 'SUCCESS',
    accuse_id: accuseId,
    filename,
    emission_path: emissionPath,
    destination_path: destinationPath,
    timestamp: accuse.timestamp,
  });
});

// ── POST /mft/deposit/batch — Dépôt d'un lot ──────────────────────────────
app.post('/mft/deposit/batch', (req: Request, res: Response) => {
  ensureDirectories();
  const files: InvoiceFile[] = req.body.files;
  const results: any[] = [];
  let successCount = 0;

  for (const file of files) {
    const filename = `${file.numero_facture}.${file.format || 'json'}`;
    const validation = validateInvoiceFile(file);

    if (!validation.valid) {
      results.push({ filename, status: 'REJECTED', error_code: validation.error_code });
      continue;
    }

    const emissionPath = path.join(EMISSION_DIR, filename);
    const destinationPath = path.join(DESTINATION_DIR, filename);
    fs.writeFileSync(emissionPath, JSON.stringify(file, null, 2));
    fs.copyFileSync(emissionPath, destinationPath);

    const accuseId = generateAccuseId();
    const accuse = { id: accuseId, filename, status: 'SUCCESS', timestamp: new Date().toISOString() };
    fs.writeFileSync(path.join(ACCUSE_DIR, `${accuseId}.json`), JSON.stringify(accuse, null, 2));

    transferredFiles.add(file.numero_facture);
    results.push({ filename, status: 'SUCCESS', accuse_id: accuseId });
    successCount++;
  }

  return res.status(200).json({
    total: files.length,
    success: successCount,
    rejected: files.length - successCount,
    results,
  });
});

// ── GET /mft/logs — Historique des transferts ──────────────────────────────
app.get('/mft/logs', (_req: Request, res: Response) => {
  res.json({ total: transferLog.length, logs: transferLog });
});

// ── DELETE /mft/reset — Reset état (entre tests) ──────────────────────────
app.delete('/mft/reset', (_req: Request, res: Response) => {
  transferredFiles.clear();
  transferLog.length = 0;
  [EMISSION_DIR, DESTINATION_DIR, ACCUSE_DIR].forEach(dir => {
    if (fs.existsSync(dir)) {
      //fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f)));
      fs.readdirSync(dir).forEach((f: string) => fs.unlinkSync(path.join(dir, f)));
    }
  });
  res.json({ status: 'RESET', message: 'État MFT réinitialisé' });
});

// ── Lifecycle ──────────────────────────────────────────────────────────────
let serverInstance: Server | null = null;

export function startMftServer(port = 3100): Promise<Server> {
  return new Promise((resolve) => {
    serverInstance = app.listen(port, () => {
      console.log(`  [MFT] Mock MFT server running on http://localhost:${port}`);
      resolve(serverInstance!);
    });
  });
}

export function stopMftServer(): Promise<void> {
  return new Promise((resolve) => {
    if (serverInstance) {
      serverInstance.close(() => {
        console.log('  [MFT] Server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// export default app;