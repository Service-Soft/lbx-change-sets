import { inject } from '@loopback/core';
import { IsolationLevel, juggler } from '@loopback/repository';
import { File } from 'buffer';
import { exec } from 'child_process';
import { rm, writeFile } from 'fs/promises';
import { LbxChangeSetsBindings } from '../keys';

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
     * Restores the backup from the given date.
     * @param dump - THe mysql dump file to restore from.
     */
    async restoreBackup(dump: File): Promise<void> {
        await this.loadBackup(dump);
        await this.restoreMySqlData();
        await this.removeTempRestoreBackup();
    }

    /**
     * Creates a mysql dump and saves it under this.backupTempName.
     */
    protected async createDump(): Promise<void> {
        await this.execAsync(`mysqldump --all-databases -h ${this.dataSource.settings['host']} -u root -p${this.rootPw} > ${this.backupTempName}`, 'Could not create a mysql dump');
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
        await this.execAsync(`mysql -h ${this.dataSource.settings['host']} -u root -p${this.rootPw} < ${this.restoreBackupTempName}`, 'Could not restore the sql dump');
    }

    /**
     * Loads the backup file for the given date into this.restoreBackupTempName.
     * @param dump - The mysql dump file.
     */
    protected async loadBackup(dump: File): Promise<void> {
        await writeFile(this.restoreBackupTempName, dump.stream());
    }

    /**
     * Runs the exec method from the child_process package as async.
     * @param command - The command to execute.
     * @param errorMessage - The error message to display if the command fails.
     */
    protected async execAsync(command: string, errorMessage: string = 'Error executing the command'): Promise<void> {
        return new Promise((resolve, reject) => {
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