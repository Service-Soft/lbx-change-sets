/* eslint-disable @typescript-eslint/no-namespace */
import { BindingKey, CoreBindings } from '@loopback/core';
import { LbxChangeSetsComponent } from './component';

/**
 * Binding keys used by this component.
 */
export namespace LbxChangeSetsBindings {
    export const COMPONENT: BindingKey<LbxChangeSetsComponent> = BindingKey.create<LbxChangeSetsComponent>(
        `${CoreBindings.COMPONENTS}.LbxChangeSetsComponent`
    );
    /**
     * The key of the datasource.
     */
    export const DATASOURCE_KEY: string = 'datasources.db';
}