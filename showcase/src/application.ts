import { BootMixin } from '@loopback/boot';
import { ApplicationConfig } from '@loopback/core';
import { RepositoryMixin } from '@loopback/repository';
import { RestApplication } from '@loopback/rest';
import { RestExplorerBindings, RestExplorerComponent } from '@loopback/rest-explorer';
import { ServiceMixin } from '@loopback/service-proxy';
import { ChangeRepository, ChangeSetRepository, LbxChangeSetsComponent } from 'lbx-change-sets';
import path from 'path';
import { MySequence } from './sequence';

export { ApplicationConfig };

// eslint-disable-next-line jsdoc/require-jsdoc
export class ShowcaseApplication extends BootMixin(ServiceMixin(RepositoryMixin(RestApplication))) {
    constructor(options: ApplicationConfig = {}) {
        super(options);

        // Set up the custom sequence
        this.sequence(MySequence);

        // Set up default home page
        this.static('/', path.join(__dirname, '../public'));

        // Customize @loopback/rest-explorer configuration here
        this.configure(RestExplorerBindings.COMPONENT).to({ path: '/explorer' });
        this.component(RestExplorerComponent);

        this.setupChangeSets();

        this.projectRoot = __dirname;
        // Customize @loopback/boot Booter Conventions here
        this.bootOptions = {
            controllers: {
                // Customize ControllerBooter Conventions here
                dirs: ['controllers'],
                extensions: ['.controller.js'],
                nested: true
            }
        };
    }

    private setupChangeSets(): void {
        this.component(LbxChangeSetsComponent);
        this.repository(ChangeRepository);
        this.repository(ChangeSetRepository);
    }
}