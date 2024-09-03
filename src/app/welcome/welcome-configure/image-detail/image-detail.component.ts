import { Component, EventEmitter, Input, Output } from '@angular/core'

import { ImageDataResponse, ImageInfo } from 'src/app/shared/generated'

@Component({
  selector: 'app-image-detail',
  templateUrl: './image-detail.component.html',
  styleUrls: ['./image-detail.component.scss']
})
export class ImageDetailComponent {
  @Input() public displayDetailDialog = false
  @Input() public imageInfoCount: number = 0
  @Input() public images: ImageDataResponse[] = []
  @Input() public imageData: ImageInfo[] = []
  @Input() public imageIndex = 0
  @Output() public hideDialogAndChanged = new EventEmitter<boolean>()

  public isLoading = false
  selectedFile: any
  uploadDisabled: boolean = false
  currentWorkspaceName: string = ''

  public buildImageSrc(imageInfo: ImageInfo) {
    const currentImage = this.images.find((image) => {
      return image.imageId === imageInfo.imageId
    })
    if (currentImage) {
      return 'data:' + currentImage.mimeType + ';base64,' + currentImage.imageData
    } else {
      return imageInfo.url
    }
  }

  public onDialogHide() {
    this.displayDetailDialog = false
    this.hideDialogAndChanged.emit(false)
  }
}
