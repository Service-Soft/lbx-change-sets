import { Entity, hasMany, model, property } from '@loopback/repository';
import { ChangeSet } from './change-set.model';

/**
 * An entity that can be handled by the CrudChangeSetRepository.
 * Has an uuid id and a relation to all its changeSets.
 */
@model()
export class ChangeSetEntity extends Entity {
    /**
     * The id of the changeset.
     * Uses uuidv4 to generate.
     */
    @property({
        type: 'string',
        id: true,
        defaultFn: 'uuidv4'
    })
    id: string;
    /**
     * All change sets.
     */
    @hasMany(() => ChangeSet)
    changeSets: ChangeSet[];

    constructor(data?: Partial<ChangeSetEntity>) {
        super(data);
    }
}