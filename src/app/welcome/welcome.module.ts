import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'

import { addInitializeModuleGuard, InitializeModuleGuard, PortalCoreModule } from '@onecx/portal-integration-angular'
import { SharedModule } from '../shared/shared.module'

import { WelcomeOverviewComponent } from './welcome-detail/welcome-overview.component'
import { WelcomeEditComponent } from './welcome-edit/welcome-edit.component'
import { CardModule } from 'primeng/card'
import { ImageDialogComponent } from './welcome-edit/image-dialog/image-dialog.component'
import { FileUploadModule } from 'primeng/fileupload'

const routes: Routes = [
  {
    path: '',
    component: WelcomeOverviewComponent,
    pathMatch: 'full'
  },
  {
    path: 'edit',
    component: WelcomeEditComponent,
    pathMatch: 'full'
  }
]
@NgModule({
  declarations: [WelcomeOverviewComponent, WelcomeEditComponent, ImageDialogComponent],
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
