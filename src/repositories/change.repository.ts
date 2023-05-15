import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, DefaultCrudRepository, juggler, repository } from '@loopback/repository';
import { LbxChangeSetsBindings } from '../keys';
import { Change, ChangeRelations, ChangeSet } from '../models';
import { ChangeSetRepository } from './change-set.repository';

export class ChangeRepository extends DefaultCrudRepository<
    Change,
    typeof Change.prototype.id,
    ChangeRelations
> {

    readonly changeSet: BelongsToAccessor<ChangeSet, typeof Change.prototype.id>;

    constructor(
        @inject(LbxChangeSetsBindings.DATASOURCE_KEY)
        dataSource: juggler.DataSource,
        @repository.getter('ChangeSetRepository')
        protected changeSetRepositoryGetter: Getter<ChangeSetRepository>
    ) {
        super(Change, dataSource);
        this.changeSet = this.createBelongsToAccessorFor('changeSet', changeSetRepositoryGetter);
        this.registerInclusionResolver('changeSet', this.changeSet.inclusionResolver);
    }
}