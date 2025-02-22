import { contextBridge } from 'electron';
import { CONFIG } from './server/config';

contextBridge.exposeInMainWorld('electron', {
    generateModel: async (prompt: string) => {
      try {
        console.log('Sending request to:', `${CONFIG.SERVER_URL}/generate-model`);
        const response = await fetch(`${CONFIG.SERVER_URL}/generate-model`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ prompt }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server response not ok:', response.status, errorText);
          throw new Error(`Server error: ${response.status} ${errorText}`);
        }
        
        return response.json();
      } catch (error) {
        console.error('Fetch error:', error);
        return { error: error.message };
      }
    }
  });