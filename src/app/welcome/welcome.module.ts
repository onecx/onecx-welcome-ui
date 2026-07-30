import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'

import { providePermissionService } from '@onecx/angular-utils'

import { LabelResolver } from 'src/app/shared/label.resolver'

import { WelcomeOverviewComponent } from './welcome-overview/welcome-overview.component'
import { WelcomeConfigureComponent } from './welcome-configure/welcome-configure.component'

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
  providers: [...providePermissionService()]
})
export class WelcomeModule {}
