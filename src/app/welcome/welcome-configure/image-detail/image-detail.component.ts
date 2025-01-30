import { Component, ElementRef, EventEmitter, Input, Output, OnChanges, ViewChild } from '@angular/core'
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
  @Output() public hideDialogAndChanged = new EventEmitter<boolean>()

  @ViewChild('detailImage') detailImage: ElementRef<HTMLImageElement> = {} as ElementRef

  public isLoading = false
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
    // fill form - use default values if values are not yet set
    this.formGroup.patchValue({
      objectFit: this.imageInfos[this.imageIndex].objectFit ?? 'scale-down',
      objectPosition: this.imageInfos[this.imageIndex].objectPosition ?? 'center center',
      backgroundColor: this.imageInfos[this.imageIndex].backgroundColor ?? 'unset'
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
    this.hideDialogAndChanged.emit(false)
  }

  public onSave() {
    const ii = { ...this.imageInfos[this.imageIndex], ...this.formGroup.value }
    this.imageApi.updateImageInfo({ id: ii.id, imageInfo: ii }).subscribe({
      next: (data) => {
        this.imageInfos[this.imageIndex] = data
        this.msgService.success({ summaryKey: 'ACTIONS.SAVE.MESSAGE_OK' })
        this.hideDialogAndChanged.emit(true)
      },
      error: (err) => {
        this.msgService.error({ summaryKey: 'ACTIONS.SAVE.MESSAGE_NOK' })
        console.error('updateImageById', err)
      }
    })
  }
}
