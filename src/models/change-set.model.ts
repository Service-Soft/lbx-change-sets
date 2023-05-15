import { Entity, hasMany, model, property } from '@loopback/repository';
import { ChangeSetType } from './change-set-type.enum';
import { Change } from './change.model';

/**
 * A single change set.
 * Gets automatically created for configured entities whenever they are changed.
 */
@model()
export class ChangeSet extends Entity {
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
     * Whether this change set was initialized on creating, updating or deleting the entity.
     */
    @property({
        required: true,
        type: 'string',
        jsonSchema: {
            items: {
                enum: Object.values(ChangeSetType)
            }
        }
    })
    type: ChangeSetType;
    /**
     * The time at which the change happened.
     */
    @property({
        required: true,
        type: 'date'
    })
    createdAt: Date;
    /**
     * The id of the user that changed something.
     * Is set by using loopback's securityId feature.
     */
    @property({
        required: false,
        type: 'string'
    })
    createdBy?: string;
    /**
     * The things that have been changed.
     */
    @hasMany(() => Change)
    changes: Change[];
    /**
     * The id of the related entity that this change set belongs to.
     */
    @property({
        required: true,
        type: 'string'
    })
    changeSetEntityId: string;

    constructor(data?: Partial<ChangeSet>) {
        super(data);
    }
}

// eslint-disable-next-line jsdoc/require-jsdoc
export interface ChangeSetRelations {
}

// eslint-disable-next-line jsdoc/require-jsdoc
export type ChangeSetWithRelations = ChangeSet & ChangeSetRelations;