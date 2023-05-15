import { Getter, inject } from '@loopback/core';
import { DefaultCrudRepository, HasManyRepositoryFactory, juggler, repository } from '@loopback/repository';
import { LbxChangeSetsBindings } from '../keys';
import { Change } from '../models';
import { ChangeSet, ChangeSetRelations } from '../models/change-set.model';
import { ChangeRepository } from './change.repository';

export class ChangeSetRepository extends DefaultCrudRepository<
    ChangeSet,
    typeof ChangeSet.prototype.id,
    ChangeSetRelations
> {

    readonly changes: HasManyRepositoryFactory<Change, typeof ChangeSet.prototype.id>;

    constructor(
        @inject(LbxChangeSetsBindings.DATASOURCE_KEY)
        dataSource: juggler.DataSource,
        @repository.getter('ChangeRepository')
        protected changeRepositoryGetter: Getter<ChangeRepository>
    ) {
        super(ChangeSet, dataSource);
        this.changes = this.createHasManyRepositoryFactoryFor('changes', changeRepositoryGetter);
        this.registerInclusionResolver('changes', this.changes.inclusionResolver);
    }
}