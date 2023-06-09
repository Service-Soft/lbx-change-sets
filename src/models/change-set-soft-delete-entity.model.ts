import { model, property } from '@loopback/repository';
import { ChangeSetEntity } from './change-set-entity.model';

/**
 * An entity that can be handled by the CrudChangeSetSoftDeleteRepository.
 * Has an uuid id, a relation to all its changeSets and a flag that determines whether it is "soft deleted" or not.
 */
@model()
export class ChangeSetSoftDeleteEntity extends ChangeSetEntity {
    /**
     * Whether or not the entity is softly deleted.
     */
    @property({
        type: 'boolean',
        default: false
    })
    deleted: boolean;

    constructor(data?: Partial<ChangeSetSoftDeleteEntity>) {
        super(data);
    }
}