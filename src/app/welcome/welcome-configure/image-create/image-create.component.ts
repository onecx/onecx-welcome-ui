import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core'
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidatorFn } from '@angular/forms'

import { Action, AppStateService, PortalMessageService } from '@onecx/portal-integration-angular'
import { ImageInfo, ImagesInternalAPIService } from 'src/app/shared/generated'

@Component({
  selector: 'app-image-create',
  templateUrl: './image-create.component.html',
  styleUrls: ['./image-create.component.scss']
})
export class ImageCreateComponent implements OnInit {
  @Input() public displayCreateDialog = false
  @Input() public imageInfoCount: number = 0
  @Output() public hideDialogAndChanged = new EventEmitter<boolean>()
  @ViewChild('fileUpload', { static: true }) fileUpload: any

  actions: Action[] = []
  public isLoading = false
  formGroup: FormGroup
  autoResize!: boolean
  selectedFile: any
  uploadDisabled: boolean = false
  currentWorkspaceName: string = ''

  constructor(
    private readonly imageApiService: ImagesInternalAPIService,
    private readonly fb: FormBuilder,
    private readonly msgService: PortalMessageService,
    private readonly appstateService: AppStateService
  ) {
    this.formGroup = fb.nonNullable.group({
      url: new FormControl(null, this.imageSrcValidator()),
      image: new FormControl(null)
    })
    this.autoResize = true
    this.currentWorkspaceName = this.appstateService.currentWorkspace$.getValue()?.portalName || ''
  }

  ngOnInit() {
    this.formGroup.get('url')?.valueChanges.subscribe((v) => {
      v !== null && v !== '' ? this.disableUpload(true) : this.disableUpload(false)
    })
  }
  disableUpload(disable: boolean) {
    this.uploadDisabled = disable
  }
  public onDialogHide() {
    this.displayCreateDialog = false
    this.hideDialogAndChanged.emit(false)
  }
  imageSrcValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null =>
      control.value !== null && control.value != '' ? null : { srcMissing: 'image src missing' }
  }

  public onSave(): void {
    if (this.formGroup.valid) {
      const imageInfo = this.submitFormValues() as ImageInfo
      imageInfo.modificationCount = 0
      imageInfo.position = (this.imageInfoCount + 1).toString()
      imageInfo.workspaceName = this.currentWorkspaceName
      this.imageApiService
        .createImageInfo({
          imageInfo: imageInfo
        })
        .subscribe({
          next: (data) => {
            if (this.selectedFile !== undefined) {
              this.imageApiService
                .createImage({
                  body: this.selectedFile
                })
                .subscribe({
                  next: (createdImage) => {
                    const imageInfo = this.submitFormValues() as ImageInfo
                    imageInfo.modificationCount = data.modificationCount
                    imageInfo.imageId = createdImage.imageId
                    imageInfo.position = (this.imageInfoCount + 1).toString()
                    imageInfo.visible = true
                    imageInfo.workspaceName = this.currentWorkspaceName
                    this.imageApiService
                      .updateImageInfo({
                        id: data.id!,
                        imageInfo: imageInfo
                      })
                      .subscribe({
                        next: () => {
                          this.msgService.success({ summaryKey: 'ACTIONS.CREATE.SUCCESS' })
                          this.hideDialogAndChanged.emit(true)
                          this.handleFileRemoval()
                          this.fileUpload.clear()
                        },
                        error: () => {
                          this.msgService.error({ summaryKey: 'ACTIONS.CREATE.ERROR' })
                        }
                      })
                  },
                  error: () => {
                    this.msgService.error({ summaryKey: 'ACTIONS.CREATE.ERROR' })
                  }
                })
            } else {
              this.msgService.success({ summaryKey: 'ACTIONS.CREATE.SUCCESS' })
              this.formGroup.controls['url'].reset()
              this.hideDialogAndChanged.emit(true)
            }
          },
          error: () => this.msgService.error({ summaryKey: 'ACTIONS.CREATE.ERROR' })
        })
    }
  }

  public handleFileSelected(selectedFile: Blob) {
    if (selectedFile.size < 1000000) {
      this.selectedFile = selectedFile
      this.formGroup.controls['url'].disable()
    }
  }

  public handleFileRemoval() {
    this.formGroup.controls['url'].enable()
    this.selectedFile = undefined
  }

  private submitFormValues(): any {
    const imageInfo: ImageInfo = { ...this.formGroup.value }
    return imageInfo
  }
}
