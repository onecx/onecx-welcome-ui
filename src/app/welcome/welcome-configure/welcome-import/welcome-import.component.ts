import { Component, inject, input, model, output } from '@angular/core'
import { HttpHeaders } from '@angular/common/http'
import { TranslateModule, TranslateService } from '@ngx-translate/core'

import { ButtonModule } from 'primeng/button'
import { DialogModule } from 'primeng/dialog'
import { FileSelectEvent, FileUploadModule } from 'primeng/fileupload'
import { MessageModule } from 'primeng/message'
import { TooltipModule } from 'primeng/tooltip'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { ConfigExportImportAPIService, WelcomeSnapshot } from 'src/app/shared/generated'

@Component({
  selector: 'app-welcome-import',
  standalone: true,
  imports: [TranslateModule, ButtonModule, DialogModule, FileUploadModule, MessageModule, TooltipModule],
  templateUrl: './welcome-import.component.html',
  styleUrl: './welcome-import.component.scss'
})
export class WelcomeImportComponent {
  private readonly eximApi = inject(ConfigExportImportAPIService)
  private readonly translate = inject(TranslateService)
  private readonly msgService = inject(PortalMessageService)

  public readonly workspaceName = input<string | undefined>(undefined)
  public readonly displayDialog = model<boolean>(false)
  public readonly importEmitter = output<boolean>()

  public importError = false
  public httpHeaders = new HttpHeaders({ 'Content-Type': 'application/json' })
  private config: WelcomeSnapshot | undefined

  public onClose(imported: boolean): void {
    this.importEmitter.emit(imported)
  }
  public onImportClear(): void {
    this.config = undefined
    this.importError = false
  }
  public onImportSelect(event: FileSelectEvent): void {
    event.files[0].text().then((text) => {
      this.config = undefined
      this.importError = false
      try {
        const config: WelcomeSnapshot = JSON.parse(text) as WelcomeSnapshot
        if (this.isImportRequestDTO(config)) {
          this.config = config
        } else {
          console.error('imported welcome configuration parse error', config)
          this.config = undefined
          this.importError = true
        }
      } catch (err) {
        console.error('imported welcome configuration parse error', err)
        this.importError = true
      }
    })
  }
  private isImportRequestDTO(obj: unknown): obj is WelcomeSnapshot {
    const dto = obj as WelcomeSnapshot
    return !!(typeof dto === 'object' && dto?.config?.images?.length)
  }

  public onImportConfirmation(): void {
    this.importEmitter.emit(false)
    if (this.workspaceName() && this.config) {
      this.eximApi
        .importConfiguration({
          workspaceName: this.workspaceName()!,
          welcomeSnapshot: this.config
        })
        .subscribe({
          next: () => {
            this.msgService.success({ summaryKey: 'ACTIONS.IMPORT.MESSAGE_OK' })
            this.onClose(true)
          },
          error: (err) => {
            this.msgService.error({ summaryKey: 'ACTIONS.IMPORT.MESSAGE_NOK' })
            console.error('importConfiguration', err)
          }
        })
    }
  }
}
