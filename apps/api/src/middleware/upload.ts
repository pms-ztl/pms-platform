import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import sharp from 'sharp';

// Ensure upload directories exist
const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File filter - only accept images
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
};

// Avatar upload middleware - stores in memory for sharp processing
export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('avatar');

/**
 * Avatar sizes for different use cases:
 *  - sm (64x64): Header nav, small badges, chat avatars
 *  - md (160x160): Profile page, employee cards
 *  - lg (320x320): Full profile view, employee card download
 *  - original: Full resolution (max 800x800, compressed)
 */
export const AVATAR_SIZES = {
  sm: 64,
  md: 160,
  lg: 320,
  original: 800,
} as const;

/**
 * Process an uploaded avatar buffer into multiple optimized sizes.
 * Returns the base filename (without size suffix) used for all variants.
 *
 * Generated files:
 *  - {uuid}-sm.webp  (64x64)
 *  - {uuid}-md.webp  (160x160)
 *  - {uuid}-lg.webp  (320x320)
 *  - {uuid}.webp     (max 800x800, original aspect ratio)
 */
export async function processAvatarUpload(
  buffer: Buffer,
  originalFilename: string
): Promise<{ baseFilename: string; files: Record<string, string> }> {
  const baseId = uuidv4();
  const files: Record<string, string> = {};

  // Process each size variant
  for (const [sizeName, dimension] of Object.entries(AVATAR_SIZES)) {
    const suffix = sizeName === 'original' ? '' : `-${sizeName}`;
    const filename = `${baseId}${suffix}.webp`;
    const outputPath = path.join(uploadDir, filename);

    if (sizeName === 'original') {
      // Original: resize to max dimension, preserve aspect ratio
      await sharp(buffer)
        .resize(dimension, dimension, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toFile(outputPath);
    } else {
      // Thumbnails: crop to exact square, center focus
      await sharp(buffer)
        .resize(dimension, dimension, {
          fit: 'cover',
          position: 'centre',
        })
        .webp({ quality: 80 })
        .toFile(outputPath);
    }

    files[sizeName] = filename;
  }

  return { baseFilename: baseId, files };
}

// Generic file upload for other purposes
export const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
