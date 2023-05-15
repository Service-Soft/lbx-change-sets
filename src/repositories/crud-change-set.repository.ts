import { Getter, inject } from '@loopback/core';
import { AnyObject, Count, DataObject, DefaultCrudRepository, EntityNotFoundError, Filter, HasManyRepositoryFactory, Options, Where, juggler, repository } from '@loopback/repository';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { sleep } from '../__tests__/fixtures/helpers';
import { LbxChangeSetsBindings } from '../keys';
import { Change, ChangeSetType } from '../models';
import { ChangeSetEntity } from '../models/change-set-entity.model';
import { ChangeSet } from '../models/change-set.model';
import { ChangeSetRepository } from './change-set.repository';
import { ChangeRepository } from './change.repository';

type NewChange = Omit<Change, 'id' | 'getId' | 'getIdObject' | 'toJSON' | 'toObject' | 'changeSetId'>;

/**
 * A base crud repository that automatically handles creation of change sets.
 */
export class CrudChangeSetRepository<T extends ChangeSetEntity, ID, Relations extends object = {}>
    extends DefaultCrudRepository<T, ID, Relations> {

    readonly changeSets: HasManyRepositoryFactory<ChangeSet, typeof ChangeSetEntity.prototype.id>;

    /**
     * Any keys that should be excluded from the change set.
     */
    protected readonly keysToExcludeFromChangeSets: (keyof T)[] = ['changeSets'];

    constructor(
        entityClass: typeof ChangeSetEntity & { prototype: T },
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
        super(entityClass, dataSource);
        this.changeSets = this.createHasManyRepositoryFactoryFor('changeSets', changeSetRepositoryGetter);
        this.registerInclusionResolver('changeSets', this.changeSets.inclusionResolver);
    }

    override async create(entity: DataObject<T>, options?: AnyObject): Promise<T> {
        const res: T = await super.create(entity, options);
        await this.createChangeSet(res, entity, ChangeSetType.CREATE, options);
        return res;
    }

    override async createAll(entities: DataObject<T>[], options?: AnyObject): Promise<T[]> {
        return Promise.all(entities.map(e => this.create(e, options)));
    }

    // updateById uses this method, therefore we don't need to override it.
    override async updateAll(data: DataObject<T>, where?: Where<T>, options?: AnyObject): Promise<Count> {
        const entitiesToUpdate: T[] = await this.find({ where: where }, options);
        await Promise.all(entitiesToUpdate.map(e => this.createChangeSet(e, data, ChangeSetType.UPDATE, options)));
        return super.updateAll(data, where, options);
    }

    override async replaceById(id: ID, data: DataObject<T>, options?: AnyObject): Promise<void> {
        const entity: T = await this.findById(id, options);
        await this.createChangeSet(entity, data, ChangeSetType.REPLACE, options);
        return super.replaceById(id, data, options);
    }

    /**
     * Delete matching records including all of their change sets.
     *
     * @param where - An additional filter.
     * @param options - Additional options, eg. Transaction.
     * @returns The amount of deleted entities.
     */
    override async deleteAll(where?: Where<T>, options?: AnyObject): Promise<Count> {
        const entitiesToDelete: T[] = await this.find({ where: where }, options);
        // We can use this.delete here because it uses deleteById internally
        await Promise.all(entitiesToDelete.map(e => this.delete(e, options)));
        return { count: entitiesToDelete.length };
    }

    /**
     * Delete an entity by id.
     * Also handles the deletion of all change sets.
     *
     * @param id - Value for the entity id.
     * @param options - Options for the operations.
     * @returns A promise that will be resolve if the operation succeeded or will be rejected if the entity was not found.
     */
    override async deleteById(id: ID, options?: AnyObject): Promise<void> {
        await this.deleteChangeSetsForEntity(id, options);
        return super.deleteById(id, options);
    }

    /**
     * Resets the changes of a single change set on the given entity to the state before the change set.
     * This DOES preserve any changes that happened after the change set.
     * The given change set gets deleted afterwards.
     *
     * @param entity - The entity that should be reset.
     * @param changeSet - The change set which changes should be reset.
     * @param createChangeSet - Whether or not a change set should be created.
     * @param preserveCreateChangeSet - Whether or not create change sets should be preserved.
     * In that case the entity gets reset to the state after the create change set. Also, the change set isn't deleted.
     * @param options - Additional options, eg. Transaction.
     * @returns The updated entity.
     */
    async resetSingleChangeSet(
        entity: T,
        changeSet: ChangeSet,
        createChangeSet: boolean = true,
        preserveCreateChangeSet: boolean = true,
        options?: AnyObject
    ): Promise<{entity: T, changedValues: DataObject<T>}> {
        if (changeSet.changeSetEntityId !== entity.id) {
            // eslint-disable-next-line max-len
            throw new Error('Could not reset the changes from the change set: The changeSet doesn\'t belong to the entity with the given id.');
        }
        const data: DataObject<T> = {};
        const changes: Change[] = await this.changeSetRepository.changes(changeSet.id).find(undefined, options);
        for (const change of changes) {
            const key: keyof T = change.key as keyof T;
            // if (!this.hasValueChanged(change.newValue as T[keyof T], entity[key])) {
            if (preserveCreateChangeSet && changeSet.type === ChangeSetType.CREATE) {
                data[key] = change.newValue as T[keyof T];
            }
            else {
                data[key] = change.previousValue as T[keyof T];
            }
            // }
        }
        await this.updateByIdWithoutChangeSet(entity.id as ID, data, options);
        if (createChangeSet) {
            await this.createChangeSet(entity, data, ChangeSetType.RESET, options);
        }
        if (!preserveCreateChangeSet || changeSet.type !== ChangeSetType.CREATE) {
            await this.changeSetRepository.deleteById(changeSet.id, options);
        }
        return { entity: await this.findById(entity.id as ID, undefined, options), changedValues: data };
    }

    /**
     * Update an entity by id with property/value pairs in the data object.
     *
     * @param id - Value for the entity id.
     * @param data - Data attributes to be updated.
     * @param options - Options for the operations.
     * @returns
     * A promise that will be resolve if the operation succeeded or will be rejected if the entity was not found.
     */
    async updateByIdWithoutChangeSet(id: ID, data: DataObject<T>, options?: Options): Promise<void> {
        if (id === undefined) {
            throw new Error('Invalid Argument: id cannot be undefined');
        }
        const idProp: string = this.modelClass.definition.idName();
        const where: Where<T> = {} as Where<T>;
        (where as AnyObject)[idProp] = id;
        const result: Count = await super.updateAll(data, where, options);
        if (result.count === 0) {
            throw new EntityNotFoundError(this.entityClass, id);
        }
    }

    /**
     * Resets the changes of a single change set on the entity with the given id to the state before the oldest change set.
     * This DOES preserve any changes that happened after the change set.
     * The given change set gets deleted afterwards.
     *
     * @param id - The id of the entity that should be reset.
     * @param changeSet - The change set which changes should be reset.
     * @param createChangeSet - Whether or not a change set should be created.
     * @param preserveCreateChangeSet - Whether or not create change sets should be preserved.
     * In that case the entity gets reset to the state after the create change set. Also, the create change set isn't deleted.
     * @param options - Additional options, eg. Transaction.
     * @returns The updated entity.
     */
    async resetSingleChangeSetById(
        id: ID,
        changeSet: ChangeSet,
        createChangeSet: boolean = true,
        preserveCreateChangeSet: boolean = true,
        options?: AnyObject
    ): Promise<{entity: T, changedValues: DataObject<T>}> {
        const entity: T = await this.findById(id, options);
        return this.resetSingleChangeSet(entity, changeSet, createChangeSet, preserveCreateChangeSet, options);
    }

    /**
     * Rolls back all changes on the given entity that have happened since the given change set.
     * This DOES NOT preserve any changes that happened after the change set.
     * The given change set and any change sets after that will be deleted in the end.
     * Calls rollbackByDate on the change set date internally.
     *
     * @param entity - The entity to rollback.
     * @param changeSet - The change set that should be rolled back to.
     * @param createChangeSet - Whether or not a change set should be created.
     * @param preserveCreateChangeSet - Whether or not create change sets should be preserved.
     * In that case the entity gets reset to the state after the create change set. Also, the create change set isn't deleted.
     * @param options - Additional options, eg. Transaction.
     * @returns The updated entity.
     */
    async rollbackToChangeSet(
        entity: T,
        changeSet: ChangeSet,
        createChangeSet: boolean = true,
        preserveCreateChangeSet: boolean = true,
        options?: AnyObject
    ): Promise<T> {
        return this.rollbackToDate(entity, changeSet.changedAt, createChangeSet, preserveCreateChangeSet, options);
    }

    /**
     * Rolls back all changes on the entity with the given id that have happened since the given change set.
     * This DOES NOT preserve any changes that happened after the change set.
     * The given change set and any change sets after that will be deleted in the end.
     * Calls rollbackByDate on the change set date internally.
     *
     * @param id - The id of the entity to rollback.
     * @param changeSet - The change set that should be rolled back to.
     * @param createChangeSet - Whether or not a change set should be created.
     * @param preserveCreateChangeSet - Whether or not create change sets should be preserved.
     * In that case the entity gets reset to the state after the create change set. Also, the create change set isn't deleted.
     * @param options - Additional options, eg. Transaction.
     * @returns The updated entity.
     */
    async rollbackToChangeSetById(
        id: ID,
        changeSet: ChangeSet,
        createChangeSet: boolean = true,
        preserveCreateChangeSet: boolean = true,
        options?: AnyObject
    ): Promise<T> {
        if (changeSet.changeSetEntityId !== id) {
            throw new Error('Could not rollback to the given change set: The changeSet doesn\'t belong to the entity with the given id.');
        }
        return this.rollbackToDateById(id, changeSet.changedAt, createChangeSet, preserveCreateChangeSet, options);
    }

    /**
     * Rolls back all changes on the given entity that have happened since the given date.
     * This DOES NOT preserve any changes that happened after the date.
     * Any change sets after the given date will be deleted in the end.
     *
     * @param entity - The entity to rollback.
     * @param date - The date to which the rollback should happen.
     * @param createChangeSet - Whether or not a change set should be created.
     * @param preserveCreateChangeSet - Whether or not create change sets should be preserved.
     * In that case the entity gets reset to the state after the create change set. Also, the create change set isn't deleted.
     * @param options - Additional options, eg. Transaction.
     * @returns The updated entity.
     */
    async rollbackToDate(
        entity: T,
        date: Date,
        createChangeSet: boolean = true,
        preserveCreateChangeSet: boolean = true,
        options?: AnyObject
    ): Promise<T> {
        const changeSetDateFilter: Filter<ChangeSet> = {
            where: { changedAt: { gte: date } },
            include: ['changes'],
            order: ['changedAt DESC']
        };
        const changeSets: ChangeSet[] = (await this.changeSets(entity.id).find(changeSetDateFilter, options));
        let data: DataObject<T> = {};
        for (const changeSet of changeSets) {
            const changedValues: DataObject<T> = (await this.resetSingleChangeSet(
                entity,
                changeSet,
                false,
                preserveCreateChangeSet,
                options
            )).changedValues;
            data = { ...data, ...changedValues };
        }
        if (createChangeSet) {
            await this.createChangeSet(entity, data, ChangeSetType.RESET, options);
        }
        return await this.findById(entity.id as ID, undefined, options);
    }

    /**
     * Rolls back all changes on the entity with the given id that have happened since the given date.
     * This DOES NOT preserve any changes that happened after the date.
     * Any change sets after the given date will be deleted in the end.
     *
     * @param id - The id of the entity to rollback.
     * @param date - The date to which the rollback should happen.
     * @param createChangeSet - Whether or not a change set should be created.
     * @param preserveCreateChangeSet - Whether or not create change sets should be preserved.
     * In that case the entity gets reset to the state after the create change set. Also, the create change set isn't deleted.
     * @param options - Additional options, eg. Transaction.
     * @returns The updated entity.
     */
    async rollbackToDateById(
        id: ID,
        date: Date,
        createChangeSet: boolean = true,
        preserveCreateChangeSet: boolean = true,
        options?: AnyObject
    ): Promise<T> {
        const entity: T = await this.findById(id, options);
        return this.rollbackToDate(entity, date, createChangeSet, preserveCreateChangeSet, options);
    }

    /**
     * Rolls back all changes on the entities found with the given where filter to the state of the given date.
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
    async rollbackAllToDate(
        date: Date,
        where?: Where<T>,
        createChangeSet: boolean = true,
        preserveCreateChangeSet: boolean = true,
        options?: AnyObject
    ): Promise<Count> {
        //TODO: Override in soft delete repository and add a filter to only rollback non deleted entities.
        const entitiesToRollback: T[] = await this.find({ where: where }, options);
        await Promise.all(entitiesToRollback.map(e => this.rollbackToDate(e, date, createChangeSet, preserveCreateChangeSet, options)));
        return { count: entitiesToRollback.length };
    }

    /**
     * Deletes all change sets with their changes for the entity with the given id.
     *
     * @param id - The id of the entity that should be deleted.
     * @param options - Additional options (e.g. Transaction etc.).
     */
    protected async deleteChangeSetsForEntity(id: ID, options: AnyObject | undefined): Promise<void> {
        const changeSets: ChangeSet[] = await this.changeSetRepository.find({ where: { changeSetEntityId: id as string } }, options);
        for (const changeSet of changeSets) {
            await this.changeRepository.deleteAll({ changeSetId: changeSet.id }, options);
            await this.changeSetRepository.deleteById(changeSet.id, options);
        }
    }

    /**
     * Creates a change set for the related entity id.
     * Also generates the changes from the given data.
     *
     * @param entity - The entity for which the change set gets created.
     * @param data - The data of the operation eg. The update body.
     * @param type - Whether the change set is for create, update or delete.
     * @param options - Additional options (e.g. Transaction etc.).
     * @param force - Whether or not the creation of a change set without changes should be forced.
     */
    async createChangeSet(entity: T, data: DataObject<T>, type: ChangeSetType, options?: AnyObject, force: boolean = false): Promise<void> {
        const changes: NewChange[] = await this.getChangesFromData(entity, data, type);
        if (!force && !changes.length) {
            return;
        }
        await sleep(1); // TODO Better way To guarantee a different time stamp on change sets.
        const changeSetData: Omit<ChangeSet, 'id' | 'getId' | 'getIdObject' | 'toJSON' | 'toObject' | 'changes'> = {
            changeSetEntityId: entity.id,
            type: type,
            changedAt: new Date(),
            changedBy: await this.getChangedByUserId()
        };
        const changeSet: ChangeSet = await this.changeSets(entity.id).create(changeSetData, options); // TODO transaction
        for (const change of changes) {
            await this.changeSetRepository.changes(changeSet.id).create(change, options); //TODO transaction
        }
    }

    /**
     * Get all changes from the given data that should be added to a new change set.
     *
     * @param entity - The entity that has been changed.
     * @param data - The changed data.
     * @param type - The type of the change set to create.
     * @returns An array of changes for the change set.
     * Filtered by values that have actually changed and aren't in the "keysToExcludeFromChangeSets" array.
     */
    protected async getChangesFromData(entity: T, data: DataObject<T>, type: ChangeSetType): Promise<NewChange[]> {
        const res: NewChange[] = [];
        for (const key of this.getKeysToIncludeInChangeSet(data)) {
            const previousValue: T[keyof T] | undefined = type === ChangeSetType.CREATE ? undefined : entity[key];
            if (this.hasValueChanged(previousValue, data[key])) {
                res.push({
                    key: String(key),
                    previousValue: previousValue,
                    newValue: data[key]
                });
            }
        }
        return res;
    }

    /**
     * Checks whether or not a value has actually changed.
     * This is used to determine whether or not a change should be created or not.
     *
     * @param previousValue - The value before any changes.
     * @param newValue - The value after changes.
     * @returns Whether or not the given values are not equal.
     */
    protected hasValueChanged(previousValue?: T[keyof T], newValue?: DataObject<T>[keyof T]): boolean {
        return previousValue !== newValue
            || JSON.stringify(previousValue) !== JSON.stringify(newValue);
    }

    /**
     * Gets the keys of values that should be included in change sets.
     *
     * @param data - The new values.
     * @returns The keys that should be included in the change set.
     */
    protected getKeysToIncludeInChangeSet(data: DataObject<T>): (keyof T)[] {
        const keys: (keyof T)[] = [];
        for (const key in data) {
            if (!this.keysToExcludeFromChangeSets.includes(key)) {
                keys.push(key);
            }
        }
        return keys;
    }

    /**
     * Tries to get a currently logged in user using @loopback/security.
     *
     * @returns The id of the currently logged in user or undefined if that didn't work.
     */
    protected async getChangedByUserId(): Promise<string | undefined> {
        try {
            return (await this.getUserProfile())[securityId];
        }
        catch (error) {
            return undefined;
        }
    }

    /**
     * Creates the changes for the given change set from the given data.
     *
     * @param keys - The keys to create changes for.
     * @param changeSet - The changeset to create the changes for.
     * @param data - The data to get the changed values from.
     * @param options - Additional options (e.g. Transaction etc.).
     */
    // eslint-disable-next-line max-len
    protected async createChangesFromData(keys: (keyof T)[], changeSet: ChangeSet, data: DataObject<T>, options?: AnyObject): Promise<void> {
        const entity: T = await this.findById(changeSet.changeSetEntityId as ID, undefined, options);
        for (const key of keys) {
            const changeData: Omit<Change, 'id' | 'getId' | 'getIdObject' | 'toJSON' | 'toObject'> = {
                key: String(key),
                previousValue: changeSet.type === ChangeSetType.CREATE ? undefined : entity[key],
                newValue: data[key],
                changeSetId: changeSet.id
            };
            await this.changeRepository.create(changeData, options); //TODO transaction
        }
    }
}