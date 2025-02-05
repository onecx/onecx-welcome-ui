import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'

import { PortalCoreModule } from '@onecx/portal-integration-angular'
import { InitializeModuleGuard, addInitializeModuleGuard } from '@onecx/angular-integration-interface'

import { SharedModule } from '../shared/shared.module'
import { WelcomeOverviewComponent } from './welcome-overview/welcome-overview.component'
import { WelcomeConfigureComponent } from './welcome-configure/welcome-configure.component'
import { WelcomeImportComponent } from './welcome-configure/welcome-import/welcome-import.component'
import { ImageDetailComponent } from './welcome-configure/image-detail/image-detail.component'
import { ImageCreateComponent } from './welcome-configure/image-create/image-create.component'

const routes: Routes = [
  {
    path: '',
    component: WelcomeOverviewComponent,
    pathMatch: 'full'
  },
  {
    path: 'configure',
    component: WelcomeConfigureComponent,
    pathMatch: 'full'
  }
]
@NgModule({
  declarations: [
    WelcomeOverviewComponent,
    WelcomeConfigureComponent,
    WelcomeImportComponent,
    ImageCreateComponent,
    ImageDetailComponent
  ],
  imports: [
    PortalCoreModule.forMicroFrontend(),
    [RouterModule.forChild(addInitializeModuleGuard(routes))],
    SharedModule
  ],
  providers: [InitializeModuleGuard]
})
export class WelcomeModule {
  constructor() {
    console.info('Welcome Module constructor')
  }
}
