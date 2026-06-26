import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { RouterModule, Routes } from '@angular/router'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'

import { AngularAuthModule } from '@onecx/angular-auth'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import {
  createTranslateLoader,
  provideAngularUtils,
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
  bootstrap: [AppComponent],
  imports: [
    AppComponent,
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    AngularAuthModule,
    AngularAcceleratorModule,
    StandaloneShellModule,
    RouterModule.forRoot(routes, {
      initialNavigation: 'enabledBlocking',
      enableTracing: true
    }),
    TranslateModule.forRoot({
      isolate: true,
      loader: { provide: TranslateLoader, useFactory: createTranslateLoader, deps: [HttpClient] }
    })
  ],
  providers: [
    provideAnimations(),
    provideAngularUtils(),
    provideTranslationConnectionService(),
    { provide: APP_CONFIG, useValue: environment },
    provideStandaloneProviders(),
    provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/'),
    provideHttpClient(withInterceptorsFromDi())
  ]
})
export class AppModule {
  constructor() {
    console.info('OneCX Welcome Module constructor')
  }
}
