import express, { Request, Response } from 'express';
import { Server } from 'http';

const app = express();
app.use(express.json());

// ── État en mémoire ────────────────────────────────────────────────────────
const invoices: Record<string, any> = {
  'INV-20240601-001': {
    id: 'INV-20240601-001',
    numero_facture: 'INV-20240601-001',
    status: 'SUBMITTED',
    siren_emetteur: '123456789',
    siren_destinataire: '987654321',
    montant_ht: 1000.00,
    taux_tva: 20,
    montant_ttc: 1200.00,
    devise: 'EUR',
    date_emission: '2024-06-01',
    type: 'INVOICE',
  },
  'INV-20240601-002': {
    id: 'INV-20240601-002',
    numero_facture: 'INV-20240601-002',
    status: 'SUBMITTED',
    siren_emetteur: '111111111',
    siren_destinataire: '222222222',
    montant_ht: 500.00,
    taux_tva: 20,
    montant_ttc: 600.00,
    devise: 'EUR',
    date_emission: '2024-06-01',
    type: 'INVOICE',
  },
};

let invoiceCounter = 100;

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'rfe-mock-api' });
});

// ── Auth ───────────────────────────────────────────────────────────────────
app.post('/auth/login', (_req: Request, res: Response) => {
  res.json({ token: `mock-token-${Date.now()}`, expiresIn: 3600 });
});

// ── POST /invoices ─────────────────────────────────────────────────────────
app.post('/invoices', (req: Request, res: Response) => {
  const body = req.body;

  if (body.siren_emetteur === '000000000') {
    return res.status(422).json({
      code: 'INVALID_SIREN',
      message: 'Le champ siren_emetteur est invalide',
      field: 'siren_emetteur',
    });
  }

  if (body.montant_ht && body.taux_tva !== undefined && body.montant_ttc) {
    const expected = Math.round(body.montant_ht * (1 + body.taux_tva / 100) * 100) / 100;
    if (Math.abs(expected - body.montant_ttc) > 0.01) {
      return res.status(422).json({
        code: 'TVA_MISMATCH',
        message: 'Le montant TTC ne correspond pas au calcul HT + TVA',
      });
    }
  }

  invoiceCounter++;
  const newInvoice = {
    id: `INV-NEW-${invoiceCounter}`,
    ...body,
    status: 'SUBMITTED',
    created_at: new Date().toISOString(),
  };
  invoices[newInvoice.id] = newInvoice;
  return res.status(201).json(newInvoice);
});

// ── GET /invoices ──────────────────────────────────────────────────────────
app.get('/invoices', (req: Request, res: Response) => {
  const { direction, status, siren } = req.query;
  let results = Object.values(invoices);

  if (status) results = results.filter(inv => inv.status === status);
  if (direction === 'RECEIVED' && siren) {
    results = results.filter(inv => inv.siren_destinataire === siren);
  }

  res.json({ data: results, total: results.length, page: 1, pageSize: 10 });
});

// ── GET /invoices/:id ──────────────────────────────────────────────────────
app.get('/invoices/:id', (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const invoice = invoices[id];

  if (!invoice) {
    return res.status(404).json({
      code: 'INVOICE_NOT_FOUND',
      message: `Facture ${id} introuvable`,
    });
  }

  const authHeader = req.headers.authorization || '';
  if (invoice.siren_emetteur === '111111111' && authHeader.includes('receiver')) {
    return res.status(403).json({
      code: 'ACCESS_DENIED',
      message: 'Accès non autorisé à cette facture',
    });
  }

  return res.json(invoice);
});

// ── PUT /invoices/:id/acknowledge ──────────────────────────────────────────
app.put('/invoices/:id/acknowledge', (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const invoice = invoices[id];
  if (!invoice) return res.status(404).json({ code: 'INVOICE_NOT_FOUND' });
  invoice.status = 'ACKNOWLEDGED';
  invoice.acknowledged_at = new Date().toISOString();
  return res.json(invoice);
});

// ── PUT /invoices/:id ──────────────────────────────────────────────────────
app.put('/invoices/:id', (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const invoice = invoices[id];
  if (!invoice) return res.status(404).json({ code: 'INVOICE_NOT_FOUND' });
  Object.assign(invoice, req.body, { updated_at: new Date().toISOString() });
  return res.json(invoice);
});

// ── Lifecycle ──────────────────────────────────────────────────────────────
let serverInstance: Server | null = null;

export function startMockServer(port = 3099): Promise<Server> {
  return new Promise((resolve) => {
    serverInstance = app.listen(port, () => {
      console.log(`  [MOCK] RFE API mock server running on http://localhost:${port}`);
      resolve(serverInstance!);
    });
  });
}

export function stopMockServer(): Promise<void> {
  return new Promise((resolve) => {
    if (serverInstance) {
      serverInstance.close(() => {
        console.log('  [MOCK] Server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export default app;