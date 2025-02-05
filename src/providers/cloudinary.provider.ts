import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiOptions } from 'cloudinary';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class CloudinaryProvider {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  private getPublicIds(filePaths: string[]): string[] {
    const publicIds = filePaths.map((url) => {
      const parts = url.split('/');
      const fileWithExtension = parts[parts.length - 1];
      const publicId = fileWithExtension.split('.')[0];
      return publicId;
    });

    return publicIds;
  }

  async uploadImageToCloud(filePath: string) {
    try {
      const options: UploadApiOptions = {
        resource_type: 'image',
        use_filename: true,
        unique_filename: false,
        overwrite: true,
        invalidate: true,
        allowed_formats: ['jpg', 'png', 'jpeg'],
        transformation: { width: 840, height: 630 },
      };
      return await cloudinary.uploader.upload(filePath, options);
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  }

  async deleteSingleImageFromCloud(filePath: string) {
    try {
      const parts = filePath.split('/');
      const fileWithExtension = parts[parts.length - 1];
      const publicId = fileWithExtension.split('.')[0];

      const options: UploadApiOptions = {
        invalidate: true,
      };
      return await cloudinary.uploader.destroy(publicId, options);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error('Failed to delete image');
    }
  }
}
