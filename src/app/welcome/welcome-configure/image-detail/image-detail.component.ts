import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core'
import { FormGroup, FormControl, Validators } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { ImageDataResponse, ImageInfo, ImagesInternalAPIService, ObjectFit } from 'src/app/shared/generated'

export interface ImageCssForm {
  objectFit: FormControl<string | null>
  objectPosition: FormControl<string | null>
  backgroundColor: FormControl<string | null>
}

@Component({
  selector: 'app-image-detail',
  templateUrl: './image-detail.component.html',
  styleUrls: ['./image-detail.component.scss']
})
export class ImageDetailComponent implements OnChanges {
  @Input() public displayDetailDialog = false
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
    this.formGroup = new FormGroup<ImageCssForm>({
      objectFit: new FormControl(ObjectFit.ScaleDown),
      objectPosition: new FormControl('center center', [Validators.minLength(2), Validators.maxLength(50)]),
      backgroundColor: new FormControl('unset', [Validators.minLength(3), Validators.maxLength(100)])
    })
  }

  public ngOnChanges(): void {
    this.fillForm()
  }

  // fill form - use default values if values are not yet set
  private fillForm(): void {
    this.formGroup.patchValue({
      objectFit: this.imageInfos[this.imageIndex].objectFit ?? 'scale-down',
      objectPosition: this.imageInfos[this.imageIndex].objectPosition ?? 'center center',
      backgroundColor: this.imageInfos[this.imageIndex].backgroundColor ?? 'unset'
    })
  }

  // if image data was captured before then use this data
  // otherwise use the image url
  public buildImageSrc(imageInfo: ImageInfo, images: ImageDataResponse[]): string | undefined {
    if (imageInfo.url) return imageInfo.url
    const currentImage = images.find((image) => {
      return image.imageId === imageInfo.imageId
    })
    return 'data:' + currentImage?.mimeType + ';base64,' + currentImage?.imageData
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
        console.error('updateImageInfo', err)
      }
    })
  }

  public onNavigateToImage(newIdx: number) {
    if (newIdx === this.imageInfos.length) this.imageIndex = 0
    else if (newIdx === -1) this.imageIndex = this.imageInfos.length - 1
    else this.imageIndex = newIdx
    this.fillForm()
  }
}
