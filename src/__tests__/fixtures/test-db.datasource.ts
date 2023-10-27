import { juggler } from '@loopback/repository';

/**
 * An in memory database used for testing.
 */
export const testDb: juggler.DataSource = new juggler.DataSource({
    name: 'db',
    connector: 'memory'
});