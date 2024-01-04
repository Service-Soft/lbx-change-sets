import { service } from '@loopback/core';
import { Model, model, property, repository } from '@loopback/repository';
import { del, get, getModelSchemaRef, param, patch, post, put, requestBody } from '@loopback/rest';
import { TestChangeSetEntity } from '../models';
import { TestChangeSetEntityRepository } from '../repositories';
import { BackupService } from '../services';

@model()
class RollbackModel extends Model {
    @property({
        required: true,
        type: 'date'
    })
    date: Date;

    constructor(data?: Partial<RollbackModel>) {
        super(data);
    }
}

export class TestController {
    constructor(
        @repository(TestChangeSetEntityRepository)
        public testRepository: TestChangeSetEntityRepository,
        @service(BackupService)
        private readonly backupService: BackupService
    ) {}

    @post('/create-backup')
    async createBackup(): Promise<void> {
        await this.backupService.createBackup();
    }

    @post('/restore-backup')
    async restoreBackup(
        @requestBody()
        date: Date
    ): Promise<void> {
        await this.backupService.restoreBackupFromDate(date);
    }

    @post('/test')
    async create(
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(TestChangeSetEntity, { exclude: ['id'] })
                }
            }
        })
        testChangeSetEntity: Omit<TestChangeSetEntity, 'id'>
    ): Promise<TestChangeSetEntity> {
        return this.testRepository.create(testChangeSetEntity);
    }

    @post('/test/{id}/rollback')
    async rollback(
        @param.path.string('id')
        id: string,
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(RollbackModel)
                }
            }
        })
        date: { date: Date }
    ): Promise<TestChangeSetEntity> {
        return this.testRepository.rollbackToDateById(id, date.date);
    }

    @get('/test')
    async find(): Promise<TestChangeSetEntity[]> {
        return this.testRepository.find({ include: [{ relation: 'changeSets', scope: { include: ['changes'] } }] });
    }

    @patch('/test/{id}')
    async updateById(
        @param.path.string('id')
        id: string,
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(TestChangeSetEntity, { partial: true, exclude: ['id'] })
                }
            }
        })
        testChangeSetEntity: TestChangeSetEntity
    ): Promise<void> {
        await this.testRepository.updateById(id, testChangeSetEntity);
    }

    @put('/test/{id}')
    async replaceById(
        @param.path.string('id') id: string,
        @requestBody() testChangeSetEntity: TestChangeSetEntity
    ): Promise<void> {
        await this.testRepository.replaceById(id, testChangeSetEntity);
    }

    @del('/test/{id}')
    async deleteById(
        @param.path.string('id')
        id: string
    ): Promise<void> {
        await this.testRepository.deleteById(id);
    }
}