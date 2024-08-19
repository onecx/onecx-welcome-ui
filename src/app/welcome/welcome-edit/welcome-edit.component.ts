import { Component, OnInit } from '@angular/core'
import { AppStateService, Portal, PortalMessageService } from '@onecx/portal-integration-angular'
import { Subscription } from 'rxjs'
import { ImageDataResponse, ImageInfo, ImagesInternalAPIService } from 'src/app/shared/generated'

@Component({
  selector: 'app-welcome-edit',
  templateUrl: './welcome-edit.component.html',
  styleUrls: ['./welcome-edit.component.scss']
})
export class WelcomeEditComponent implements OnInit {
  workspace: Portal | undefined
  currentSlide = 0
  public helpArticleId = 'PAGE_WELCOME_EDIT'
  subscription: Subscription | undefined
  images: ImageDataResponse[] = []
  imageInfos: ImageInfo[] = []
  public displayImageDialog = false
  selectedImageInfo: ImageInfo | undefined
  selectedImageData: ImageDataResponse | undefined
  isReordered: boolean = false

  constructor(
    private imageService: ImagesInternalAPIService,
    private msgService: PortalMessageService,
    private appStateService: AppStateService
  ) {
    this.workspace = this.appStateService.currentWorkspace$.getValue()
  }
  ngOnInit(): void {
    this.fetchImageInfos()
  }

  public fetchImageInfos() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    this.imageService.getAllImageInfosByWorkspaceName({ workspaceName: this.workspace?.portalName! }).subscribe({
      next: (data: ImageInfo[]) => {
        this.imageInfos = data.sort((a, b) => this.compareImagePosition(a.position!, b.position!))
        this.fetchImageData()
      },
      error: () => {
        this.msgService.error({ summaryKey: 'GENERAL.IMAGES.NOT_FOUND' })
      }
    })
  }

  compareImagePosition(infoOne: string, infoTwo: string): number {
    if (infoOne < infoTwo) {
      return -1
    } else if (infoOne > infoTwo) {
      return 1
    } else return 0
  }

  public fetchImageData() {
    this.imageInfos.map((info) => {
      if (info.imageId) {
        this.imageService.getImageById({ id: info.imageId }).subscribe({
          next: (imageData: ImageDataResponse) => {
            this.images.push(imageData)
          },
          error: () => this.msgService.error({ summaryKey: 'GENERAL.IMAGES.NOT_FOUND' })
        })
      }
    })
  }

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

  public handleDelete(id: string | undefined) {
    if (id) {
      const indexOfItem = this.imageInfos.findIndex((i) => i.id === id)
      this.imageInfos.splice(indexOfItem, 1)
      this.imageService.deleteImageInfoById({ id: id }).subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'ACTIONS.DELETE.SUCCESS' })
          this.updatePositions()
        },
        error: () => {
          this.msgService.error({ summaryKey: 'ACTIONS.DELETE.ERROR' })
        }
      })
    }
  }

  updatePositions() {
    this.imageInfos.map((info, index) => {
      info.position = (index + 1).toString()
    })
    this.imageService.updateImageOrder({ imageInfoReorderRequest: { imageInfos: this.imageInfos } }).subscribe({
      next: () => {
        this.fetchImageInfos()
      }
    })
  }

  public updateVisibility(info: ImageInfo) {
    if (info.id) {
      this.imageService
        .updateImageInfo({
          id: info.id,
          imageInfo: {
            visible: !info.visible,
            modificationCount: info.modificationCount,
            imageId: info.imageId,
            position: info.position,
            url: info.url,
            creationDate: info.creationDate,
            id: info.id,
            creationUser: info.creationUser,
            modificationDate: info.modificationDate,
            modificationUser: info.modificationUser,
            workspaceName: info.workspaceName
          }
        })
        .subscribe({
          next: () => {
            this.fetchImageInfos()
            this.msgService.success({ summaryKey: 'ACTIONS.VISIBILITY.SUCCESS' })
          },
          error: () => {
            this.msgService.error({ summaryKey: 'ACTIONS.VISIBILITY.ERROR' })
          }
        })
    }
  }

  public swapElement(array: any, indexA: number, indexB: number) {
    const tmp = array[indexA]
    array[indexA].position = indexB + 1
    array[indexB].position = indexA + 1
    array[indexA] = array[indexB]
    array[indexB] = tmp
    this.isReordered = true
  }

  public onSaveOrder() {
    const imagesToReorder = this.imageInfos
    this.imageService.updateImageOrder({ imageInfoReorderRequest: { imageInfos: imagesToReorder } }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'ACTIONS.REORDER.SUCCESS' })
      },
      error: () => {
        this.msgService.error({ summaryKey: 'ACTIONS.REORDER.ERROR' })
      }
    })
  }

  public onCloseDialog(refresh: boolean): void {
    this.displayImageDialog = false
    if (refresh) {
      this.fetchImageInfos()
    }
  }
}
