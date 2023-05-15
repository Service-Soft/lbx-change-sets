/* eslint-disable max-len */
import { Count } from '@loopback/repository';
import { expect } from '@loopback/testlab';
import { Change, ChangeSet, ChangeSetType } from '../../models';
import { TestChangeSetEntity } from '../fixtures/test.model';
import { createTestRepositories } from '../fixtures/test.repository';

const { testRepository, changeSetRepository } = createTestRepositories();

const tE: Omit<TestChangeSetEntity, 'id' | 'getId' | 'getIdObject' | 'toJSON' | 'toObject' | 'changeSets' | 'deleted'> = {
    firstName: 'James',
    lastName: 'Smith'
};
const tE2: Omit<TestChangeSetEntity, 'id' | 'getId' | 'getIdObject' | 'toJSON' | 'toObject' | 'changeSets' | 'deleted'> = {
    firstName: 'Jane',
    lastName: 'Smith'
};

const tE3: Omit<TestChangeSetEntity, 'id' | 'getId' | 'getIdObject' | 'toJSON' | 'toObject' | 'changeSets' | 'deleted'> = {
    firstName: 'first',
    lastName: 'last'
};

let finishedTE: TestChangeSetEntity;

describe('CrudChangeSetSoftDeleteRepository should automatically create change sets for deletion and restoration', () => {
    it('should automatically create a single changeset on "softDelete" and "restore"', async () => {
        finishedTE = await testRepository.create(tE); // 1
        await testRepository.softDelete(finishedTE); // 2
        finishedTE = await testRepository.findById(finishedTE.id);
        expect(finishedTE.deleted).to.equal(true);
        await testRepository.restore(finishedTE); // 3
        finishedTE = await testRepository.findById(finishedTE.id);
        expect(finishedTE.deleted).to.equal(false);
        const changeSets: number = (await changeSetRepository.find()).length;
        expect(changeSets).to.equal(3);
    });

    it('should automatically create a single changeset per entity on "softDeleteAll" and "restoreAll"', async () => {
        await testRepository.createAll([tE2, tE3]);
        await testRepository.softDeleteAll(); // 4
        finishedTE = await testRepository.findById(finishedTE.id);
        expect(finishedTE.deleted).to.equal(true);
        await testRepository.restoreAll(); // 5
        finishedTE = await testRepository.findById(finishedTE.id);
        expect(finishedTE.deleted).to.equal(false);
        const changeSets: number = (await changeSetRepository.find()).length;
        expect(changeSets).to.equal(11);
    });
});

describe('Change sets for finishedTE should have the correct changes', () => {
    let changeSets: ChangeSet[];
    let index: number = 0;

    before(async () => changeSets = await testRepository.changeSets(finishedTE.id).find({ include: ['changes'], order: ['createdAt ASC'] }));
    afterEach(() => index++);

    it('should have the correct length', async () => {
        expect(changeSets.length).to.equal(5);
        index--;
    });

    it('should have the correct data on changeSet #1', () => {
        expect(changeSets[index].createdBy).to.equal('42');
        expect(changeSets[index].type).to.equal(ChangeSetType.CREATE);
        const changes: Change[] = changeSets[index].changes;
        expect(changes.length).to.equal(2);

        const firstNameChange: Change = changes.find(c => c.key === 'firstName') as Change;
        expect(firstNameChange.previousValue).to.equal(undefined);
        expect(firstNameChange.newValue).to.equal('James');

        const lastNameChange: Change = changes.find(c => c.key === 'lastName') as Change;
        expect(lastNameChange.previousValue).to.equal(undefined);
        expect(lastNameChange.newValue).to.equal('Smith');
    });

    it('should have the correct data on changeSet #2', () => {
        expect(changeSets[index].createdBy).to.equal('42');
        expect(changeSets[index].type).to.equal(ChangeSetType.DELETE);
        const changes: Change[] = changeSets[index].changes;
        expect(changes).to.be.undefined();
    });

    it('should have the correct data on changeSet #3', () => {
        expect(changeSets[index].createdBy).to.equal('42');
        expect(changeSets[index].type).to.equal(ChangeSetType.RESTORE);
        const changes: Change[] = changeSets[index].changes;
        expect(changes).to.be.undefined();
    });

    it('should have the correct data on changeSet #4', () => {
        expect(changeSets[index].createdBy).to.equal('42');
        expect(changeSets[index].type).to.equal(ChangeSetType.DELETE);
        const changes: Change[] = changeSets[index].changes;
        expect(changes).to.be.undefined();
    });

    it('should have the correct data on changeSet #5', () => {
        expect(changeSets[index].createdBy).to.equal('42');
        expect(changeSets[index].type).to.equal(ChangeSetType.RESTORE);
        const changes: Change[] = changeSets[index].changes;
        expect(changes).to.be.undefined();
    });
});

describe('CrudChangeSetSoftDeleteRepository convenience methods should work', () => {
    beforeEach(async () => {
        finishedTE = await testRepository.create(tE);
        await testRepository.softDelete(finishedTE);

        await testRepository.create(tE2);
    });
    afterEach(async () => {
        await testRepository.deleteAll();
    });

    it('findDeleted', async () => {
        const entities: TestChangeSetEntity[] = await testRepository.findDeleted();
        expect(entities.length).to.equal(1);
        expect(entities[0].deleted).to.equal(true);
    });

    it('findNonDeleted', async () => {
        const entities: TestChangeSetEntity[] = await testRepository.findNonDeleted();
        expect(entities.length).to.equal(1);
        expect(entities[0].deleted).to.equal(false);
    });

    it('updateAllDeleted', async () => {
        const count: Count = await testRepository.updateAllDeleted({ lastName: 'lastNameDeleted' });
        expect(count.count).to.equal(1);
        const deletedEntities: TestChangeSetEntity[] = await testRepository.findDeleted();
        expect(deletedEntities[0].lastName).to.equal('lastNameDeleted');
    });

    it('updateAllNonDeleted', async () => {
        const count: Count = await testRepository.updateAllNonDeleted({ lastName: 'lastNameNonDeleted' });
        expect(count.count).to.equal(1);
        const nonDeletedEntities: TestChangeSetEntity[] = await testRepository.findNonDeleted();
        expect(nonDeletedEntities[0].lastName).to.equal('lastNameNonDeleted');
    });

    it('rollbackAllDeletedToDate', async () => {
        await testRepository.updateAllDeleted({ lastName: 'lastName' });
        const count: Count = await testRepository.rollbackAllDeletedToDate(new Date('01-01-1970'));
        expect(count.count).to.equal(1);
        const deletedEntities: TestChangeSetEntity[] = await testRepository.findDeleted();
        expect(deletedEntities[0].lastName).to.equal('Smith');
    });

    it('rollbackAllNonDeletedToDate', async () => {
        await testRepository.updateAllNonDeleted({ lastName: 'lastName' });
        const count: Count = await testRepository.rollbackAllNonDeletedToDate(new Date('01-01-1970'));
        expect(count.count).to.equal(1);
        const nonDeletedEntities: TestChangeSetEntity[] = await testRepository.findNonDeleted();
        expect(nonDeletedEntities[0].lastName).to.equal('Smith');
    });

    it('deleteAllDeleted', async () => {
        const allEntitiesPriorDelete: TestChangeSetEntity[] = await testRepository.find();
        expect(allEntitiesPriorDelete.length).to.equal(2);
        await testRepository.deleteAllDeleted();
        const allEntities: TestChangeSetEntity[] = await testRepository.find();
        expect(allEntities.length).to.equal(1);
    });
});