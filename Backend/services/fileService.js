import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import streamifier from 'streamifier';
import { v4 as uuidv4 } from 'uuid';

class FileService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'text/plain',
          'application/zip',
          'application/x-zip-compressed'
        ];

        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type'), false);
        }
      }
    });
  }

  async uploadBuffer(buffer, options = {}) {
    const {
      folder = '',
      publicId,
      isPublic = false,
      resourceType = 'auto'
    } = options;

    const uploadOptions = {
      folder,
      public_id: publicId,
      resource_type: resourceType,
      type: isPublic ? 'upload' : 'authenticated',
      overwrite: true
    };

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      });

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  async uploadFile(file, options = {}) {
    try {
      const { folder = '', isPublic = false } = options;
      const normalizedFolder = folder.replace(/\\/g, '/').replace(/\/$/, '');
      const publicId = normalizedFolder
        ? `${normalizedFolder}/${uuidv4()}-${file.originalname}`
        : `${uuidv4()}-${file.originalname}`;

      const result = await this.uploadBuffer(file.buffer, {
        folder: normalizedFolder,
        publicId,
        isPublic
      });

      return {
        success: true,
        key: result.public_id,
        url: result.secure_url,
        folder: result.folder,
        resourceType: result.resource_type
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async getSignedUrl(key, options = {}) {
    try {
      const { expires = 3600, isPrivate = false } = options;

      if (!key) {
        throw new Error('Public ID is required');
      }

      if (!isPrivate) {
        return cloudinary.url(key, {
          resource_type: 'auto',
          secure: true
        });
      }

      return cloudinary.utils.private_download_url(key, {
        resource_type: 'auto',
        type: 'authenticated',
        expire_seconds: expires
      });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  async deleteFile(key) {
    try {
      const result = await cloudinary.uploader.destroy(key, {
        resource_type: 'auto',
        invalidate: true
      });

      return { success: result.result === 'ok' || result.result === 'not found' };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async getFileMetadata(key) {
    try {
      const metadata = await cloudinary.api.resource(key, {
        resource_type: 'auto'
      });

      return {
        key,
        size: metadata.bytes,
        lastModified: metadata.created_at,
        contentType: metadata.format,
        etag: metadata.etag,
        metadata: metadata.context?.custom || {}
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  async listFiles(prefix = '', options = {}) {
    try {
      const { maxKeys = 1000, continuationToken } = options;
      const normalizedPrefix = prefix.replace(/\\/g, '/').replace(/\/$/, '');
      const expression = normalizedPrefix ? `folder:${normalizedPrefix}` : 'resource_type=auto';

      const search = cloudinary.search
        .expression(expression)
        .sort_by('public_id', 'desc')
        .max_results(maxKeys);

      if (continuationToken) {
        search.next_cursor(continuationToken);
      }

      const result = await search.execute();

      return {
        files: result.resources?.map(obj => ({
          key: obj.public_id,
          size: obj.bytes,
          lastModified: obj.created_at,
          etag: obj.etag,
          resourceType: obj.resource_type,
          url: obj.secure_url
        })) || [],
        isTruncated: Boolean(result.next_cursor),
        continuationToken: result.next_cursor
      };
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  async copyFile(sourceKey, destinationKey) {
    try {
      const result = await cloudinary.uploader.rename(sourceKey, destinationKey, {
        resource_type: 'auto',
        overwrite: true
      });

      return {
        success: true,
        key: result.public_id
      };
    } catch (error) {
      console.error('Error copying file:', error);
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }

  async uploadAvatar(file, userId) {
    try {
      const normalizedFileName = `${uuidv4()}-${file.originalname}`;
      const publicId = `avatars/${userId}/${normalizedFileName}`;

      const result = await this.uploadBuffer(file.buffer, {
        folder: `avatars/${userId}`,
        publicId,
        isPublic: true,
        resourceType: 'auto'
      });

      return {
        success: true,
        key: result.public_id,
        url: result.secure_url
      };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw new Error(`Failed to upload avatar: ${error.message}`);
    }
  }

  async uploadRepoFile(file, repoId, filePath) {
    try {
      const normalizedPath = filePath.replace(/^\/+/, '').replace(/\\/g, '/');
      const publicId = `repos/${repoId}/${normalizedPath}`;

      const result = await this.uploadBuffer(file.buffer, {
        folder: `repos/${repoId}`,
        publicId,
        isPublic: false,
        resourceType: 'auto'
      });

      return {
        success: true,
        key: result.public_id,
        url: result.secure_url,
        size: file.size
      };
    } catch (error) {
      console.error('Error uploading repo file:', error);
      throw new Error(`Failed to upload repo file: ${error.message}`);
    }
  }

  getUploadMiddleware(fieldName = 'file', options = {}) {
    const { maxCount = 1, isPublic = false } = options;

    return (req, res, next) => {
      const uploadHandler = maxCount === 1
        ? this.upload.single(fieldName)
        : this.upload.array(fieldName, maxCount);

      uploadHandler(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({ message: 'File too large' });
            }
          }
          return res.status(400).json({ message: err.message });
        }

        if (req.file) {
          req.file.isPublic = isPublic;
        } else if (req.files) {
          req.files.forEach(file => {
            file.isPublic = isPublic;
          });
        }

        next();
      });
    };
  }
}

export default new FileService();