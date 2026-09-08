import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core'
import { AsyncPipe, Location } from '@angular/common'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { BehaviorSubject, catchError, filter, finalize, map, Observable, of, Subject, take, takeUntil } from 'rxjs'
import FileSaver from 'file-saver'

import { ButtonModule } from 'primeng/button'
import { MessageModule } from 'primeng/message'
import { TooltipModule } from 'primeng/tooltip'

import { Action, AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { Workspace } from '@onecx/integration-interface'
import { AppStateService, PortalMessageService } from '@onecx/angular-integration-interface'
import { PortalPageComponent } from '@onecx/angular-utils'

import { Utils } from 'src/app/shared/utils'
import {
  ImageDataResponse,
  ImageInfo,
  ImagesInternalAPIService,
  ConfigExportImportAPIService
} from 'src/app/shared/generated'

import { WelcomeImportComponent } from '../welcome-import/welcome-import.component'
import { ImageCreateComponent } from '../image-create/image-create.component'
import { ImageDetailComponent } from '../image-detail/image-detail.component'
import { ImageItemComponent } from '../image-item/image-item.component'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'

@Component({
  selector: 'app-welcome-configure',
  standalone: true,
  imports: [
    AsyncPipe,
    AngularAcceleratorModule,
    ButtonModule,
    MessageModule,
    TooltipModule,
    TranslateModule,
    // components
    PortalPageComponent,
    ImageCreateComponent,
    ImageDetailComponent,
    WelcomeImportComponent,
    ImageItemComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './welcome-configure.component.html',
  styleUrl: './welcome-configure.component.scss'
})
export class WelcomeConfigureComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly location = inject(Location)
  private readonly translate = inject(TranslateService)
  private readonly msgService = inject(PortalMessageService)
  private readonly appStateService = inject(AppStateService)
  private readonly imageService = inject(ImagesInternalAPIService)
  private readonly eximService = inject(ConfigExportImportAPIService)

  // dialog
  public readonly loading = signal(true)
  public exceptionKey: string | undefined = undefined
  public actions$: Observable<Action[]> = of([])
  public displayCreateDialog = false
  public displayDetailDialog = false
  public displayImportDialog = false
  public isReordered = false
  public detailImageIndex = -1
  public maxImages = 20
  // data
  public workspace: Workspace | undefined
  private preOrderList: ImageInfo[] = []
  private readonly imageInfosSubject = new BehaviorSubject<ImageInfo[]>([])
  public imageInfo$ = this.imageInfosSubject.asObservable()
  public readonly imageData = signal<ImageDataResponse[]>([])
  public readonly blobUrlsCache = new Map<string, string>()

  public ngOnInit(): void {
    this.onReload()
    this.appStateService.currentWorkspace$
      .pipe(
        filter((ws): ws is Workspace => !!ws?.workspaceName),
        take(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((ws) => {
        this.workspace = ws
        this.onReload()
      })
    // cleanup blob URLs on component destroy
    this.destroyRef.onDestroy(() => {
      this.blobUrlsCache.forEach((url) => URL.revokeObjectURL(url))
      this.blobUrlsCache.clear()
    })
  }

  /**
   * 1. Step: GET the meta data of stored images
   * 2. Step: GET the image data for each image meta data
   */
  public fetchImageInfos() {
    if (!this.workspace?.workspaceName) return
    // cleanup cache
    this.blobUrlsCache.forEach((url) => URL.revokeObjectURL(url))
    this.blobUrlsCache.clear()
    this.imageData.set([])
    this.loading.set(true)
    this.imageService
      .getAllImageInfosByWorkspaceName({ workspaceName: this.workspace.workspaceName })
      .pipe(
        map((imageInfos) => {
          imageInfos.sort(this.sortImagesByPosition)
          this.fetchImageData(imageInfos)
          return imageInfos
        }),
        catchError((err) => {
          console.error('getAllImageInfosByWorkspaceName', err)
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + Utils.mapping_error_status(err.status) + '.IMAGES'
          this.loading.set(false)
          return of([] as ImageInfo[])
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((iis) => {
        this.imageInfosSubject.next(iis)
        this.preparePageAction()
      })
  }

  private sortImagesByPosition(a: ImageInfo, b: ImageInfo): number {
    if ((a.position ?? 0) < (b.position ?? 0)) return -1
    else return (a.position ?? 0) > (b.position ?? 0) ? 1 : 0
  }

  public fetchImageData(ii: ImageInfo[]) {
    let loaded = 0
    const toBeLoaded = ii.filter((info) => !!info.imageId).length
    ii.forEach((info) => {
      if (info.imageId) {
        this.imageService
          .getImageById({ id: info.imageId })
          .pipe(
            finalize(() => {
              loaded++
              if (loaded === toBeLoaded) this.loading.set(false) // last image
            }),
            takeUntilDestroyed(this.destroyRef)
          )
          .subscribe({
            next: (idr: ImageDataResponse) => {
              this.imageData.update((imgs) => [...imgs, idr])
            },
            error: () => {
              this.msgService.error({ summaryKey: 'VALIDATION.ERRORS.IMAGES.NOT_FOUND' })
              // do not raise an exception for individual image load errors
            }
          })
      }
    })
  }

  // reorder action
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
  public onReload() {
    this.resetReorderState()
    this.fetchImageInfos()
  }
  public onClose(): void {
    this.location.back()
  }

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
    this.displayImportDialog = false
    this.detailImageIndex = -1
    if (refresh) this.onReload()
  }

  public onDeleteImage(id: string | undefined, idx: number, ii: ImageInfo[]) {
    if (id) {
      this.imageService.deleteImageInfoById({ id: id }).subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'ACTIONS.DELETE.SUCCESS' })
          ii.splice(idx, 1)
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
        .exportConfiguration({ exportWelcomeRequest: { workspaceName: this.workspace.workspaceName } })
        .subscribe({
          next: (snapshot) => {
            const workspaceJson = JSON.stringify(snapshot, null, 2)
            FileSaver.saveAs(
              new Blob([workspaceJson], { type: 'text/json' }),
              `onecx-welcome_${this.workspace?.workspaceName}_${Utils.getCurrentDateTime()}.json`
            )
          },
          error: (err) => {
            this.msgService.error({ summaryKey: 'ACTIONS.EXPORT.MESSAGE_NOK' })
            console.error('exportConfiguration', err)
          }
        })
  }

  public onImport() {
    if (this.workspace?.workspaceName) {
      this.displayImportDialog = true
    }
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
          next: (data) => {
            const currentList = this.imageInfosSubject.value
            const updatedList = currentList.map((item) => (item.id === info.id ? data : item))
            this.imageInfosSubject.next(updatedList)
            this.msgService.success({ summaryKey: 'ACTIONS.VISIBILITY.SUCCESS' })
          },
          error: (err) => {
            this.msgService.error({ summaryKey: 'ACTIONS.VISIBILITY.ERROR' })
            console.error('updateImageInfo', err)
          }
        })
    }
  }

  /**
   * Reorder Images
   * 1. User reorders items in the UI => onSwapElement is called
   * 2. User clicks on SAVE => onSaveOrder is called
   * 3. onSaveOrder calls the API to update the order in the backend
   * Imporant: imageInfosSubject contains always the current state
   */
  public onSaveOrder() {
    const imagesToReorder = this.imageInfosSubject.value
    this.imageService.updateImageOrder({ imageInfoReorderRequest: { imageInfos: imagesToReorder } }).subscribe({
      next: () => {
        this.resetReorderState()
        this.msgService.success({ summaryKey: 'ACTIONS.REORDER.SUCCESS' })
      },
      error: (err) => {
        console.error('updateImageOrder', err)
        this.msgService.error({ summaryKey: 'ACTIONS.REORDER.ERROR' })
      }
    })
  }
  private resetReorderState() {
    this.preOrderList = []
    this.isReordered = false
    this.preparePageAction()
    this.cdr.detectChanges()
  }
  public onCancelOrder() {
    if (this.preOrderList.length > 0) this.imageInfosSubject.next(this.preOrderList) // restoring
    this.resetReorderState()
  }

  public onSwapElement(ii: ImageInfo[], indexA: number, indexB: number) {
    // store the original order of the list (clone!), to be restoreable
    if (this.preOrderList.length === 0) this.preOrderList = [...ii]
    const tmp = ii[indexA]
    // switch start => end
    if (indexA === 0 && indexB === -1) {
      const last = ii.at(-1)!
      ii[0].position = last.position!
      last.position = '0'
      ii[0] = last
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
    if (!this.isReordered) this.preparePageAction() // first time only: enable buttons
    this.isReordered = true
    this.imageInfosSubject.next([...ii]) // update the list in the UI
  }

  private preparePageAction(): void {
    const ii = this.imageInfosSubject.value
    this.actions$ = this.translate
      .get([
        'ACTIONS.NAVIGATION.BACK',
        'ACTIONS.NAVIGATION.BACK.TOOLTIP',
        'ACTIONS.EXPORT.LABEL',
        'ACTIONS.EXPORT.TOOLTIP',
        'ACTIONS.IMPORT.LABEL',
        'ACTIONS.IMPORT.TOOLTIP',
        'ACTIONS.CREATE.LABEL',
        'ACTIONS.CREATE.TOOLTIP',
        'ACTIONS.REORDER.CANCEL',
        'ACTIONS.REORDER.CANCEL.TOOLTIP',
        'ACTIONS.REORDER.SAVE',
        'ACTIONS.REORDER.SAVE.TOOLTIP'
      ])
      .pipe(
        map((data) => {
          return [
            {
              label: data['ACTIONS.NAVIGATION.BACK'],
              title: data['ACTIONS.NAVIGATION.BACK.TOOLTIP'],
              actionCallback: () => this.onClose(),
              icon: 'pi pi-arrow-left',
              show: 'always',
              conditional: true,
              showCondition: !this.isReordered
            },
            {
              label: data['ACTIONS.EXPORT.LABEL'],
              title: data['ACTIONS.EXPORT.TOOLTIP'],
              actionCallback: () => this.onExport(),
              icon: 'pi pi-download',
              show: 'asOverflow',
              conditional: true,
              showCondition: !this.isReordered && ii.length > 0
            },
            {
              label: data['ACTIONS.IMPORT.LABEL'],
              title: data['ACTIONS.IMPORT.TOOLTIP'],
              actionCallback: () => this.onImport(),
              icon: 'pi pi-upload',
              show: 'asOverflow',
              conditional: true,
              showCondition: !this.isReordered
            },
            {
              label: data['ACTIONS.CREATE.LABEL'],
              title: data['ACTIONS.CREATE.TOOLTIP'],
              actionCallback: () => this.onOpenCreateDialog(),
              icon: 'pi pi-plus',
              show: 'always',
              conditional: true,
              showCondition: !this.isReordered && ii.length < this.maxImages
            },
            {
              label: data['ACTIONS.REORDER.CANCEL'],
              title: data['ACTIONS.REORDER.CANCEL.TOOLTIP'],
              actionCallback: () => this.onCancelOrder(),
              icon: 'pi pi-times',
              show: 'always',
              conditional: true,
              showCondition: this.isReordered
            },
            {
              label: data['ACTIONS.REORDER.SAVE'],
              title: data['ACTIONS.REORDER.SAVE.TOOLTIP'],
              actionCallback: () => this.onSaveOrder(),
              icon: 'pi pi-save',
              show: 'always',
              conditional: true,
              showCondition: this.isReordered
            }
          ]
        })
      )
  }
}
