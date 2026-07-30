import { Component, EventEmitter, Input, Output, OnChanges, OnDestroy, inject } from '@angular/core'
import { NgStyle } from '@angular/common'
import { FormsModule, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { TranslateModule, TranslateService } from '@ngx-translate/core'

import { ButtonModule } from 'primeng/button'
import { DialogModule } from 'primeng/dialog'
import { FloatLabel } from 'primeng/floatlabel'
import { FieldsetModule } from 'primeng/fieldset'
import { InputTextModule } from 'primeng/inputtext'
import { SelectModule } from 'primeng/select'
import { TooltipModule } from 'primeng/tooltip'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { ImageDataResponse, ImageInfo, ImagesInternalAPIService, ObjectFit } from 'src/app/shared/generated'

export interface ImageCssForm {
  objectFit: FormControl<string | null>
  objectPosition: FormControl<string | null>
  backgroundColor: FormControl<string | null>
}

@Component({
  selector: 'app-image-detail',
  standalone: true,
  imports: [
    NgStyle,
    ButtonModule,
    DialogModule,
    FieldsetModule,
    FloatLabel,
    FormsModule,
    InputTextModule,
    ReactiveFormsModule,
    SelectModule,
    TooltipModule,
    TranslateModule
  ],
  templateUrl: './image-detail.component.html',
  styleUrl: './image-detail.component.scss'
})
export class ImageDetailComponent implements OnChanges, OnDestroy {
  private readonly imageApi = inject(ImagesInternalAPIService)
  private readonly translate = inject(TranslateService)
  private readonly msgService = inject(PortalMessageService)

  @Input() public displayDialog = false
  @Input() public images: ImageDataResponse[] = []
  @Input() public imageInfos: ImageInfo[] = []
  @Input() public imageIndex = -1
  @Output() public closeDialog = new EventEmitter<boolean>() // true on image changes

  public isLoading = false
  public isChanged = false
  public formGroup = new FormGroup<ImageCssForm>({
    objectFit: new FormControl(ObjectFit.ScaleDown),
    objectPosition: new FormControl('center center', [Validators.minLength(2), Validators.maxLength(50)]),
    backgroundColor: new FormControl('unset', [Validators.minLength(3), Validators.maxLength(100)])
  })
  public objectFitOptions = [ObjectFit.None, ObjectFit.Contain, ObjectFit.Cover, ObjectFit.Fill, ObjectFit.ScaleDown]
  private readonly blobUrls = new Map<string, string>()

  public ngOnChanges(): void {
    if (this.displayDialog && this.imageIndex > -1) this.fillForm()
  }

  public ngOnDestroy(): void {
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url))
    this.blobUrls.clear()
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
    if (this.imageIndex < 0) return
    if (imageInfo.url) return imageInfo.url
    const currentImage = images.find((image) => {
      return image.imageId === imageInfo.imageId
    })
    const imageData = currentImage?.imageData
    if (imageData instanceof Blob) {
      if (!currentImage?.imageId) return undefined
      const cachedBlobUrl = this.blobUrls.get(currentImage.imageId)
      if (cachedBlobUrl) return cachedBlobUrl
      const blobUrl = URL.createObjectURL(imageData)
      this.blobUrls.set(currentImage.imageId, blobUrl)
      return blobUrl
    }
    return 'data:' + currentImage?.mimeType + ';base64,' + (imageData ?? '')
  }

  public onDialogHide() {
    this.closeDialog.emit(this.isChanged)
  }

  public onSave() {
    const ii = { ...this.imageInfos[this.imageIndex], ...this.formGroup.value } as ImageInfo
    if (ii.id)
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
