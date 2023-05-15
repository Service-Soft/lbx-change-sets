/* eslint-disable jsdoc/require-jsdoc */
import { model, property } from '@loopback/repository';
import { ChangeSetEntity } from 'lbx-change-sets';

@model()
export class TestChangeSetEntity extends ChangeSetEntity {

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

export interface TestRelations {
    // describe navigational properties here
}

export type TestWithRelations = TestChangeSetEntity & TestRelations;