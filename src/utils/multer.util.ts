import { diskStorage } from 'multer';
import * as path from 'path';
import { Request } from 'express';

const storage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads');
  },
  filename: (req, file, cb) => {
    const withoutExt = file.originalname.substring(
      0,
      file.originalname.lastIndexOf('.'),
    );
    const processedName = withoutExt.replace(/\s+/g, '_');
    const filename = `${processedName}_${Date.now()}${path.extname(
      file.originalname,
    )}`;
    cb(null, filename.replace(/\\/g, '/'));
  },
});

export const multerConfig = {
  storage,
  limits: { fileSize: 1024 * 1024, fieldSize: 1024 * 1024 },

  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf',
      'text/plain',
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      return cb(
        new Error('Only PDF, JPEG, PNG, and TXT files are allowed'),
        false,
      );
    }

    cb(null, true);
  },
};
