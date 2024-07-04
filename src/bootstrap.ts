import { bootstrapModule } from '@onecx/angular-webcomponents'
import { environment } from 'src/environments/environment'
import { OneCXWelcomeModule } from './app/onecx-welcome-remote.module'

bootstrapModule(OneCXWelcomeModule, 'microfrontend', environment.production)
