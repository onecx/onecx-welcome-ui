import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'

import { PortalApiConfiguration, providePermissionService } from '@onecx/angular-utils'
import { AppStateService, ConfigurationService } from '@onecx/angular-integration-interface'

import { LabelResolver } from 'src/app/shared/label.resolver'

import { WelcomeOverviewComponent } from './welcome-overview/welcome-overview.component'
import { WelcomeConfigureComponent } from './welcome-configure/welcome-configure.component'

import { Configuration } from '../shared/generated'
import { environment } from 'src/environments/environment.prod'

function apiConfigProvider() {
  return new PortalApiConfiguration(Configuration, environment.apiPrefix)
}

const routes: Routes = [
  {
    path: '',
    component: WelcomeOverviewComponent,
    pathMatch: 'full'
  },
  {
    path: 'configure',
    component: WelcomeConfigureComponent,
    pathMatch: 'full',
    data: {
      breadcrumb: 'BREADCRUMBS.CONFIGURE',
      breadcrumbFn: (data: any) => `${data.labeli18n}`
    },
    resolve: {
      labeli18n: LabelResolver
    }
  }
]
@NgModule({
  imports: [[RouterModule.forChild(routes)], WelcomeOverviewComponent, WelcomeConfigureComponent],
  providers: [
    ...providePermissionService(),
    { provide: Configuration, useFactory: apiConfigProvider, deps: [ConfigurationService, AppStateService] }
  ]
})
export class WelcomeModule {}
