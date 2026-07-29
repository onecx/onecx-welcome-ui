import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app-entrypoint.component.html'
})
export class AppEntrypointComponent {}
