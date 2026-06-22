import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core'
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidatorFn } from '@angular/forms'
import { filter, take } from 'rxjs'
import { FileUpload } from 'primeng/fileupload'

import { AppStateService, PortalMessageService } from '@onecx/angular-integration-interface'

import { ImageInfo, ImagesInternalAPIService } from 'src/app/shared/generated'

@Component({
  standalone: false,
  selector: 'app-image-create',
  templateUrl: './image-create.component.html',
  styleUrls: ['./image-create.component.scss']
})
export class ImageCreateComponent implements OnInit, OnChanges {
  @Input() public displayCreateDialog = false
  @Input() public imageInfoCount: number = 0
  @Output() public hideDialogAndChanged = new EventEmitter<boolean>()

  @ViewChild('fileUpload', { static: true }) fileUpload?: FileUpload

  public isLoading = false
  formGroup: FormGroup
  selectedFile?: Blob
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
    this.appstateService.currentWorkspace$
      .pipe(
        filter((ws) => !!ws?.workspaceName),
        take(1)
      )
      .subscribe((ws) => (this.currentWorkspaceName = ws?.workspaceName || ''))
  }

  ngOnInit(): void {
    this.formGroup.get('url')?.valueChanges.subscribe((v) => {
      this.uploadDisabled = v !== null && v !== ''
    })
  }

  ngOnChanges(): void {
    this.formGroup.get('url')?.reset()
    this.uploadDisabled = false
    this.onFileRemoval()
  }

  private imageSrcValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null =>
      control.value !== null && control.value != '' ? null : { srcMissing: 'image src missing' }
  }

  public onDialogHide(): void {
    this.displayCreateDialog = false
    this.hideDialogAndChanged.emit(false)
  }

  public onSave(): void {
    if (this.formGroup.valid) {
      if (!this.currentWorkspaceName) {
        this.msgService.error({ summaryKey: 'ACTIONS.CREATE.ERROR' })
        return
      }

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
            if (this.selectedFile == undefined) {
              this.msgService.success({ summaryKey: 'ACTIONS.CREATE.SUCCESS' })
              this.formGroup.controls['url'].reset()
              this.hideDialogAndChanged.emit(true)
            } else {
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
                          this.onFileRemoval()
                        },
                        error: (err) => {
                          this.msgService.error({ summaryKey: 'ACTIONS.CREATE.ERROR' })
                          console.error('updateImageInfo', err)
                        }
                      })
                  },
                  error: (err) => {
                    this.msgService.error({ summaryKey: 'ACTIONS.CREATE.ERROR' })
                    console.error('createImage', err)
                  }
                })
            }
          },
          error: () => this.msgService.error({ summaryKey: 'ACTIONS.CREATE.ERROR' })
        })
    }
  }

  public onFileSelected(selectedFile: Blob | undefined): void {
    if (!selectedFile) {
      this.onFileRemoval()
      return
    }

    this.selectedFile = selectedFile
    this.formGroup.controls['url'].disable()
  }

  public onFileRemoval() {
    this.formGroup.controls['url'].enable()
    this.selectedFile = undefined

    if (this.fileUpload?.files?.length && typeof this.fileUpload.clear === 'function') {
      this.fileUpload.clear()
    }
  }

  private submitFormValues(): any {
    const imageInfo: ImageInfo = { ...this.formGroup.value }
    return imageInfo
  }
}
