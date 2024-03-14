import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core'
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidatorFn } from '@angular/forms'

import { Action, PortalMessageService } from '@onecx/portal-integration-angular'
import { ImageInfo, ImagesInternalAPIService } from 'src/app/shared/generated'

@Component({
  selector: 'app-image-dialog',
  templateUrl: './image-dialog.component.html',
  styleUrls: ['./image-dialog.component.scss']
})
export class ImageDialogComponent implements OnInit {
  @Input() public displayDetailDialog = false
  @Input() public imageInfoCount: number = 0
  @Output() public hideDialogAndChanged = new EventEmitter<boolean>()
  @ViewChild('fileUpload', { static: true }) fileUpload: any

  actions: Action[] = []
  public isLoading = false
  formGroup: FormGroup
  autoResize!: boolean
  selectedFile: any
  uploadDisabled: boolean = false

  constructor(
    private imageApiService: ImagesInternalAPIService,
    private fb: FormBuilder,
    private msgService: PortalMessageService
  ) {
    this.formGroup = fb.nonNullable.group({
      id: new FormControl(null),
      imageId: new FormControl(null),
      modificationCount: new FormControl(null),
      url: new FormControl(null, this.imageSrcValidator()),
      image: new FormControl(null),
      visible: new FormControl(false)
    })
    this.autoResize = true
  }

  ngOnInit() {
    this.formGroup.get('url')?.valueChanges.subscribe((v) => {
      v !== null && v !== '' ? (this.uploadDisabled = true) : (this.uploadDisabled = false)
    })
  }
  public onDialogHide() {
    this.displayDetailDialog = false
    this.hideDialogAndChanged.emit(false)
  }
  imageSrcValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null =>
      control.value !== null && control.value != '' ? null : { srcMissing: 'image src missing' }
  }

  public onSave(): void {
    if (this.formGroup.valid) {
      this.formGroup.get('modificationCount')?.setValue(0)
      let imageInfo = this.submitFormValues() as ImageInfo
      imageInfo.position = (this.imageInfoCount + 1).toString()
      this.imageApiService
        .createImageInfo({
          imageInfo: imageInfo
        })
        .subscribe({
          next: (data) => {
            if (this.selectedFile !== undefined) {
              this.imageApiService
                .createImage({
                  contentLength: 0,
                  body: this.selectedFile
                })
                .subscribe({
                  next: (createdImage) => {
                    this.formGroup.get('imageId')?.setValue(createdImage.imageId)
                    this.formGroup.get('modificationCount')?.setValue(data.modificationCount)
                    let imageInfo = this.submitFormValues() as ImageInfo
                    imageInfo.position = (this.imageInfoCount + 1).toString()
                    this.imageApiService
                      .updateImageInfo({
                        id: data.id!,
                        imageInfo: imageInfo
                      })
                      .subscribe({
                        next: () => {
                          this.msgService.success({ summaryKey: 'ACTIONS.CREATE.SUCCESS' })
                          this.hideDialogAndChanged.emit(true)
                          this.selectedFile = undefined
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

  public handleFileSelected(selectedFile: any) {
    this.selectedFile = selectedFile
    this.formGroup.controls['url'].disable()
  }

  private submitFormValues(): any {
    const imageInfo: ImageInfo = { ...this.formGroup.value }
    return imageInfo
  }
}
