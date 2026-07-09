import { BeforeAll, AfterAll, Before } from '@cucumber/cucumber';
import { startMftServer, stopMftServer } from './mock-mft-server';
import { MftClient } from './mft-client';
import { RfeWorld } from '../support/world';

const MFT_PORT = 3100;
const MFT_BASE_URL = `http://localhost:${MFT_PORT}`;

BeforeAll(async function () {
  if (!process.env.MFT_BASE_URL) {
    await startMftServer(MFT_PORT);
    process.env.MFT_BASE_URL = MFT_BASE_URL;
  }
});

AfterAll(async function () {
  if (process.env.MFT_BASE_URL === MFT_BASE_URL) {
    await stopMftServer();
  }
});

Before({ tags: '@mft' }, async function (this: RfeWorld) {
  this.mftClient = new MftClient(process.env.MFT_BASE_URL || MFT_BASE_URL);
  this.lastResponse = null;
  this.currentFile = {};
  this.currentBatch = [];
  await this.mftClient.reset();
});