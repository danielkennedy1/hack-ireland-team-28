import { app } from 'electron';
import path from 'path';
import * as server from './server/server';

export const startServer = () => {
  // Set output directory for STL files
  const outputDir = path.join(app.getPath('userData'), 'models');
  server.setOutputDirectory(outputDir);
  
  // Start the server
  server.start();
};
