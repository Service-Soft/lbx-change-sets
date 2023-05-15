import { Application, Component, ContextTags, CoreBindings, config, inject, injectable } from '@loopback/core';
import { LbxChangeSetsBindings } from './keys';
import { DEFAULT_LBX_CHANGE_SETS_OPTIONS, LbxChangeSetsComponentOptions } from './types';

/**
 * Configure the binding for LbxChangeSetsComponent.
 */
@injectable({ tags: { [ContextTags.KEY]: LbxChangeSetsBindings.COMPONENT } })
export class LbxChangeSetsComponent implements Component {
    constructor(
        @inject(CoreBindings.APPLICATION_INSTANCE)
        private readonly application: Application,
        @config()
        private readonly options: LbxChangeSetsComponentOptions = DEFAULT_LBX_CHANGE_SETS_OPTIONS
    ) {}
}