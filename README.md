# lbx-change-sets

This package helps you to track changes made on your entities automatically using a base repository class to extend from:

- Automatically generate change sets containing information about WHO, WHEN and WHAT was changed on your entities.
- Be able to rollback a single or multiple entities to the state of a specified change set or date. (The reset gets also tracked)
- Be able to "softly" delete entities, which have a delete flag on them.
- Be able to restore a single or multiple "softly" deleted entities.

# Usage

## Register the component

The minimum required code changes to use the library to its full extend is simply registering it in the `application.ts` constructor:

```ts
import { ChangeRepository, ChangeSetRepository, LbxChangeSetsComponent } from 'lbx-change-sets';

//...
this.component(LbxChangeSetsComponent);
this.repository(ChangeRepository);
this.repository(ChangeSetRepository);
//...
```

## Change Set
### Create an entity that should use change sets
All entities that should make use of the change set functionality need to extend `ChangeSetEntity`:

```ts
import { ChangeSetEntity } from 'lbx-change-sets';
// ...
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
```
### Create the repository for that entity
The repository needs to extend `CrudChangeSetRepository`:
```ts
import { CrudChangeSetRepository } from 'lbx-change-sets';
// ...
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
```

### Enjoy!
That's it. Whenever you user the default actions of the repository like "create" or "updateById" a change set will be generated automatically.

If you use transactions they will be used to guarantee that change sets are only generated when the base operation worked.

> INFO: If you have complex relations that should be tracked or rolled back you will probably need to override the corresponding methods.

### Get change sets
All existing change sets are available via the normal `@hasMany` property "changeSets" on your entity and repository. You can however also get them via the `ChangeSetRepository` and `ChangeRepository`.

### Rollback
To rollback you can simply call the methods `rollback[ToDate | ToChangeSet...]` on your repository.

### Exclude properties from change set creation
If you have some properties that you don't want to have in your change sets, you can exlude them by overriding the `keysToExcludeFromChangeSets` array in your repository. By default this already doesn't track the entities id.

## Change Set & Soft Delete
If you want to use the soft delete features aswell, you can basically follow the same steps above but extend from `ChangeSetSoftDeleteEntity` and `CrudChangeSetSoftDeleteRepository`.

They provide the same functionality mentionend above and some more:

### soft delete
To softly delete a single or multiple entities you can use the respoitories `softDelete[ById | All...]` methods.

### restore
To softly delete a single or multiple entities you can use the respoitories `restore[ById | All...]` methods.

### convenience methods
Because most times you probably want to only return or update entities that aren't deleted, the repository provides some convenience methods for that:
- findNonDeleted: `find`, but limited to not deleted entities
- findDeleted: `find`, but limited to deleted entities
- updateAllNonDeleted: `updateAll`, but limited to not deleted entities
- updateAllDeleted: `updateAll`, but limited to deleted entities
- rollbackAllNonDeletedToDate: `rollbackAllToDate`, but limited to not deleted entities
- rollbackAllDeletedToDate: `rollbackAllToDate`, but limited to deleted entities
- deleteAllDeleted: `deleteAll`, but limited to deleted entities