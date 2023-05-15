/* eslint-disable no-console */
import { ShowcaseApplication } from './application';

// eslint-disable-next-line jsdoc/require-jsdoc
export async function migrate(args: string[]): Promise<void> {
    const existingSchema: 'drop' | 'alter' = args.includes('--rebuild') ? 'drop' : 'alter';
    console.log('Migrating schemas (%s existing schema)', existingSchema);

    const app: ShowcaseApplication = new ShowcaseApplication();
    await app.boot();
    await app.migrateSchema({ existingSchema });

    // Connectors usually keep a pool of opened connections,
    // this keeps the process running even after all work is done.
    // We need to exit explicitly.
    process.exit(0);
}

migrate(process.argv).catch(err => {
    console.error('Cannot migrate database schema', err);
    process.exit(1);
});