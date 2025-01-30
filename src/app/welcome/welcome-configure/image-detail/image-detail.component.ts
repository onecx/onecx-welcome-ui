import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core'
import { FormGroup, FormControl, Validators } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { ImageDataResponse, ImageInfo, ImagesInternalAPIService, ObjectFit } from 'src/app/shared/generated'

@Component({
  selector: 'app-image-detail',
  templateUrl: './image-detail.component.html',
  styleUrls: ['./image-detail.component.scss']
})
export class ImageDetailComponent implements OnChanges {
  @Input() public displayDetailDialog = false
  @Input() public imageInfoCount: number = 0
  @Input() public images: ImageDataResponse[] = []
  @Input() public imageInfos: ImageInfo[] = []
  @Input() public imageIndex = 0
  @Output() public closeDialog = new EventEmitter<boolean>() // true on image changes

  public isLoading = false
  public isChanged = false
  public formGroup: FormGroup
  public objectFitOptions = [ObjectFit.None, ObjectFit.Contain, ObjectFit.Cover, ObjectFit.Fill, ObjectFit.ScaleDown]

  constructor(
    private readonly imageApi: ImagesInternalAPIService,
    private readonly translate: TranslateService,
    private readonly msgService: PortalMessageService
  ) {
    this.formGroup = new FormGroup({
      objectFit: new FormControl(null),
      objectPosition: new FormControl(null, [Validators.minLength(2), Validators.maxLength(50)]),
      backgroundColor: new FormControl(null, [Validators.minLength(3), Validators.maxLength(100)])
    })
  }

  public ngOnChanges(): void {
    this.fillForm(this.imageIndex)
  }

  // fill form - use default values if values are not yet set
  private fillForm(idx: number): void {
    this.formGroup.patchValue({
      objectFit: this.imageInfos[idx].objectFit ?? 'scale-down',
      objectPosition: this.imageInfos[idx].objectPosition ?? 'center center',
      backgroundColor: this.imageInfos[idx].backgroundColor ?? 'unset'
    })
  }

  // if image data was captured before then use this data
  // otherwise use the image url
  public buildImageSrc(imageInfo: ImageInfo, images: ImageDataResponse[]): string | undefined {
    if (!imageInfo) return undefined
    const currentImage = images.find((image) => {
      return image.imageId === imageInfo.imageId
    })
    return currentImage ? 'data:' + currentImage.mimeType + ';base64,' + currentImage.imageData : imageInfo.url
  }

  public onDialogHide() {
    this.closeDialog.emit(this.isChanged)
  }

  public onSave() {
    const ii = { ...this.imageInfos[this.imageIndex], ...this.formGroup.value }
    this.imageApi.updateImageInfo({ id: ii.id, imageInfo: ii }).subscribe({
      next: (data) => {
        this.imageInfos[this.imageIndex] = data
        this.msgService.success({ summaryKey: 'ACTIONS.SAVE.MESSAGE_OK' })
        this.isChanged = true
      },
      error: (err) => {
        this.msgService.error({ summaryKey: 'ACTIONS.SAVE.MESSAGE_NOK' })
        console.error('updateImageById', err)
      }
    })
  }

  public onGoToImage(newIdx: number) {
    if (newIdx === this.imageInfos.length) this.imageIndex = 0
    else if (newIdx === -1) this.imageIndex = this.imageInfos.length - 1
    else this.imageIndex = newIdx
    this.fillForm(this.imageIndex)
  }
}
