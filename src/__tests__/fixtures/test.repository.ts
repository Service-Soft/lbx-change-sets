import { Getter, inject } from '@loopback/core';
import { juggler, repository } from '@loopback/repository';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { ChangeRepository, ChangeSetRepository } from '../../repositories';
import { CrudChangeSetSoftDeleteRepository } from '../../repositories/crud-change-set-soft-delete.repository';
import { TestChangeSetEntity, TestChangeSetEntityRelations } from './test.model';

export class TestChangeSetEntityRepository extends CrudChangeSetSoftDeleteRepository<
    TestChangeSetEntity,
    typeof TestChangeSetEntity.prototype.id,
    TestChangeSetEntityRelations
> {
    constructor(
        db: juggler.DataSource,
        @repository.getter('ChangeSetRepository')
        changeSetRepositoryGetter: Getter<ChangeSetRepository>,
        @repository(ChangeRepository)
        changeRepository: ChangeRepository,
        @repository(ChangeSetRepository)
        changeSetRepository: ChangeSetRepository,
        @inject.getter(SecurityBindings.USER)
        getUserProfile: Getter<UserProfile>
    ) {
        super(TestChangeSetEntity, db, changeSetRepositoryGetter, changeRepository, changeSetRepository, getUserProfile);
    }
}

// eslint-disable-next-line max-len
export function createTestRepositories(): { changeRepository: ChangeRepository, changeSetRepository: ChangeSetRepository, userProfile: UserProfile, testRepository: TestChangeSetEntityRepository } {
    const testDb: juggler.DataSource = new juggler.DataSource({
        name: `db-${Date.now()}`,
        connector: 'memory'
    });
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const changeRepository: ChangeRepository = new ChangeRepository(testDb, (async () => changeSetRepository));
    const changeSetRepository: ChangeSetRepository = new ChangeSetRepository(testDb, async () => changeRepository);
    const userProfile: UserProfile = { [securityId]: '42' };
    const testRepository: TestChangeSetEntityRepository = new TestChangeSetEntityRepository(
        testDb,
        (async () => changeSetRepository),
        changeRepository,
        changeSetRepository,
        (async () => userProfile)
    );

    return {
        changeRepository,
        changeSetRepository,
        userProfile,
        testRepository
    };
}