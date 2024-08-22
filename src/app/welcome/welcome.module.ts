import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { CardModule } from 'primeng/card'
import { FileUploadModule } from 'primeng/fileupload'

import { addInitializeModuleGuard, InitializeModuleGuard, PortalCoreModule } from '@onecx/portal-integration-angular'
import { SharedModule } from '../shared/shared.module'

import { WelcomeOverviewComponent } from './welcome-overview/welcome-overview.component'
import { WelcomeConfigureComponent } from './welcome-configure/welcome-configure.component'
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
  declarations: [WelcomeOverviewComponent, WelcomeConfigureComponent, ImageCreateComponent, ImageDetailComponent],
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    FileUploadModule,
    PortalCoreModule.forMicroFrontend(),
    [RouterModule.forChild(addInitializeModuleGuard(routes))],
    SharedModule
  ],
  providers: [InitializeModuleGuard],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class WelcomeModule {
  constructor() {
    console.info('Welcome Module constructor')
  }
}
