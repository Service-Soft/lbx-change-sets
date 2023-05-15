import { Getter, inject } from '@loopback/core';
import { repository } from '@loopback/repository';
import { SecurityBindings, UserProfile } from '@loopback/security';
import { ChangeRepository, ChangeSetRepository, CrudChangeSetRepository } from 'lbx-change-sets';
import { DbDataSource } from '../datasources';
import { TestChangeSetEntity, TestRelations } from '../models';

export class TestChangeSetEntityRepository extends CrudChangeSetRepository<
    TestChangeSetEntity,
    typeof TestChangeSetEntity.prototype.id,
    TestRelations
> {
    constructor(
        @inject('datasources.db')
        dataSource: DbDataSource,
        @repository.getter('ChangeSetRepository')
        changeSetRepositoryGetter: Getter<ChangeSetRepository>,
        @repository(ChangeRepository)
        changeRepository: ChangeRepository,
        @repository(ChangeSetRepository)
        changeSetRepository: ChangeSetRepository,
        @inject.getter(SecurityBindings.USER)
        getUserProfile: Getter<UserProfile>
    ) {
        super(TestChangeSetEntity, dataSource, changeSetRepositoryGetter, changeRepository, changeSetRepository, getUserProfile);
    }
}