/* eslint-disable no-console */
import { Getter, inject } from '@loopback/core';
import { AnyObject, Count, DataObject, Filter, FilterBuilder, Where, juggler, repository } from '@loopback/repository';
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
        changeSetRepositoryGetter: Getter<ChangeSetRepository>,
        @repository(ChangeRepository)
        changeRepository: ChangeRepository,
        @repository(ChangeSetRepository)
        changeSetRepository: ChangeSetRepository,
        @inject.getter(SecurityBindings.USER)
        getUserProfile: Getter<UserProfile>
    ) {
        super(entityClass, dataSource, changeSetRepositoryGetter, changeRepository, changeSetRepository, getUserProfile);
    }

    /**
     * Delete matching records that have been softly deleted including all of their change sets.
     * @param where - An additional filter.
     * @param options - Additional options, eg. Transaction.
     * @returns The amount of deleted entities.
     */
    async deleteAllDeleted(where?: Where<T>, options?: AnyObject): Promise<Count> {
        where = whereWithDeleted(true, where);
        return super.deleteAll(where, options);
    }

    /**
     * Find matching records that are deleted.
     * @param filter - Query filter.
     * @param options - Options for the operations.
     * @returns A promise of an array of records found.
     */
    async findDeleted(filter?: Filter<T>, options?: AnyObject): Promise<T[]> {
        filter = new FilterBuilder(filter)
            .where(whereWithDeleted(true, filter?.where))
            .build();
        return super.find(filter, options);
    }

    /**
     * Find matching records that are not deleted.
     * @param filter - Query filter.
     * @param options - Options for the operations.
     * @returns A promise of an array of records found.
     */
    async findNonDeleted(filter?: Filter<T>, options?: AnyObject): Promise<T[]> {
        filter = new FilterBuilder(filter)
            .where(whereWithDeleted(false, filter?.where))
            .build();
        return super.find(filter, options);
    }

    /**
     * Updating matching records that are deleted with attributes from the data object.
     * @param data - The data to update the entities with.
     * @param where - A filter to only update some entities.
     * @param options - Additional options, eg. Transaction.
     * @returns The amount of updated entities.
     */
    async updateAllDeleted(data: DataObject<T>, where?: Where<T>, options?: AnyObject): Promise<Count> {
        where = whereWithDeleted(true, where);
        return this.updateAll(data, where, options);
    }

    /**
     * Updating matching records that are not deleted with attributes from the data object.
     * @param data - The data to update the entities with.
     * @param where - A filter to only update some entities.
     * @param options - Additional options, eg. Transaction.
     * @returns The amount of updated entities.
     */
    async updateAllNonDeleted(data: DataObject<T>, where?: Where<T>, options?: AnyObject): Promise<Count> {
        where = whereWithDeleted(false, where);
        return this.updateAll(data, where, options);
    }

    /**
     * Rolls back all changes on deleted entities found with the given where filter to the state of the given date.
     *
     * This DOES NOT preserve any changes that happened after the date.
     * Any change sets after the given date will be deleted in the end.
     * @param date - The date to which the rollback should happen.
     * @param where - A filter to only rollback some entities.
     * @param createChangeSet - Whether or not a change set should be created.
     * @param preserveCreateChangeSet - Whether or not create change sets should be preserved.
     * In that case the entity gets reset to the state after the create change set. Also, the create change set isn't deleted.
     * @param options - Additional options, eg. Transaction.
     * @returns The updated entity.
     */
    async rollbackAllDeletedToDate(
        date: Date,
        where?: Where<T>,
        createChangeSet: boolean = true,
        preserveCreateChangeSet: boolean = true,
        options?: AnyObject
    ): Promise<Count> {
        where = whereWithDeleted(true, where);
        return this.rollbackAllToDate(date, where, createChangeSet, preserveCreateChangeSet, options);
    }

    /**
     * Rolls back all changes on not deleted entities found with the given where filter to the state of the given date.
     *
     * This DOES NOT preserve any changes that happened after the date.
     * Any change sets after the given date will be deleted in the end.
     * @param date - The date to which the rollback should happen.
     * @param where - A filter to only rollback some entities.
     * @param createChangeSet - Whether or not a change set should be created.
     * @param preserveCreateChangeSet - Whether or not create change sets should be preserved.
     * In that case the entity gets reset to the state after the create change set. Also, the create change set isn't deleted.
     * @param options - Additional options, eg. Transaction.
     * @returns The updated entity.
     */
    async rollbackAllNonDeletedToDate(
        date: Date,
        where?: Where<T>,
        createChangeSet: boolean = true,
        preserveCreateChangeSet: boolean = true,
        options?: AnyObject
    ): Promise<Count> {
        where = whereWithDeleted(false, where);
        return this.rollbackAllToDate(date, where, createChangeSet, preserveCreateChangeSet, options);
    }

    // eslint-disable-next-line jsdoc/require-returns
    /**
     * Softly deletes the given entity and creates a change set.
     * This simply sets the deleted flag to true.
     * @param entity - The entity that should be softly deleted.
     * @param options - Additional options, eg. Transaction.
     */
    async softDelete(entity: T, options?: AnyObject): Promise<void> {
        if (entity.deleted) {
            console.warn('The entity is already flagged as deleted. Returning.');
            return;
        }
        await this.createChangeSet(entity, { deleted: true }, ChangeSetType.DELETE, options, true);
        // Because entity. is inside the "keysToExcludeFromChangeSets" we don't need to worry about a change set being created twice.
        return this.updateById(entity.id as ID, { deleted: true }, options);
    }

    // eslint-disable-next-line jsdoc/require-returns
    /**
     * Softly deletes the entity with the given id and creates a change set.
     * This simply sets the deleted flag to true.
     * @param id - The entity that should be softly deleted.
     * @param options - Additional options, eg. Transaction.
     */
    async softDeleteById(id: ID, options?: AnyObject): Promise<void> {
        const entity: T = await this.findById(id, options);
        return this.softDelete(entity, options);
    }

    /**
     * Softly deletes all entities found for the given filter that are not already deleted.
     * @param where - A where filter.
     * @param options - Additional options, eg. Transaction.
     * @returns The amount of softly deleted entities.
     */
    async softDeleteAll(where?: Where<T>, options?: AnyObject): Promise<Count> {
        where = whereWithDeleted(false, where);
        const entitiesToDelete: T[] = await this.find({ where: where }, options);
        await Promise.all(entitiesToDelete.map(e => this.softDelete(e, options)));
        return { count: entitiesToDelete.length };
    }

    // eslint-disable-next-line jsdoc/require-returns
    /**
     * Restores the given entity.
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
        return this.updateByIdWithoutChangeSet(entity.id as ID, entity, options);
    }

    // eslint-disable-next-line jsdoc/require-returns
    /**
     * Restores the entity with the given id.
     * @param id - The id of the entity to restore.
     * @param options - Additional options, eg. Transaction.
     */
    async restoreById(id: ID, options?: AnyObject): Promise<void> {
        const entity: T = await this.findById(id, options);
        return this.restore(entity, options);
    }

    /**
     * Restores all entities found for the given filter that were deleted.
     * @param where - A where filter.
     * @param options - Additional options, eg. Transaction.
     * @returns The amount of restored entities.
     */
    async restoreAll(where?: Where<T>, options?: AnyObject): Promise<Count> {
        where = whereWithDeleted(true, where);
        const entitiesToRestore: T[] = await this.find({ where: where }, options);
        await Promise.all(entitiesToRestore.map(e => this.restore(e, options)));
        return { count: entitiesToRestore.length };
    }
}

/**
 * Adds a delete condition for the given filter.
 * @param value - Whether to filter for { deleted: true } or { deleted: false }.
 * @param where - An existing where clause that should be modified.
 * @returns A where condition with either { deleted: true } or { deleted: false }.
 */
function whereWithDeleted<T extends object>(value: boolean, where?: Where<T>): Where<T> {
    return { ...where, deleted: value } as Where<T>; //TODO: Why is this conversion necessary?
}