import { BeforeAll, AfterAll, Before, After } from '@cucumber/cucumber';
import { startMockServer, stopMockServer } from './mock-server';
import { RfeWorld } from './world';

const MOCK_PORT = 3099;
const MOCK_BASE_URL = `http://localhost:${MOCK_PORT}`;

BeforeAll(async function () {
  if (!process.env.API_BASE_URL) {
    await startMockServer(MOCK_PORT);
    process.env.API_BASE_URL = MOCK_BASE_URL;
  }
});

AfterAll(async function () {
  if (process.env.API_BASE_URL === MOCK_BASE_URL) {
    await stopMockServer();
  }
});

Before(function (this: RfeWorld) {
  const { InvoiceApiClient } = require('./api-client');
  this.apiClient = new InvoiceApiClient(process.env.API_BASE_URL || MOCK_BASE_URL);
  this.lastResponse = null;
  this.currentInvoice = {};
  this.authToken = '';
});