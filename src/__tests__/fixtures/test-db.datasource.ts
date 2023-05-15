import { juggler } from '@loopback/repository';

export const testDb: juggler.DataSource = new juggler.DataSource({
    name: 'db',
    connector: 'memory'
});