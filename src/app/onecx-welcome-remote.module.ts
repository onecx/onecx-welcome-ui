import { DoBootstrap, Injector, NgModule, inject, provideAppInitializer } from '@angular/core'
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations'
import { RouterModule, Routes, Router } from '@angular/router'
import { TranslateLoader, TranslateModule, MissingTranslationHandler } from '@ngx-translate/core'

import { AngularAcceleratorModule, AngularAcceleratorMissingTranslationHandler } from '@onecx/angular-accelerator'
import { AngularAuthModule } from '@onecx/angular-auth'
import {
  PortalApiConfiguration,
  createTranslateLoader,
  provideAngularUtils,
  provideTranslationConnectionService,
  provideTranslationPathFromMeta,
  provideThemeConfig
} from '@onecx/angular-utils'
import { createAppEntrypoint, initializeRouter, startsWith } from '@onecx/angular-webcomponents'
import { AppStateService, ConfigurationService } from '@onecx/angular-integration-interface'
import { provideTranslateServiceForRoot, SLOT_SERVICE, SlotService } from '@onecx/angular-remote-components'

import { Configuration } from './shared/generated'
import { environment } from 'src/environments/environment'
import { AppEntrypointComponent } from './app-entrypoint.component'

function apiConfigProvider() {
  return new PortalApiConfiguration(Configuration, environment.apiPrefix)
}

const routes: Routes = [
  {
    matcher: startsWith(''),
    loadChildren: () => import('./welcome/welcome.module').then((m) => m.WelcomeModule)
  }
]
@NgModule({
  declarations: [AppEntrypointComponent],
  imports: [
    AngularAuthModule,
    BrowserModule,
    BrowserAnimationsModule,
    AngularAcceleratorModule,
    RouterModule.forRoot(routes),
    TranslateModule
  ],
  providers: [
    provideAnimations(),
    provideAngularUtils(),
    provideTranslationConnectionService(),
    ConfigurationService,
    { provide: Configuration, useFactory: apiConfigProvider },
    { provide: SLOT_SERVICE, useExisting: SlotService },
    provideAppInitializer(() => initializeRouter(inject(Router), inject(AppStateService))()),
    provideThemeConfig(),
    provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/'),
    provideTranslateServiceForRoot({
      isolate: true,
      loader: { provide: TranslateLoader, useFactory: createTranslateLoader, deps: [HttpClient] },
      missingTranslationHandler: {
        provide: MissingTranslationHandler,
        useClass: AngularAcceleratorMissingTranslationHandler
      }
    }),
    provideHttpClient(withInterceptorsFromDi())
  ]
})
export class OneCXWelcomeModule implements DoBootstrap {
  constructor(private readonly injector: Injector) {
    console.info('OneCX Welcome Module constructor')
  }

  ngDoBootstrap(): void {
    createAppEntrypoint(AppEntrypointComponent, 'ocx-welcome-component', this.injector)
  }
}
