import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'

import { addInitializeModuleGuard, InitializeModuleGuard, PortalCoreModule } from '@onecx/portal-integration-angular'
import { SharedModule } from '../shared/shared.module'

import { WelcomeDetailComponent } from './welcome-detail/welcome-detail.component'

const routes: Routes = [
  {
    path: '',
    component: WelcomeDetailomponent,
    pathMatch: 'full'
  }
]
@NgModule({
  declarations: [WelcomeDetailComponent],
  imports: [
    CommonModule,
    FormsModule,
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
