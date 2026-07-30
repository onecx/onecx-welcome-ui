import { NgModule } from '@angular/core'
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations'
import { RouterModule, Routes } from '@angular/router'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'

import { AngularAuthModule } from '@onecx/angular-auth'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import {
  createTranslateLoader,
  provideTranslationConnectionService,
  provideTranslationPathFromMeta
} from '@onecx/angular-utils'
import { APP_CONFIG } from '@onecx/angular-integration-interface'
import { StandaloneShellModule, provideStandaloneProviders } from '@onecx/angular-standalone-shell'

import { environment } from 'src/environments/environment'
import { AppComponent } from './app.component'

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./welcome/welcome.module').then((m) => m.WelcomeModule)
  }
]
@NgModule({
  imports: [
    AppComponent,
    AngularAcceleratorModule,
    AngularAuthModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(routes, {
      initialNavigation: 'enabledBlocking',
      enableTracing: false
    }),
    StandaloneShellModule,
    TranslateModule.forRoot({
      isolate: true,
      loader: { provide: TranslateLoader, useFactory: createTranslateLoader, deps: [HttpClient] }
    })
  ],
  providers: [
    { provide: APP_CONFIG, useValue: environment },
    provideAnimations(),
    provideStandaloneProviders(),
    provideTranslationConnectionService(),
    provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/'),
    provideHttpClient(withInterceptorsFromDi())
  ]
})
export class AppModule {}
