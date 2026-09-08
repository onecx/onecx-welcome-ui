import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { AsyncPipe, NgClass, NgStyle } from '@angular/common'
import { animate, style, transition, trigger } from '@angular/animations'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { catchError, filter, map, Observable, of, take } from 'rxjs'

import { MenuItem } from 'primeng/api'
import { DockModule } from 'primeng/dock'
import { MessageModule } from 'primeng/message'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { AngularRemoteComponentsModule, SlotService } from '@onecx/angular-remote-components'
import { Workspace } from '@onecx/integration-interface'
import { AppStateService, UserService } from '@onecx/angular-integration-interface'
import { PortalPageComponent } from '@onecx/angular-utils'

import { ImageDataResponse, ImageInfo, ImagesInternalAPIService } from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'

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
    MessageModule,
    TranslateModule,
    // components
    PortalPageComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './welcome-overview.component.html',
  styleUrl: './welcome-overview.component.scss',
  animations: [
    trigger('carouselAnimation', [
      transition(':leave', [style({ opacity: 1 }), animate('500ms ease-in', style({ opacity: 0 }))]),
      transition(':enter', [style({ opacity: 0 }), animate('500ms 500ms ease-out', style({ opacity: 1 }))])
    ])
  ]
})
export class WelcomeOverviewComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef)
  private readonly slotService = inject(SlotService)
  private readonly translate = inject(TranslateService)
  private readonly userService = inject(UserService)
  private readonly imageService = inject(ImagesInternalAPIService)
  private readonly appStateService = inject(AppStateService)
  // dialog
  private readonly CAROUSEL_SPEED: number = 5000 // ms
  public readonly loading = signal(true) // set to false if image loading was finished
  public exceptionKey: string | undefined = undefined
  public dockItems$: Observable<MenuItem[]> = of([])
  // data
  public user$ = this.userService.profile$.asObservable()
  public workspace: Workspace | undefined
  public imageInfo$: Observable<ImageInfo[]> = of([])
  private readonly imageData: ImageDataResponse[] = []
  private readonly imageAvailableNumbers = signal<string[]>([]) // positions of visible images
  private readonly carouselIndex = signal<number>(0)
  public currentImagePos = computed(() => {
    const images = this.imageAvailableNumbers()
    if (images.length === 0) return -1 // initial, no images yet
    return this.carouselIndex() % images.length
  })
  // slots
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
        take(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((ws) => {
        this.workspace = ws
        this.getImages()
      })
  }

  private getImages(): void {
    if (!this.workspace?.workspaceName) {
      this.loading.set(false)
      this.imageInfo$ = of([])
      return
    }
    this.loading.set(true)
    this.imageInfo$ = this.imageService
      .getAllImageInfosByWorkspaceName({ workspaceName: this.workspace.workspaceName })
      .pipe(
        map((ii: ImageInfo[]) => {
          const iis = ii.filter((img) => img.visible === true).sort((a, b) => Number(a.position) - Number(b.position))
          if (iis.length > 0) {
            const ids: string[] = []
            iis.forEach((ii) => ids.push(ii.id!))
            this.imageAvailableNumbers.set(ids)
          }
          this.fetchImageData(iis) // get real (visible) image data, init carousel for all visible images
          return iis
        }),
        catchError((err) => {
          console.error('getAllImageInfosByWorkspaceName', err)
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + Utils.mapping_error_status(err.status) + '.IMAGES'
          this.loading.set(false)
          return of([] as ImageInfo[])
        }),
        takeUntilDestroyed(this.destroyRef)
      )
  }

  // load all stored image data, exclude invisible and images with URLs
  private fetchImageData(iis: ImageInfo[]): void {
    // do not do it twice
    if (this.imageData.length > 0) return
    const visibleInfoLength = iis.filter((i) => i.visible).length
    // nothing to do?
    if (iis.length === 0 || visibleInfoLength === 0) {
      this.loading.set(false)
      return
    }

    // images uploaded
    const toBeLoadLength = iis.filter((i) => i.visible && !i.url).length

    if (toBeLoadLength === 0) {
      this.loading.set(false) // finish loading
      this.setCarousel() // init carousel
    } else {
      // get images from BFF and init carousel with sum of images
      iis
        .filter((i) => i.visible && !i.url)
        .forEach((ii) => {
          if (ii.imageId) {
            this.imageService
              .getImageById({ id: ii.imageId })
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (img) => {
                  this.imageData.push(img)
                  // if all images loaded then start carousel
                  if (this.imageData.length === toBeLoadLength) {
                    this.setCarousel() // re-init carousel
                    this.loading.set(false)
                  }
                }
              })
          }
        })
    }
  }

  private setCarousel() {
    const intervalId = setInterval(() => {
      this.nextImage()
    }, this.CAROUSEL_SPEED)

    this.destroyRef.onDestroy(() => clearInterval(intervalId))
  }

  private nextImage() {
    this.carouselIndex.update((current) => {
      const length = this.imageAvailableNumbers().length
      if (length === 0) return 0
      return (current + 1) % length
    })
  }

  // On image load error (e.g. url is not available) => exclude this from list
  public onImageLoadError(failedImgId: string) {
    this.imageAvailableNumbers.update((images) => images.filter((id) => id !== failedImgId))
    this.nextImage()
  }

  // build a data URL from imageData or return the URL from imageInfo
  public buildImageSrc(ii: ImageInfo): string | undefined {
    if (this.loading()) return undefined
    if (ii.url) return ii.url
    if (this.imageData.length === 0) return undefined

    // prepare data URL from imageData
    const iiData = this.imageData.find((img) => img.imageId === ii.imageId)
    if (!iiData?.imageData) return undefined
    if (iiData.imageData instanceof Blob) {
      return URL.createObjectURL(iiData.imageData)
    } else {
      return 'data:' + iiData?.mimeType + ';base64,' + iiData.imageData
    }
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
