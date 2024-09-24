const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require('dotenv').config();

const accessKeyId = process.env.accessKeyId;
const secretAccessKey = process.env.secretAccessKey;

const s3 = new S3Client({
  region: "eu-north-1",
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = "uploads/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      `${req.user.userId}_${Date.now()}_${path.basename(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

const uploadToS3 = async (filePath, fileName) => {
  const fileStream = fs.createReadStream(filePath);

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: "andningsapoteket",
      Key: fileName,
      Body: fileStream,
      ACL: "public-read",
    },
    leavePartsOnError: false,
  });

  return upload.done();
};

module.exports = { upload, uploadToS3 };
