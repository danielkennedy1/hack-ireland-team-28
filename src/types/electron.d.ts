export interface IElectronAPI {
  generateModel: (prompt: string) => Promise<any>;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
