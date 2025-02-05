import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { HttpHeaders } from '@angular/common/http'
import { TranslateService } from '@ngx-translate/core'
import { FileSelectEvent } from 'primeng/fileupload'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { ConfigExportImportAPIService, WelcomeSnapshot } from 'src/app/shared/generated'

@Component({
  selector: 'app-welcome-import',
  templateUrl: './welcome-import.component.html',
  styleUrls: ['./welcome-import.component.scss']
})
export class WelcomeImportComponent implements OnInit {
  @Input() workspaceName: string | undefined
  @Input() displayDialog = false
  @Output() public importEmitter = new EventEmitter<boolean>()

  public importError = false
  public httpHeaders!: HttpHeaders
  private config: WelcomeSnapshot | undefined

  constructor(
    private readonly eximApi: ConfigExportImportAPIService,
    private readonly translate: TranslateService,
    private readonly msgService: PortalMessageService
  ) {}

  public ngOnInit(): void {
    this.httpHeaders = new HttpHeaders()
    this.httpHeaders.set('Content-Type', 'application/json')
  }

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
    this.importEmitter.emit()
    if (this.workspaceName && this.config) {
      this.eximApi
        .importConfiguration({
          workspaceName: this.workspaceName,
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
