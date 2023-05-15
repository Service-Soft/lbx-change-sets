# lbx-change-sets

[![LoopBack](https://github.com/loopbackio/loopback-next/raw/master/docs/site/imgs/branding/Powered-by-LoopBack-Badge-(blue)-@2x.png)](http://loopback.io/)

## Installation

Install LbxChangeSetsComponent using `npm`;

```sh
$ [npm install | yarn add] lbx-change-sets
```

## Basic Use

Configure and load LbxChangeSetsComponent in the application constructor
as shown below.

```ts
import {LbxChangeSetsComponent, LbxChangeSetsComponentOptions, DEFAULT_LBX_CHANGE_SETS_OPTIONS} from 'lbx-change-sets';
// ...
export class MyApplication extends BootMixin(ServiceMixin(RepositoryMixin(RestApplication))) {
  constructor(options: ApplicationConfig = {}) {
    const opts: LbxChangeSetsComponentOptions = DEFAULT_LBX_CHANGE_SETS_OPTIONS;
    this.configure(LbxChangeSetsComponentBindings.COMPONENT).to(opts);
      // Put the configuration options here
    });
    this.component(LbxChangeSetsComponent);
    // ...
  }
  // ...
}
```