import multer from 'multer'
import cloudinary from '../config/cloudinary.mjs'

import { Readable } from 'node:stream'

const storage = multer.memoryStorage()

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']

  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are accepted.'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
})

// Helper for controllers to upload a buffered file to Cloudinary.
export const uploadToCloudinary = file =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'hcm-lite', resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error)
        resolve(result)
      }
    )

    Readable.from(file.buffer).pipe(stream)
  })


export default upload
