import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core'
import { AsyncPipe, NgClass, NgStyle } from '@angular/common'
import { animate, style, transition, trigger } from '@angular/animations'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { catchError, filter, map, Observable, of, Subject, Subscription, take, takeUntil, timer } from 'rxjs'

import { MenuItem } from 'primeng/api'
import { DockModule } from 'primeng/dock'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { AngularRemoteComponentsModule, SlotService } from '@onecx/angular-remote-components'
import { Workspace } from '@onecx/integration-interface'
import { AppStateService, UserService } from '@onecx/angular-integration-interface'
import { PortalPageComponent } from '@onecx/angular-utils'

import { ImageDataResponse, ImageInfo, ImagesInternalAPIService } from 'src/app/shared/generated'

@Component({
  selector: 'app-welcome-overview',
  standalone: true,
  imports: [
    AsyncPipe,
    NgClass,
    NgStyle,
    AngularAcceleratorModule,
    AngularRemoteComponentsModule,
    DockModule,
    TranslateModule,
    // components
    PortalPageComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './welcome-overview.component.html',
  styleUrl: './welcome-overview.component.scss',
  animations: [
    trigger('carouselAnimation', [
      transition('void => *', [style({ opacity: 0 }), animate('500ms', style({ opacity: 1 }))]),
      transition('* => void', [animate('500ms', style({ opacity: 0 }))])
    ])
  ]
})
export class WelcomeOverviewComponent implements OnInit, OnDestroy {
  private readonly userService = inject(UserService)
  private readonly slotService = inject(SlotService)
  private readonly translate = inject(TranslateService)
  private readonly imageService = inject(ImagesInternalAPIService)
  private readonly appStateService = inject(AppStateService)

  private readonly destroy$ = new Subject<void>()
  // dialog
  private readonly CAROUSEL_SPEED: number = 15000 // ms
  public loading = true
  public currentImage = -1
  public dockItems$: Observable<MenuItem[]> = of([])
  // data
  public user$ = this.userService.profile$.asObservable()
  public workspace: Workspace | undefined
  private subscription: Subscription | undefined
  private imageData: ImageDataResponse[] = []
  public imageInfo$: Observable<ImageInfo[]> = of([])
  private readonly blobUrls = new Map<string, string>()
  // slot
  public readonly bookmarkListSlotName = 'onecx-welcome-list-bookmarks'
  public readonly listActiveSlotName = 'onecx-welcome-list-active'
  public readonly isAnnouncementListComponentAvailable$ = this.slotService.isSomeComponentDefinedForSlot(
    this.listActiveSlotName
  )
  public readonly isBookmarkListComponentAvailable$ = this.slotService.isSomeComponentDefinedForSlot(
    this.bookmarkListSlotName
  )

  ngOnInit(): void {
    this.prepareDockItems()
    this.appStateService.currentWorkspace$
      .pipe(
        filter((ws): ws is Workspace => !!ws?.workspaceName),
        take(1)
      )
      .subscribe((ws) => {
        this.workspace = ws
        this.getImages()
      })
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
    this.subscription?.unsubscribe()
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url))
    this.blobUrls.clear()
  }

  private getImages(): void {
    this.loading = true
    if (!this.workspace?.workspaceName) {
      this.loading = false
      this.imageInfo$ = of([])
      return
    }

    this.imageInfo$ = this.imageService
      .getAllImageInfosByWorkspaceName({ workspaceName: this.workspace.workspaceName })
      .pipe(
        map((ii: ImageInfo[]) => {
          this.fetchImages(ii) // get images
          return ii.filter((img) => img.visible === true).sort((a, b) => Number(a.position) - Number(b.position))
        }),
        catchError((err) => {
          console.error('getAllImageInfosByWorkspaceName', err)
          this.loading = false
          return of([] as ImageInfo[])
        }),
        takeUntil(this.destroy$)
      )
  }

  // load all stored image data, exclude invisible and images with URLs
  private fetchImages(infos: ImageInfo[]): void {
    // do not twice
    if (this.imageData.length > 0) return
    const visibleInfoLength = infos.filter((i) => i.visible).length
    // nothing to do
    if (infos.length === 0 || visibleInfoLength === 0) {
      this.loading = false
      return
    }

    // images with URL
    const urlImageLength = infos.filter((i) => i.visible && i.url).length
    // images uploaded
    const toBeLoadLength = infos.filter((i) => i.visible && !i.url).length

    if (toBeLoadLength === 0) {
      this.loading = false // finish loading
      this.setCarousel(urlImageLength) // init carousel with sum of URL images only
    } else {
      // get images from BFF and init carousel with sum of images
      infos
        .filter((i) => i.visible && !i.url)
        .forEach((info) => {
          if (info.imageId) {
            this.imageService.getImageById({ id: info.imageId }).subscribe({
              next: (img) => {
                this.imageData.push(img)
                // if all images loaded then start carousel
                if (this.imageData.length === toBeLoadLength) {
                  this.setCarousel(toBeLoadLength + urlImageLength)
                  this.loading = false
                }
              }
            })
          }
        })
    }
  }

  // max => number of visible images
  private setCarousel(max: number) {
    this.subscription = timer(0, this.CAROUSEL_SPEED).subscribe(() => {
      if (this.currentImage === -1) this.currentImage = 0
      else this.currentImage = ++this.currentImage % max
    })
  }

  public buildImageSrc(ii: ImageInfo): string | undefined {
    if (this.loading) return undefined
    if (ii.url) return ii.url
    if (this.imageData.length === 0) return undefined
    const existingImage = this.imageData.find((img) => img.imageId === ii.imageId)
    const imageData = existingImage?.imageData
    if (imageData instanceof Blob) {
      if (!existingImage?.imageId) return undefined
      const cachedBlobUrl = this.blobUrls.get(existingImage.imageId)
      if (cachedBlobUrl) return cachedBlobUrl
      const blobUrl = URL.createObjectURL(imageData)
      this.blobUrls.set(existingImage.imageId, blobUrl)
      return blobUrl
    }
    return 'data:' + existingImage?.mimeType + ';base64,' + (imageData ?? '')
  }

  private prepareDockItems(): void {
    this.dockItems$ = this.translate.get(['ACTIONS.TOOLTIPS.CONFIGURE']).pipe(
      map((data) => {
        return [
          {
            id: 'wc_overview_action_configure',
            icon: 'pi pi-cog',
            iconClass: 'pi pi-cog',
            tabindex: '0',
            tooltipOptions: {
              tooltipLabel: data['ACTIONS.TOOLTIPS.CONFIGURE'],
              tooltipPosition: 'left',
              tooltipEvent: 'hover'
            },
            routerLink: 'configure'
          }
        ]
      })
    )
  }
}
