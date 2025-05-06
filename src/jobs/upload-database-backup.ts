import { Logger, ScheduledJobArgs, ScheduledJobConfig } from "@medusajs/medusa";
import R2StorageService from "../modules/file-r2/services/r2.cjs";

import fs from "fs";

const BACKUP_CONFIG = {
    N_BACKUPS: 14,
    BACKUP_DIR: "backups",
} as const;

export default async function uploadDatabaseBackup({ container }: ScheduledJobArgs) {
    // using another bucket since the main one is public
    // and we don't want to expose the backups
    const privateBucket = new R2StorageService(container, {
        bucket: process.env.R2_BACKUP_BUCKET_NAME,
        endpoint: process.env.R2_BUCKET_ENDPOINT,
        access_key: process.env.R2_BUCKET_ACCESS_KEY,
        secret_key: process.env.R2_BUCKET_SECRET_KEY,
        public_url: "this bucket is private",
    });

    const logger = container.resolve<Logger>("logger");

    const localFiles = await fs.promises.readdir(BACKUP_CONFIG.BACKUP_DIR);
    const remoteFiles = (await privateBucket.list("")).map((file) => file.key);

    const allFiles = Array.from(new Set([...remoteFiles, ...localFiles])).sort();

    const toUpload = allFiles
        .slice(-BACKUP_CONFIG.N_BACKUPS)
        .filter((file) => localFiles.includes(file) && !remoteFiles.includes(file));

    const toDelete = allFiles.slice(0, -BACKUP_CONFIG.N_BACKUPS).filter((file) => remoteFiles.includes(file));

    const remoteDeletes = toDelete.map((file) =>
        privateBucket.delete({ fileKey: file }).catch((err) => {
            logger.error("Error deleting remote backup file:", err);
        }),
    );

    const remoteUploads = toUpload.map(async (file) => {
        const writeStreamDescriptor = await privateBucket.getUploadStreamDescriptor({
            name: file.slice(0, -4),
            ext: ".age",
            isPrivate: true,
        });
        const readStream = fs.createReadStream(BACKUP_CONFIG.BACKUP_DIR + "/" + file);
        const write = readStream.pipe(writeStreamDescriptor.writeStream);
        write.on("error", (err) => {
            logger.error("Error uploading backup file:", err);
        });
        await writeStreamDescriptor.promise;
    });

    const localDeletes = toDelete.map((file) => {
        fs.promises.rm(BACKUP_CONFIG.BACKUP_DIR + "/" + file).catch((err) => {
            logger.error("Error deleting local backup file:", err);
        });
    });

    await Promise.all([...remoteDeletes, ...remoteUploads, ...localDeletes]);
}

export const config: ScheduledJobConfig = {
    name: "upload-database-backup",
    schedule: "5 3 * * *", // every day at 3:05 AM
};
