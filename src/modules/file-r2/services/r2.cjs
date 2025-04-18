// @ts-check

const { createReadStream } = require("fs");
const { parse } = require("path");
const { Readable, PassThrough } = require("stream");

const {
    DeleteObjectCommand,
    GetObjectCommand,
    ObjectCannedACL,
    PutObjectCommand,
    S3Client,
} = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { AbstractFileService } = require("@medusajs/medusa");

/**
 * @typedef {Object} R2StorageServiceOptions
 * @property {string} bucket - The bucket name.
 * @property {string} endpoint - The endpoint URL.
 * @property {string} access_key - The access key.
 * @property {string} secret_key - The secret key.
 * @property {string} public_url - The public URL.
 * @property {string} [cache_control="max-age=31536000"] - Cache-Control header value.
 * @property {number} [presigned_url_expires=3600] - Expiration time in seconds for presigned URLs.
 */

/**
 * Service for handling file storage on R2.
 * Based on https://github.com/Agilo/medusa-file-r2
 * @class
 * @extends AbstractFileService
 */
class R2StorageService extends AbstractFileService {
    /**
     * Constructs the R2StorageService.
     *
     * @param {Object} container - The container object.
     * @param {R2StorageServiceOptions} options - Options for the service.
     * @throws {Error} When a required option is missing.
     */
    constructor(container, options) {
        super(container, options);

        if (typeof options.bucket !== "string" || !options.bucket) {
            throw new Error("R2StorageService requires a bucket");
        }

        if (typeof options.endpoint !== "string" || !options.endpoint) {
            throw new Error("R2StorageService requires an endpoint");
        }

        if (typeof options.access_key !== "string" || !options.access_key) {
            throw new Error("R2StorageService requires an access_key");
        }

        if (typeof options.secret_key !== "string" || !options.secret_key) {
            throw new Error("R2StorageService requires a secret_key");
        }

        if (typeof options.public_url !== "string" || !options.public_url) {
            throw new Error("R2StorageService requires a public_url");
        }

        this.bucket = options.bucket;
        this.endpoint = options.endpoint;
        this.access_key = options.access_key;
        this.secret_key = options.secret_key;
        this.public_url = options.public_url;
        this.cache_control = typeof options.cache_control === "string" ? options.cache_control : "max-age=31536000";
        this.presigned_url_expires =
            typeof options.presigned_url_expires === "number" ? options.presigned_url_expires : 60 * 60;
    }

    /**
     * Creates and returns an S3 client instance.
     *
     * @returns {S3Client} An instance of the S3Client.
     */
    storageClient() {
        return new S3Client({
            region: "auto",
            endpoint: this.endpoint,
            credentials: {
                accessKeyId: this.access_key,
                secretAccessKey: this.secret_key,
            },
        });
    }

    /**
     * Uploads a file to the R2 storage.
     *
     * @private
     * @param {Express.Multer.File} fileData - The file data.
     * @param {boolean} [isPrivate] - Flag to upload as private.
     * @returns {Promise<{ key: string, url: string }>} The result containing file key and URL.
     * @throws {Error} If file upload fails.
     */
    async uploadFile(fileData, isPrivate) {
        const client = this.storageClient();

        const parsedFilename = parse(fileData.originalname);
        const timestamp = Date.now();
        const fileKey = `${parsedFilename.name}-${timestamp}${parsedFilename.ext}`;
        const encodedFileKey = `${encodeURIComponent(parsedFilename.name)}-${timestamp}${parsedFilename.ext}`;

        const params = {
            Bucket: this.bucket,
            Key: fileKey,
            Body: createReadStream(fileData.path),
            ContentType: fileData.mimetype,
            ACL: isPrivate ? ObjectCannedACL.private : ObjectCannedACL.public_read,
        };

        try {
            await client.send(new PutObjectCommand(params));
            return {
                url: `${this.public_url}/${encodedFileKey}`,
                key: fileKey,
            };
        } catch (err) {
            console.error(err);
            throw new Error("An error occurred while uploading the file.");
        }
    }

    /** @type {AbstractFileService["upload"]} */
    async upload(fileData) {
        return this.uploadFile(fileData, false);
    }

    /** @type {AbstractFileService["uploadProtected"]} */
    async uploadProtected(fileData) {
        return this.uploadFile(fileData, true);
    }

    /** @type {AbstractFileService["delete"]} */
    async delete(fileData) {
        const client = this.storageClient();
        const params = { Bucket: this.bucket, Key: fileData.fileKey };

        try {
            await client.send(new DeleteObjectCommand(params));
        } catch (err) {
            console.error(err);
            throw new Error("An error occurred while deleting the file.");
        }
    }

    /** @type {AbstractFileService["getDownloadStream"]} */
    async getDownloadStream(fileData) {
        const client = this.storageClient();
        const params = { Bucket: this.bucket, Key: fileData.fileKey };

        try {
            const { Body } = await client.send(new GetObjectCommand(params));
            if (!(Body instanceof Readable)) {
                throw new Error("Invalid stream returned from S3");
            }
            return Body;
        } catch (err) {
            console.error(err);
            throw new Error("An error occurred while downloading the file.");
        }
    }

    /** @type {AbstractFileService["getPresignedDownloadUrl"]} */
    async getPresignedDownloadUrl(fileData) {
        const client = this.storageClient();
        const params = {
            Bucket: this.bucket,
            Key: fileData.fileKey,
        };

        try {
            return await getSignedUrl(client, new GetObjectCommand(params), {
                expiresIn: this.presigned_url_expires,
            });
        } catch (err) {
            console.error(err);
            throw new Error("An error occurred while generating the presigned URL.");
        }
    }

    /** @type {AbstractFileService["getUploadStreamDescriptor"]} */
    async getUploadStreamDescriptor(fileData) {
        const client = this.storageClient();
        const pass = new PassThrough();
        const fileKey = `${fileData.name}.${fileData.ext}`;
        const isPrivate = fileData.isPrivate ?? true;

        const upload = new Upload({
            client,
            params: {
                Bucket: this.bucket,
                Key: fileKey,
                Body: pass,
                ContentType:
                    typeof fileData.contentType === "string" ? fileData.contentType : "application/octet-stream",
                ACL: isPrivate ? "private" : "public-read",
            },
        });

        return {
            fileKey,
            writeStream: pass,
            promise: upload.done(),
            url: `${this.public_url}/${fileKey}`,
        };
    }
}

module.exports = R2StorageService;
