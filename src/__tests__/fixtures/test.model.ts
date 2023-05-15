/* eslint-disable jsdoc/require-jsdoc */
import { model, property } from '@loopback/repository';
import { ChangeSetSoftDeleteEntity } from '../../models/change-set-soft-delete-entity.model';

@model()
export class TestChangeSetEntity extends ChangeSetSoftDeleteEntity {

    @property({
        type: 'string',
        required: true
    })
    firstName: string;

    @property({
        type: 'string',
        required: true
    })
    lastName: string;

    constructor(data?: Partial<TestChangeSetEntity>) {
        super(data);
    }
}

export interface TestChangeSetEntityRelations {
    // describe navigational properties here
}

export type TestChangeSetEntityWithRelations = TestChangeSetEntity & TestChangeSetEntityRelations;