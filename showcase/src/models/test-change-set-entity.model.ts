/* eslint-disable jsdoc/require-jsdoc */
import { Model, model, property } from '@loopback/repository';
import { getJsonSchema } from '@loopback/rest';
import { ChangeSetEntity } from 'lbx-change-sets';

@model()
export class Address extends Model {
    @property({
        type: 'string',
        required: true
    })
    street: string;

    @property({
        type: 'string',
        required: true
    })
    number: string;

    @property({
        type: 'string',
        required: true
    })
    postcode: string;

    @property({
        type: 'string',
        required: true
    })
    city: string;
}

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

    @property({
        type: 'date',
        required: false
    })
    birthDay: Date;

    @property({
        type: 'object',
        jsonSchema: getJsonSchema(Address),
        required: true
    })
    address: Address;

    @property({
        type: 'array',
        itemType: 'string'
    })
    listItems: string[];

    constructor(data?: Partial<TestChangeSetEntity>) {
        super(data);
    }
}

export interface TestRelations {
    // describe navigational properties here
}

export type TestWithRelations = TestChangeSetEntity & TestRelations;