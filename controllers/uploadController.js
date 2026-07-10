const multer = require('multer');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');

// Configure S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Multer storage in memory
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

exports.uploadMiddleware = upload.single('file');

exports.uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const isImage = req.file.mimetype.startsWith('image/');
        let fileBuffer = req.file.buffer;
        let contentType = req.file.mimetype;
        
        // Image highly compressed for S3 storage optimization
        if (isImage) {
            fileBuffer = await sharp(req.file.buffer)
                .resize({ width: 1000, withoutEnlargement: true }) // Reduced from 1200 to 1000
                .webp({ quality: 60, effort: 6 }) // Heavily optimized WebP (60% quality, max effort)
                .toBuffer();
            contentType = 'image/webp';
        }

        // Generate unique filename
        const randomName = crypto.randomBytes(16).toString('hex');
        const extension = isImage ? '.webp' : path.extname(req.file.originalname);
        const fileName = `${randomName}${extension}`;

        // Upload to S3
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
            Body: fileBuffer,
            ContentType: contentType
            // ACL is not set because public-read might be disabled by default. 
            // Better to rely on bucket policy or manual access control.
        };

        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        // Construct public URL
        const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            url: fileUrl
        });

    } catch (error) {
        console.error("S3 Upload Error:", error);
        next(error);
    }
};
