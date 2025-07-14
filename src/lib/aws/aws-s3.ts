import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const region = process.env.CLOUD_REGION;
const accessKeyId = process.env.CLOUD_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUD_SECRET_ACCESS_KEY;

if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloud environment variables (CLOUD_REGION, CLOUD_ACCESS_KEY_ID, CLOUD_SECRET_ACCESS_KEY) must be set.");
}

const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

export const uploadToS3 = async (filePath: string, bucketName: string, key: string) => {
    const fileStream = fs.createReadStream(filePath);
    const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
    };
    await s3Client.send(new PutObjectCommand(uploadParams));
};

export const listS3Objects = async (bucketName: string, prefix: string) => {
    const params = {
        Bucket: bucketName,
        Prefix: prefix,
    };
    const { Contents } = await s3Client.send(new ListObjectsV2Command(params));
    return Contents;
};

export const downloadFromS3 = async (bucketName: string, key: string, downloadPath: string) => {
    const params = {
        Bucket: bucketName,
        Key: key,
    };
    const { Body } = await s3Client.send(new GetObjectCommand(params));
    if (Body instanceof Readable) {
        const fileStream = fs.createWriteStream(downloadPath);
        await pipeline(Body, fileStream);
    }
};