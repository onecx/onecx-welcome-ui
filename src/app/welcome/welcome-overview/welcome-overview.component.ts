import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  Injector,
  OnInit,
  signal,
  untracked
} from '@angular/core'
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
  private injector = inject(Injector)
  private readonly CAROUSEL_SPEED: number = 15000 // ms
  public loading = signal(true)
  public exceptionKey: string | undefined = undefined
  public currentImagePos = signal<number>(-1)
  public dockItems$: Observable<MenuItem[]> = of([])
  // data
  public user$ = this.userService.profile$.asObservable()
  public workspace: Workspace | undefined
  public imageInfo$: Observable<ImageInfo[]> = of([])
  private readonly imageData: ImageDataResponse[] = []
  private readonly imageUnavailableNumbers: number[] = [] // positions of images that failed to load
  private readonly imageAvailableNumbers: number[] = [] // positions of visible images
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
        take(1)
      )
      .subscribe((ws) => {
        this.workspace = ws
        this.getImages()
      })
  }

  private getImages(): void {
    this.loading.set(true)
    if (!this.workspace?.workspaceName) {
      this.loading.set(false)
      this.imageInfo$ = of([])
      return
    }

    this.imageInfo$ = this.imageService
      .getAllImageInfosByWorkspaceName({ workspaceName: this.workspace.workspaceName })
      .pipe(
        map((ii: ImageInfo[]) => {
          const iis = ii.filter((img) => img.visible === true).sort((a, b) => Number(a.position) - Number(b.position))
          iis.forEach((_, index) => this.imageAvailableNumbers.push(index))
          this.fetchImageData(iis) // get real (visible) image data, init carousel for all visible images
          return iis
        }),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + Utils.mapping_error_status(err.status) + '.IMAGES'
          console.error('getAllImageInfosByWorkspaceName', err)
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
    // initial: display the first image immediately, do not wait on carousel interval
    if (this.imageAvailableNumbers.length > 0 && this.currentImagePos() === -1) {
      const nextPos = this.getNextAvailableImagePos(this.currentImagePos())
      this.currentImagePos.set(nextPos)
    }
    effect(
      (onCleanup) => {
        const intervalId = setInterval(() => {
          const nextPos = untracked(() => this.getNextAvailableImagePos(this.currentImagePos()))
          this.currentImagePos.set(nextPos)
        }, this.CAROUSEL_SPEED)
        onCleanup(() => clearInterval(intervalId)) // on destroy component
      },
      { injector: this.injector }
    )
  }

  // find next image position of available images
  private getNextAvailableImagePos(pos: number): number {
    let nextPos = pos + 1 // next image, normally the following one
    // restart
    if (this.imageAvailableNumbers.length <= nextPos) nextPos = this.getNextAvailableImagePos(-1)
    else if (this.imageUnavailableNumbers.includes(nextPos)) nextPos = this.getNextAvailableImagePos(nextPos)
    return nextPos
  }

  // On image load error (e.g. url is not available) => find the next available image
  public onImageLoadError(currentPos: number): void {
    this.imageUnavailableNumbers.push(currentPos)
    this.currentImagePos.set(this.getNextAvailableImagePos(currentPos))
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
