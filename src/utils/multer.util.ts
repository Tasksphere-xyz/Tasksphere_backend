// import { diskStorage, FileFilterCallback } from 'multer';
// import * as path from 'path';

// const storage = diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads');
//   },
//   filename: (req, file, cb) => {
//     const withoutExt = file.originalname.substring(
//       0,
//       file.originalname.lastIndexOf('.'),
//     );
//     const processedName = withoutExt.replace(/\s+/g, '_');
//     const filename = `${processedName}_${Date.now()}${path.extname(
//       file.originalname,
//     )}`;
//     cb(null, filename.replace(/\\/g, '/'));
//   },
// });

// export const multerConfig = {
//   storage,
//   limits: { fileSize: 1024 * 1024, fieldSize: 1024 * 1024 },
//   fileFilter: (
//     req: Request,
//     file: Express.Multer.File,
//     cb: FileFilterCallback,
//   ) => {
//     if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
//       cb(null, false);
//       return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
//     }
//     cb(null, true);
//   },
// };

// export const multerConfigForListing = {
//   storage,
//   limits: { files: 5, fileSize: 1024 * 1024, fieldSize: 1024 * 1024 },
//   fileFilter: (
//     req: Request,
//     file: Express.Multer.File,
//     cb: FileFilterCallback,
//   ) => {
//     if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
//       cb(null, false);
//       return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
//     }
//     cb(null, true);
//   },
// };
