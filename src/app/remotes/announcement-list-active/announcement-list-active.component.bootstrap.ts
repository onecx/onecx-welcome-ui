import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { importProvidersFrom } from '@angular/core'
import { OneCXAnnouncementListActiveComponent } from './announcement-list-active.component'
import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'
import { AngularAuthModule } from '@onecx/angular-auth'
import { environment } from 'src/environments/environment'

bootstrapRemoteComponent(
  OneCXAnnouncementListActiveComponent,
  'ocx-announcement-banner-component',
  environment.production,
  [provideHttpClient(withInterceptorsFromDi()), importProvidersFrom(AngularAuthModule)]
)
