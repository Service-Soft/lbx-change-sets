import { Entity, belongsTo, model, property } from '@loopback/repository';
import { ChangeSet } from './change-set.model';

/**
 * Defines a single value change of an change set.
 */
@model()
export class Change<T = unknown> extends Entity {
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
     * The key of the value that has been changed.
     */
    @property({
        type: 'string',
        required: true
    })
    key: string;
    /**
     * The value before it was changed.
     */
    @property({
        type: 'any',
        required: false
    })
    previousValue?: T;
    /**
     * The value after it was changed.
     */
    @property({
        type: 'any',
        required: false
    })
    newValue?: T;
    /**
     * The id of the change set that this change belongs to.
     */
    @belongsTo(() => ChangeSet)
    changeSetId: string;

    constructor(data?: Partial<Change<T>>) {
        super(data);
    }
}

// eslint-disable-next-line jsdoc/require-jsdoc
export interface ChangeRelations {

}

// eslint-disable-next-line jsdoc/require-jsdoc
export type ChangeWithRelations = Change & ChangeRelations;