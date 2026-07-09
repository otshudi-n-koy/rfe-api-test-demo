import { World, IWorldOptions } from '@cucumber/cucumber';
import { MftClient } from './mft-client';

export class MftWorld extends World {
  public mftClient: MftClient;
  public lastResponse: any = null;
  public currentFile: any = {};
  public currentBatch: any[] = [];

  constructor(options: IWorldOptions) {
    super(options);
    this.mftClient = new MftClient();
  }
}