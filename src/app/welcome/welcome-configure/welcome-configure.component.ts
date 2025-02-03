import { Component, OnInit } from '@angular/core'
import { catchError, map, Observable, of, Subject, Subscription, takeUntil } from 'rxjs'
import FileSaver from 'file-saver'

import { Workspace } from '@onecx/integration-interface'
import { AppStateService, PortalMessageService } from '@onecx/angular-integration-interface'

import { getCurrentDateTime } from 'src/app/shared/utils'

import {
  ImageDataResponse,
  ImageInfo,
  ImagesInternalAPIService,
  ImagesExportImportAPIService
} from 'src/app/shared/generated'

@Component({
  selector: 'app-welcome-configure',
  templateUrl: './welcome-configure.component.html',
  styleUrls: ['./welcome-configure.component.scss']
})
export class WelcomeConfigureComponent implements OnInit {
  private readonly destroy$ = new Subject()
  // dialog
  public displayCreateDialog = false
  public displayDetailDialog = false
  public isReordered = false
  public detailImageIndex = 0
  public maxImages = 20
  // data
  public workspace: Workspace | undefined
  public subscription: Subscription | undefined
  public images: ImageDataResponse[] = []
  public imageInfos: ImageInfo[] = []
  public imageInfo$!: Observable<ImageInfo[]> | undefined

  constructor(
    private readonly imageService: ImagesInternalAPIService,
    private readonly eximService: ImagesExportImportAPIService,
    private readonly msgService: PortalMessageService,
    private readonly appStateService: AppStateService
  ) {
    this.workspace = this.appStateService.currentWorkspace$.getValue()
  }

  public ngOnInit(): void {
    this.fetchImageInfos()
  }

  public fetchImageInfos() {
    if (this.workspace)
      this.imageInfo$ = this.imageService
        .getAllImageInfosByWorkspaceName({ workspaceName: this.workspace.workspaceName })
        .pipe(
          map((images) => {
            this.imageInfos = images
            this.imageInfos.sort(this.sortImagesByPosition)
            this.fetchImageData(images)
            return images.sort((a, b) => Number(a.position) - Number(b.position))
          }),
          catchError((err) => {
            console.error('getAllImageInfosByWorkspaceName', err)
            return of([] as ImageInfo[])
          })
        )
        .pipe(takeUntil(this.destroy$))
  }

  private sortImagesByPosition(a: ImageInfo, b: ImageInfo): number {
    if ((a.position ?? 0) < (b.position ?? 0)) return -1
    else return (a.position ?? 0) > (b.position ?? 0) ? 1 : 0
  }

  public fetchImageData(ii: ImageInfo[]) {
    ii.forEach((info) => {
      if (info.imageId) {
        this.imageService.getImageById({ id: info.imageId }).subscribe({
          next: (idr: ImageDataResponse) => {
            this.images.push(idr)
          },
          error: () => this.msgService.error({ summaryKey: 'VALIDATION.ERRORS.IMAGES.NOT_FOUND' })
        })
      }
    })
  }

  public buildImageSrc(ii: ImageInfo) {
    const image = this.images.find((image) => {
      return image.imageId === ii.imageId
    })
    if (image) {
      return 'data:' + image.mimeType + ';base64,' + image.imageData
    } else {
      return ii.url
    }
  }

  // reorder
  private updatePositions(ii: ImageInfo[]) {
    ii.forEach((info, index) => (info.position = (index + 1).toString()))
    this.imageService.updateImageOrder({ imageInfoReorderRequest: { imageInfos: ii } }).subscribe({
      next: () => {
        this.fetchImageInfos()
      }
    })
  }

  /*
   * UI ACTIONS
   */
  public onOpenCreateDialog() {
    this.displayCreateDialog = true
  }
  public onOpenDetailDialog(idx: number): void {
    this.displayDetailDialog = true
    this.detailImageIndex = idx
  }
  public onCloseDetailDialog(refresh: boolean): void {
    this.displayCreateDialog = false
    this.displayDetailDialog = false
    if (refresh) this.fetchImageInfos()
  }

  public onDeleteImage(id: string | undefined, idx: number, ii: ImageInfo[]) {
    if (id) {
      ii.splice(idx, 1) // remove locally
      this.imageService.deleteImageInfoById({ id: id }).subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'ACTIONS.DELETE.SUCCESS' })
          this.updatePositions(ii)
        },
        error: (err) => {
          this.msgService.error({ summaryKey: 'ACTIONS.DELETE.ERROR' })
          console.error('deleteImageInfoById', err)
        }
      })
    }
  }

  public onExport() {
    if (this.workspace?.workspaceName)
      this.eximService
        .exportImages({ exportWelcomeRequest: { workspaceName: this.workspace.workspaceName } })
        .subscribe({
          next: (snapshot) => {
            const workspaceJson = JSON.stringify(snapshot, null, 2)
            FileSaver.saveAs(
              new Blob([workspaceJson], { type: 'text/json' }),
              `onecx-welcome_${this.workspace?.workspaceName}_${getCurrentDateTime()}.json`
            )
          },
          error: (err) => {
            this.msgService.error({ summaryKey: 'ACTIONS.EXPORT.MESSAGE_NOK' })
            console.error('exportImages', err)
          }
        })
  }

  public onChangeVisibility(info: ImageInfo) {
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
            id: info.id,
            workspaceName: info.workspaceName
          }
        })
        .subscribe({
          next: () => {
            this.fetchImageInfos()
            this.msgService.success({ summaryKey: 'ACTIONS.VISIBILITY.SUCCESS' })
          },
          error: (err) => {
            this.msgService.error({ summaryKey: 'ACTIONS.VISIBILITY.ERROR' })
            console.error('updateImageInfo', err)
          }
        })
    }
  }

  public onSaveOrder() {
    const imagesToReorder = this.imageInfos
    this.imageService.updateImageOrder({ imageInfoReorderRequest: { imageInfos: imagesToReorder } }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'ACTIONS.REORDER.SUCCESS' })
      },
      error: (err) => {
        this.msgService.error({ summaryKey: 'ACTIONS.REORDER.ERROR' })
        console.error('updateImageOrder', err)
      }
    })
  }

  public onSwapElement(ii: ImageInfo[], indexA: number, indexB: number) {
    const tmp = ii[indexA]
    // switch start => end
    if (indexA === 0 && indexB === -1) {
      ii[0].position = (ii.length - 1).toString()
      ii[ii.length - 1].position = '0'
      ii[0] = ii[ii.length - 1]
      ii[ii.length - 1] = tmp
      // switch end => start
    } else if (indexA === ii.length - 1 && indexB === ii.length) {
      ii[indexA].position = '0'
      ii[0].position = indexA.toString()
      ii[indexA] = ii[0]
      ii[0] = tmp
      // moving within the array
    } else {
      ii[indexA].position = indexB.toString()
      ii[indexB].position = indexA.toString()
      ii[indexA] = ii[indexB]
      ii[indexB] = tmp
    }
    this.isReordered = true
  }
}
