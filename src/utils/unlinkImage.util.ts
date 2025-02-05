import { promises } from 'fs';

export function unlinkSavedFile(filePaths: string | string[]): void {
  try {
    if (Array.isArray(filePaths)) {
     filePaths.forEach(async (filePath) => {
        await promises.unlink(filePath);
      });    
    }
    else {
      promises.unlink(filePaths)
    }
  } catch (error) {
    console.error('Error unlinking file(s):', error)
    throw new Error('Failed to unlink file(s)')
  }
}
