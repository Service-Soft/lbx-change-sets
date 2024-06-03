import { BindingScope, bind } from '@loopback/core';
import { HttpErrors } from '@loopback/rest';
import { MySqlBackupService } from 'lbx-change-sets';

@bind({ scope: BindingScope.TRANSIENT })
export class BackupService extends MySqlBackupService {
    protected override readonly rootPw: string = 'C2bcAJ2woT8UMewungW7qeFpjxwG3qTfB2GudQmv';

    protected override async saveBackup(): Promise<void> {
        await this.execAsync(`cp ${this.backupTempName} backup-${this.formatDate(new Date())}.sql`);
    }

    async restoreBackupFromDate(date: Date): Promise<void> {
        this.loadBackupForDate(date)
        await this.restoreMySqlData();
        await this.removeTempRestoreBackup();
    }

    protected async loadBackupForDate(date: Date): Promise<void> {
        try {
            await this.execAsync(`cp backup-${this.formatDate(date)}.sql ${this.restoreBackupTempName}`);
        }
        catch (error) {
            throw new HttpErrors.BadRequest(`Could not find a backup for the date ${this.formatDate(date)}`)
        }
    }

    private formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('de', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
}