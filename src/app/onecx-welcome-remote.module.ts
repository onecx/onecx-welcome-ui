import { DoBootstrap, Injector, NgModule, inject, provideAppInitializer } from '@angular/core'
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { RouterModule, Routes, Router } from '@angular/router'
import { TranslateLoader, TranslateModule, MissingTranslationHandler } from '@ngx-translate/core'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { AngularAuthModule } from '@onecx/angular-auth'
import {
  createTranslateLoader,
  MultiLanguageMissingTranslationHandler,
  PortalApiConfiguration,
  provideAngularUtils,
  provideThemeConfig,
  provideTranslationPathFromMeta
} from '@onecx/angular-utils'
import { createAppEntrypoint, initializeRouter, startsWith } from '@onecx/angular-webcomponents'
import { AppStateService, ConfigurationService } from '@onecx/angular-integration-interface'

import { Configuration } from './shared/generated'
import { LabelResolver } from './shared/label.resolver'
import { apiConfigProvider } from './shared/apiConfigProvider.utils'

import { AppEntrypointComponent } from './app-entrypoint.component'

const routes: Routes = [
  {
    matcher: startsWith(''),
    loadChildren: () => import('./welcome/welcome.module').then((m) => m.WelcomeModule)
  }
]
@NgModule({
  imports: [
    AppEntrypointComponent,
    AngularAcceleratorModule,
    AngularAuthModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(routes),
    TranslateModule.forRoot({
      isolate: true,
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      },
      missingTranslationHandler: {
        provide: MissingTranslationHandler,
        useClass: MultiLanguageMissingTranslationHandler
      }
    })
  ],
  providers: [
    LabelResolver,
    provideAngularUtils(),
    ConfigurationService,
    { provide: Configuration, useFactory: apiConfigProvider, deps: [ConfigurationService, AppStateService] },
    provideAppInitializer(() => {
      const initializerFn = initializeRouter(inject(Router), inject(AppStateService))
      return initializerFn()
    }),
    provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/'),
    provideHttpClient(withInterceptorsFromDi()),
    provideThemeConfig()
  ]
})
export class OneCXWelcomeModule implements DoBootstrap {
  private readonly injector = inject(Injector)

  ngDoBootstrap(): void {
    createAppEntrypoint(AppEntrypointComponent, 'ocx-welcome-component', this.injector)
  }
}
