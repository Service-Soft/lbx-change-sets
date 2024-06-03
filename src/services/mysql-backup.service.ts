import { exec } from 'child_process';
import { rm, writeFile } from 'fs/promises';
import { Stream } from 'stream';

import { inject } from '@loopback/core';
import { IsolationLevel, juggler } from '@loopback/repository';

import { LbxChangeSetsBindings } from '../keys';

/**
 * The different types file data might have.
 */
export type FileData = string
    | NodeJS.ArrayBufferView
    | Iterable<string | NodeJS.ArrayBufferView>
    | AsyncIterable<string | NodeJS.ArrayBufferView>
    | Stream;

/**
 * A backup service that uses the mysqldump utility to create and restore backups.
 */
export abstract class MySqlBackupService {

    /**
     * The root database password. Is needed to backup everything, including system and user tables.
     */
    protected abstract readonly rootPw: string;

    /**
     * The host of the database.
     * @default '127.0.0.1'
     */
    protected readonly host: string = '127.0.0.1';

    /**
     * The name of the temporary backup file. Is saved in the root directory of the project.
     * @default 'backup.temp.sql'
     */
    protected readonly backupTempName: string = 'backup.temp.sql';

    /**
     * The name of the temporary restore backup file. Is saved in the root directory of the project.
     * @default 'restore-backup.temp.sql'
     */
    protected readonly restoreBackupTempName: string = 'restore-backup.temp.sql';

    constructor(
        @inject(LbxChangeSetsBindings.DATASOURCE_KEY)
        private readonly dataSource: juggler.DataSource
    ) {}

    /**
     * Creates a backup.
     */
    async createBackup(): Promise<void> {
        const transaction: juggler.Transaction = await this.dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);
        try {
            await this.createDump();
            await this.saveBackup();
            await this.removeTempBackup();
            await transaction.commit();
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Restores the backup from the given data.
     * @param data - THe mysql dump file data to restore from.
     */
    async restoreBackup(data: FileData): Promise<void> {
        await this.loadBackup(data);
        await this.restoreMySqlData();
        await this.removeTempRestoreBackup();
    }

    /**
     * Creates a mysql dump and saves it under this.backupTempName.
     */
    protected async createDump(): Promise<void> {
        await this.execAsync(
            `mysqldump --all-databases -h ${this.dataSource.settings['host']} -u root -p${this.rootPw} > ${this.backupTempName}`,
            'Could not create a mysql dump'
        );
    }

    /**
     * Method that handles saving the temporary dump file under this.backupTempName before it gets deleted.
     */
    protected abstract saveBackup(): Promise<void>;

    /**
     * Deletes the temporary backup file.
     */
    protected async removeTempBackup(): Promise<void> {
        await rm(this.backupTempName);
    }

    /**
     * Deletes the temporary restore backup file.
     */
    protected async removeTempRestoreBackup(): Promise<void> {
        await rm(this.restoreBackupTempName);
    }

    /**
     * Restores the mysql data from the file under this.restoreBackupTempName.
     */
    async restoreMySqlData(): Promise<void> {
        await this.execAsync(
            `mysql -h ${this.dataSource.settings['host']} -u root -p${this.rootPw} < ${this.restoreBackupTempName}`,
            'Could not restore the sql dump'
        );
    }

    /**
     * Loads the backup file for the given data into this.restoreBackupTempName.
     * @param data - The mysql dump file data.
     */
    protected async loadBackup(data: FileData): Promise<void> {
        await writeFile(this.restoreBackupTempName, data);
    }

    /**
     * Runs the exec method from the child_process package as async.
     * @param command - The command to execute.
     * @param errorMessage - The error message to display if the command fails.
     */
    protected async execAsync(command: string, errorMessage: string = 'Error executing the command'): Promise<void> {
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line promise/prefer-await-to-callbacks
            exec(command, (error) => {
                if (error) {
                    reject(errorMessage);
                    return;
                }
                resolve();
            });
        });
    }
}