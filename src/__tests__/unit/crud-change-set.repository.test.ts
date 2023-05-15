/* eslint-disable max-len */
import { expect } from '@loopback/testlab';
import { Change, ChangeSet, ChangeSetType } from '../../models';
import { TestChangeSetEntity } from '../fixtures/test.model';
import { createTestRepositories } from '../fixtures/test.repository';

const { testRepository, changeSetRepository, changeRepository } = createTestRepositories();

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

describe('CrudChangeSetRepository should automatically create change sets', () => {
    //TODO: Transaction test

    it('should automatically create a single changeset on "create"', async () => {
        finishedTE = await testRepository.create(tE); // 1 2
        const changeSets: number = (await changeSetRepository.find()).length;
        expect(changeSets).to.equal(1);
    });
    it('should automatically create a single changeset per created entity on "createAll"', async () => {
        await testRepository.createAll([tE2, tE3]); // 6
        const changeSets: number = (await changeSetRepository.find()).length;
        expect(changeSets).to.equal(3);
    });
    it('should automatically create a single changeset on "updateById"', async () => {
        await testRepository.updateById(finishedTE.id, { firstName: 'Max' }); // 2 7
        const changeSets: number = (await changeSetRepository.find()).length;
        expect(changeSets).to.equal(4);
    });
    it('should automatically create a single changeset on "update"', async () => {
        finishedTE = await testRepository.findById(finishedTE.id);
        finishedTE.lastName = 'Mustermann';
        await testRepository.update(finishedTE); // 3 8
        const changeSets: number = (await changeSetRepository.find()).length;
        expect(changeSets).to.equal(5);
    });
    it('should automatically create a single changeset per updated entity on "updateAll"', async () => {
        await testRepository.updateAll({ firstName: 'James', lastName: 'Smith' }); // 4 14
        const changeSets: number = (await changeSetRepository.find()).length;
        expect(changeSets).to.equal(8);
    });
    it('should automatically create a single changeset on "replaceById"', async () => {
        await testRepository.replaceById(finishedTE.id, { firstName: 'Max', lastName: 'Mustermann' }); // 5 16
        const changeSets: number = (await changeSetRepository.find()).length;
        expect(changeSets).to.equal(9);
    });
    it('should automatically create a single changeset on "save"', async () => {
        // with id
        finishedTE = await testRepository.findById(finishedTE.id);
        finishedTE.firstName = 'Maxine';
        finishedTE.lastName = 'Musterfrau';
        await testRepository.save(finishedTE); // 6 18
        // without id
        await testRepository.save({ firstName: 'Maxine', lastName: 'Musterfrau' } as unknown as TestChangeSetEntity); // 20
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
        expect(changeSets.length).to.equal(6);
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

    it('should have the correct data on the changeSet #2', () => {
        expect(changeSets[index].createdBy).to.equal('42');
        expect(changeSets[index].type).to.equal(ChangeSetType.UPDATE);
        const changes: Change[] = changeSets[index].changes;
        expect(changes.length).to.equal(1);

        const firstNameChange: Change = changes.find(c => c.key === 'firstName') as Change;
        expect(firstNameChange.previousValue).to.equal('James');
        expect(firstNameChange.newValue).to.equal('Max');
    });

    it('should have the correct data on the changeSet #3', () => {
        expect(changeSets[index].createdBy).to.equal('42');
        expect(changeSets[index].type).to.equal(ChangeSetType.UPDATE);
        const changes: Change[] = changeSets[index].changes;
        expect(changes.length).to.equal(1);

        const lastNameChange: Change = changes.find(c => c.key === 'lastName') as Change;
        expect(lastNameChange.previousValue).to.equal('Smith');
        expect(lastNameChange.newValue).to.equal('Mustermann');
    });

    it('should have the correct data on the changeSet #4', () => {
        expect(changeSets[index].createdBy).to.equal('42');
        expect(changeSets[index].type).to.equal(ChangeSetType.UPDATE);
        const changes: Change[] = changeSets[index].changes;
        expect(changes.length).to.equal(2);

        const firstNameChange: Change = changes.find(c => c.key === 'firstName') as Change;
        expect(firstNameChange.previousValue).to.equal('Max');
        expect(firstNameChange.newValue).to.equal('James');

        const lastNameChange: Change = changes.find(c => c.key === 'lastName') as Change;
        expect(lastNameChange.previousValue).to.equal('Mustermann');
        expect(lastNameChange.newValue).to.equal('Smith');
    });

    it('should have the correct data on the changeSet #5', () => {
        expect(changeSets[index].createdBy).to.equal('42');
        expect(changeSets[index].type).to.equal(ChangeSetType.REPLACE);
        const changes: Change[] = changeSets[index].changes;
        expect(changes.length).to.equal(2);

        const firstNameChange: Change = changes.find(c => c.key === 'firstName') as Change;
        expect(firstNameChange.previousValue).to.equal('James');
        expect(firstNameChange.newValue).to.equal('Max');

        const lastNameChange: Change = changes.find(c => c.key === 'lastName') as Change;
        expect(lastNameChange.previousValue).to.equal('Smith');
        expect(lastNameChange.newValue).to.equal('Mustermann');
    });

    it('should have the correct data on the changeSet #6', () => {
        expect(changeSets[index].createdBy).to.equal('42');
        expect(changeSets[index].type).to.equal(ChangeSetType.REPLACE);
        const changes: Change[] = changeSets[index].changes;
        expect(changes.length).to.equal(2);

        const firstNameChange: Change = changes.find(c => c.key === 'firstName') as Change;
        expect(firstNameChange.previousValue).to.equal('Max');
        expect(firstNameChange.newValue).to.equal('Maxine');

        const lastNameChange: Change = changes.find(c => c.key === 'lastName') as Change;
        expect(lastNameChange.previousValue).to.equal('Mustermann');
        expect(lastNameChange.newValue).to.equal('Musterfrau');
    });
});

describe('CrudChangeSetRepository should delete entities with their change sets', () => {
    it('should automatically delete related change sets on "delete"', async () => {
        const changesPriorDelete: number = (await changeRepository.find()).length;
        expect(changesPriorDelete).to.equal(19); // In updateAll Jane Smith already has Smith as lastName
        const changeSetsPriorDelete: number = (await changeSetRepository.find()).length;
        expect(changeSetsPriorDelete).to.equal(11);
        const testEntitiesPriorDelete: number = (await testRepository.find()).length;
        expect(testEntitiesPriorDelete).to.equal(4);
        await testRepository.delete(finishedTE);
        const changes: number = (await changeRepository.find()).length;
        expect(changes).to.equal(9);
        const changeSets: number = (await changeSetRepository.find()).length;
        expect(changeSets).to.equal(5);
        const testEntities: number = (await testRepository.find()).length;
        expect(testEntities).to.equal(3);
    });

    it('should automatically delete related change sets per deleted entity on "deleteAll"', async () => {
        const testEntitiesPriorDelete: number = (await testRepository.find()).length;
        expect(testEntitiesPriorDelete).to.equal(3);
        const changeSetsPriorDelete: number = (await changeSetRepository.find()).length;
        expect(changeSetsPriorDelete).to.equal(5);
        const changesPriorDelete: number = (await changeRepository.find()).length;
        expect(changesPriorDelete).to.equal(9);
        await testRepository.deleteAll({ firstName: 'James' });
        const testEntities: number = (await testRepository.find()).length;
        expect(testEntities).to.equal(1);
        const changeSets: number = (await changeSetRepository.find()).length;
        expect(changeSets).to.equal(1);
        const changes: number = (await changeRepository.find()).length;
        expect(changes).to.equal(2);
    });
});

describe('CrudChangeSetRepository should be able to rollback change sets', () => {
    let changeSets: ChangeSet[];

    beforeEach(async () => {
        finishedTE = await testRepository.create(tE);
        await testRepository.updateById(finishedTE.id, { firstName: 'Max', lastName: 'Mustermann' });
        await testRepository.updateById(finishedTE.id, { lastName: 'Smith' });
        finishedTE = await testRepository.findById(finishedTE.id);
        changeSets = await testRepository.changeSets(finishedTE.id).find({ order: ['createdAt DESC'] });
        expect(changeSets.length).to.equal(3);
    });
    afterEach(async () => await testRepository.delete(finishedTE));

    it('should reset a single change set', async () => {
        // 0: Max Mustermann => Max Smith, 1: James Smith => Max Mustermann, 2: undefined => James Smith
        // => Resetting to before change set should create a change with { firstName: James }.
        // Smith should be ignored because it was already changed back afterwards in 0.
        await testRepository.resetSingleChangeSet(finishedTE, changeSets[1]);
        const resetChangeSets: ChangeSet[] = (await testRepository.changeSets(finishedTE.id)
            .find({ include: ['changes'], order: ['createdAt DESC'] }))
            .filter(cs => cs.type === ChangeSetType.RESET);
        changeSets = await testRepository.changeSets(finishedTE.id).find({ include: ['changes'], order: ['createdAt DESC'] });

        expect(changeSets.length).to.equal(3);
        expect(resetChangeSets.length).to.equal(1);
        expect(resetChangeSets[0].type).to.equal(ChangeSetType.RESET);
        expect(resetChangeSets[0].changes.length).to.equal(1);
        expect(resetChangeSets[0].changes[0].key).to.equal('firstName');
        expect(resetChangeSets[0].changes[0].previousValue).to.equal('Max');
        expect(resetChangeSets[0].changes[0].newValue).to.equal('James');
    });

    it('should rollback to a specific change set', async () => {
        // 0: Max Mustermann => Max Smith, 1: James Smith => Max Mustermann, 2: undefined => James Smith
        // => Rolling back to before change set should create a change with { firstName; 'James' }.
        // Smith should be ignored because it was already set on creation on 2.
        await testRepository.rollbackToChangeSet(finishedTE, changeSets[2]);
        const resetChangeSets: ChangeSet[] = (await testRepository.changeSets(finishedTE.id)
            .find({ include: ['changes'], order: ['createdAt DESC'] }))
            .filter(cs => cs.type === ChangeSetType.RESET);
        changeSets = await testRepository.changeSets(finishedTE.id).find({ include: ['changes'], order: ['createdAt DESC'] });
        finishedTE = await testRepository.findById(finishedTE.id);

        expect(changeSets.length).to.equal(2);
        expect(resetChangeSets.length).to.equal(1);
        expect(resetChangeSets[0].type).to.equal(ChangeSetType.RESET);
        expect(resetChangeSets[0].changes.length).to.equal(1);

        const firstNameChange: Change = resetChangeSets[0].changes.find(c => c.key === 'firstName') as Change;
        expect(firstNameChange.previousValue).to.equal('Max');
        expect(firstNameChange.newValue).to.equal('James');
    });

    it('should rollback to a specific date', async () => {
        // 0: Max Mustermann => Max Smith, 1: James Smith => Max Mustermann, 2: undefined => James Smith
        // => Rolling back to before change set should create a change with { firstName; 'James' }.
        // Smith should be ignored because it was already set on creation on 2.
        await testRepository.rollbackToDate(finishedTE, changeSets[2].createdAt);
        const resetChangeSets: ChangeSet[] = (await testRepository.changeSets(finishedTE.id)
            .find({ include: ['changes'], order: ['createdAt DESC'] }))
            .filter(cs => cs.type === ChangeSetType.RESET);
        changeSets = await testRepository.changeSets(finishedTE.id).find({ include: ['changes'], order: ['createdAt DESC'] });
        finishedTE = await testRepository.findById(finishedTE.id);

        expect(changeSets.length).to.equal(2);
        expect(resetChangeSets.length).to.equal(1);
        expect(resetChangeSets[0].type).to.equal(ChangeSetType.RESET);
        expect(resetChangeSets[0].changes.length).to.equal(1);

        const firstNameChange: Change = resetChangeSets[0].changes.find(c => c.key === 'firstName') as Change;
        expect(firstNameChange.previousValue).to.equal('Max');
        expect(firstNameChange.newValue).to.equal('James');
    });

    it('should rollback all to a specific date', async () => {
        let finishedTE2: TestChangeSetEntity = await testRepository.create(tE2);
        await testRepository.updateById(finishedTE2.id, { firstName: 'Max', lastName: 'Mustermann' });
        await testRepository.updateById(finishedTE2.id, { lastName: 'Smith' });
        finishedTE2 = await testRepository.findById(finishedTE2.id);
        // 0: Max Mustermann => Max Smith, 1: James Smith => Max Mustermann, 2: undefined => James Smith
        // => Rolling back to before change set should create a change with { firstName; 'James' }.
        // Smith should be ignored because it was already set on creation on 2.
        await testRepository.rollbackAllToDate(changeSets[2].createdAt);

        const resetChangeSets: ChangeSet[] = (await testRepository.changeSets(finishedTE.id)
            .find({ include: ['changes'], order: ['createdAt DESC'] }))
            .filter(cs => cs.type === ChangeSetType.RESET);
        changeSets = await testRepository.changeSets(finishedTE.id).find({ include: ['changes'], order: ['createdAt DESC'] });
        finishedTE = await testRepository.findById(finishedTE.id);

        expect(changeSets.length).to.equal(2);
        expect(resetChangeSets.length).to.equal(1);
        expect(resetChangeSets[0].type).to.equal(ChangeSetType.RESET);
        expect(resetChangeSets[0].changes.length).to.equal(1);

        const firstNameChange: Change = resetChangeSets[0].changes.find(c => c.key === 'firstName') as Change;
        expect(firstNameChange.previousValue).to.equal('Max');
        expect(firstNameChange.newValue).to.equal('James');

        const resetChangeSets2: ChangeSet[] = (await testRepository.changeSets(finishedTE2.id)
            .find({ include: ['changes'], order: ['createdAt DESC'] }))
            .filter(cs => cs.type === ChangeSetType.RESET);
        const changeSets2: ChangeSet[] = await testRepository.changeSets(finishedTE2.id).find({ include: ['changes'], order: ['createdAt DESC'] });
        finishedTE2 = await testRepository.findById(finishedTE2.id);

        expect(changeSets2.length).to.equal(2);
        expect(resetChangeSets2.length).to.equal(1);
        expect(resetChangeSets2[0].type).to.equal(ChangeSetType.RESET);
        expect(resetChangeSets2[0].changes.length).to.equal(1);

        const firstNameChange2: Change = resetChangeSets2[0].changes.find(c => c.key === 'firstName') as Change;
        expect(firstNameChange2.previousValue).to.equal('Max');
        expect(firstNameChange2.newValue).to.equal('Jane');
    });
});