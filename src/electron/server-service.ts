import { app } from 'electron';
import path from 'path';
import * as server from './server/server';

export const startServer = () => {
  // Set output directory for STL files
  server.setOutputDirectory('assets');

  // Start the server
  server.start();
};
