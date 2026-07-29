import { Component } from '@angular/core'
import { StandaloneShellModule } from '@onecx/angular-standalone-shell'

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [StandaloneShellModule],
  templateUrl: './app.component.html'
})
export class AppComponent {
  title = 'onecx-ui'
}
