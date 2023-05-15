/* eslint-disable no-console */
import { Getter, inject } from '@loopback/core';
import { AnyObject, Count, DataObject, Where, juggler, repository } from '@loopback/repository';
import { SecurityBindings, UserProfile } from '@loopback/security';
import { LbxChangeSetsBindings } from '../keys';
import { ChangeSetType } from '../models';
import { ChangeSetSoftDeleteEntity } from '../models/change-set-soft-delete-entity.model';
import { ChangeSetRepository } from './change-set.repository';
import { ChangeRepository } from './change.repository';
import { CrudChangeSetRepository } from './crud-change-set.repository';

// TODO: Softly delete relations

/**
 * A base crud repository that automatically handles creation of change sets and offers the option to "soft" delete entities
 * (Meaning they are flagged as deleted but still kept for restoration).
 */
export class CrudChangeSetSoftDeleteRepository<T extends ChangeSetSoftDeleteEntity, ID, Relations extends object = {}>
    extends CrudChangeSetRepository<T, ID, Relations> {

    protected override readonly keysToExcludeFromChangeSets: (keyof T)[] = ['changeSets', 'deleted'];

    constructor(
        entityClass: typeof ChangeSetSoftDeleteEntity & { prototype: T },
        @inject(LbxChangeSetsBindings.DATASOURCE_KEY)
        dataSource: juggler.DataSource,
        @repository.getter('ChangeSetRepository')
        protected changeSetRepositoryGetter: Getter<ChangeSetRepository>,
        @repository(ChangeRepository)
        protected changeRepository: ChangeRepository,
        @repository(ChangeSetRepository)
        protected changeSetRepository: ChangeSetRepository,
        @inject.getter(SecurityBindings.USER)
        readonly getUserProfile: Getter<UserProfile>
    ) {
        super(entityClass, dataSource, changeSetRepositoryGetter, changeRepository, changeSetRepository, getUserProfile);
    }

    /**
     * DOES NOT TAKE DELETED ENTITIES INTO CONSIDERATION.
     *
     * Updating matching records with attributes from the data object.
     *
     * @param data - The data to update the entities with.
     * @param where - A filter to only update some entities.
     * @param options - Additional options, eg. Transaction.
     * @returns The amount of updated entities.
     */
    override async updateAll(data: DataObject<T>, where?: Where<T>, options?: AnyObject): Promise<Count> {
        // where = where ? { ...where, deleted: false } : { deleted: false } as Where<T>; //TODO why is this conversion necessary?
        return super.updateAll(data, where, options);
    }

    /**
     * DOES NOT TAKE DELETED ENTITIES INTO CONSIDERATION.
     *
     * Rolls back all changes on the entities found with the given where filter to the state of the given date.
     *
     * This DOES NOT preserve any changes that happened after the date.
     * Any change sets after the given date will be deleted in the end.
     *
     * @param date - The date to which the rollback should happen.
     * @param where - A filter to only rollback some entities.
     * @param createChangeSet - Whether or not a change set should be created.
     * @param preserveCreateChangeSet - Whether or not create change sets should be preserved.
     * In that case the entity gets reset to the state after the create change set. Also, the create change set isn't deleted.
     * @param options - Additional options, eg. Transaction.
     * @returns The updated entity.
     */
    override async rollbackAllToDate(
        date: Date,
        where?: Where<T>,
        createChangeSet: boolean = true,
        preserveCreateChangeSet: boolean = true,
        options?: AnyObject
    ): Promise<Count> {
        where = where ? { ...where, deleted: false } : { deleted: false } as Where<T>; //TODO why is this conversion necessary?
        return super.rollbackAllToDate(date, where, createChangeSet, preserveCreateChangeSet, options);
    }

    // eslint-disable-next-line jsdoc/require-returns
    /**
     * Softly deletes the given entity and creates a change set.
     * This simply sets the deleted flag to true.
     *
     * @param entity - The entity that should be softly deleted.
     * @param options - Additional options, eg. Transaction.
     */
    async softDelete(entity: T, options?: AnyObject): Promise<void> {
        if (entity.deleted) {
            console.warn('The entity is already flagged as deleted. Returning.');
            return;
        }
        await this.createChangeSet(entity, { deleted: true }, ChangeSetType.DELETE, options, true);
        // Because entity.deleted is inside the "keysToExcludeFromChangeSets" we don't need to worry about a change set being created twice.
        return this.updateById(entity.id as ID, { deleted: true }, options);
    }

    // eslint-disable-next-line jsdoc/require-returns
    /**
     * Softly deletes the entity with the given id and creates a change set.
     * This simply sets the deleted flag to true.
     *
     * @param id - The entity that should be softly deleted.
     * @param options - Additional options, eg. Transaction.
     */
    async softDeleteById(id: ID, options?: AnyObject): Promise<void> {
        const entity: T = await this.findById(id, options);
        return this.softDelete(entity, options);
    }

    /**
     * Softly deletes all entities found for the given filter that are not already deleted.
     *
     * @param where - A where filter.
     * @param options - Additional options, eg. Transaction.
     * @returns The amount of softly deleted entities.
     */
    async softDeleteAll(where?: Where<T>, options?: AnyObject): Promise<Count> {
        where = where ? { ...where, deleted: false } : { deleted: false } as Where<T>; //TODO why is this conversion necessary?
        const entitiesToDelete: T[] = await this.find({ where: where }, options);
        await Promise.all(entitiesToDelete.map(e => this.softDelete(e, options)));
        return { count: entitiesToDelete.length };
    }

    // eslint-disable-next-line jsdoc/require-returns
    /**
     * Restores the given entity.
     *
     * @param entity - The entity to restore.
     * @param options - Additional options, eg. Transaction.
     */
    async restore(entity: T, options?: AnyObject): Promise<void> {
        if (!entity.deleted) {
            console.warn('The entity is not flagged as deleted. Returning.');
            return;
        }
        await this.createChangeSet(entity, { ...entity, deleted: false }, ChangeSetType.RESTORE, options, true);
        entity.deleted = false;
        // Because entity.deleted is inside the "keysToExcludeFromChangeSets" we don't need to worry about a change set being created twice.
        return this.update(entity, options);
    }

    // eslint-disable-next-line jsdoc/require-returns
    /**
     * Restores the entity with the given id.
     *
     * @param id - The id of the entity to restore.
     * @param options - Additional options, eg. Transaction.
     */
    async restoreById(id: ID, options?: AnyObject): Promise<void> {
        const entity: T = await this.findById(id, options);
        return this.restore(entity, options);
    }

    /**
     * Restores all entities found for the given filter that were deleted.
     *
     * @param where - A where filter.
     * @param options - Additional options, eg. Transaction.
     * @returns The amount of restored entities.
     */
    async restoreAll(where?: Where<T>, options?: AnyObject): Promise<Count> {
        where = where ? { ...where, deleted: true } : { deleted: true } as Where<T>; //TODO why is this conversion necessary?
        const entitiesToRestore: T[] = await this.find({ where: where }, options);
        await Promise.all(entitiesToRestore.map(e => this.restore(e, options)));
        return { count: entitiesToRestore.length };
    }
}