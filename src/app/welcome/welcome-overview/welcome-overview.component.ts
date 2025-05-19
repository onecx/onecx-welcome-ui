import { Component, OnInit } from '@angular/core'
import { animate, style, transition, trigger } from '@angular/animations'
import { TranslateService } from '@ngx-translate/core'
import { catchError, map, Observable, of, Subject, Subscription, takeUntil, timer } from 'rxjs'
import { MenuItem } from 'primeng/api'

import { Workspace } from '@onecx/integration-interface'
import { SlotService } from '@onecx/angular-remote-components'
import { UserProfile } from '@onecx/portal-integration-angular'
import { AppStateService, UserService } from '@onecx/angular-integration-interface'

import { ImageDataResponse, ImageInfo, ImagesInternalAPIService } from 'src/app/shared/generated'

@Component({
  selector: 'app-welcome-overview',
  templateUrl: './welcome-overview.component.html',
  styleUrls: ['./welcome-overview.component.scss'],
  animations: [
    trigger('carouselAnimation', [
      transition('void => *', [style({ opacity: 0 }), animate('500ms', style({ opacity: 1 }))]),
      transition('* => void', [animate('500ms', style({ opacity: 0 }))])
    ])
  ]
})
export class WelcomeOverviewComponent implements OnInit {
  private readonly destroy$ = new Subject()
  // dialog
  public readonly CAROUSEL_SPEED: number = 15000 // ms
  public loading = true
  public currentImage = -1
  public currentDate = new Date()
  public dockItems$: Observable<MenuItem[]> = of([])
  // data
  public user$: Observable<UserProfile>
  public workspace: Workspace | undefined
  public subscription: Subscription | undefined
  public images: ImageDataResponse[] = []
  public imageInfo$!: Observable<ImageInfo[]>
  // slot
  public isAnnouncementListComponentAvailable$: Observable<boolean>
  public isBookmarkListComponentAvailable$: Observable<boolean>
  public bookmarkListSlotName = 'onecx-welcome-list-bookmarks'
  public listActiveSlotName = 'onecx-welcome-list-active'

  constructor(
    private readonly userService: UserService,
    private readonly slotService: SlotService,
    private readonly translate: TranslateService,
    private readonly appStateService: AppStateService,
    private readonly imageService: ImagesInternalAPIService
  ) {
    this.user$ = this.userService.profile$.asObservable()
    this.isAnnouncementListComponentAvailable$ = this.slotService.isSomeComponentDefinedForSlot(this.listActiveSlotName)
    this.isBookmarkListComponentAvailable$ = this.slotService.isSomeComponentDefinedForSlot(this.bookmarkListSlotName)
  }

  ngOnInit(): void {
    this.workspace = this.appStateService.currentWorkspace$.getValue()
    this.prepareDockItems()
    this.getImages()
  }

  private getImages(): void {
    this.loading = true
    if (this.workspace)
      this.imageInfo$ = this.imageService
        .getAllImageInfosByWorkspaceName({ workspaceName: this.workspace.workspaceName })
        .pipe(
          map((images: ImageInfo[]) => {
            this.fetchImages(images) // get images
            return images.filter((img) => img.visible === true).sort((a, b) => Number(a.position) - Number(b.position))
          }),
          catchError((err) => {
            console.error('getAllImageInfosByWorkspaceName', err)
            return of([] as ImageInfo[])
          })
        )
        .pipe(takeUntil(this.destroy$))
  }

  // load all stored image data, exclude invisible and images with URLs
  private fetchImages(infos: ImageInfo[]): void {
    // do not twice
    if (this.images.length > 0) return
    const visibleInfoLength = infos.filter((i) => i.visible).length
    // nothing to do
    if (infos.length === 0 || visibleInfoLength === 0) return

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
                this.images.push(img)
                // if all images loaded then start carousel
                if (this.images.length === toBeLoadLength) {
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

  public buildImageSrc(imageInfo: ImageInfo): string | undefined {
    if (this.loading) return undefined
    if (imageInfo.url) return imageInfo.url
    if (this.images.length === 0) return undefined
    const existingImage = this.images.find((image) => image.imageId === imageInfo.imageId)
    return 'data:' + existingImage?.mimeType + ';base64,' + existingImage?.imageData
  }

  private prepareDockItems(): void {
    this.dockItems$ = this.translate.get(['ACTIONS.TOOLTIPS.CONFIGURE']).pipe(
      map((data) => {
        return [
          {
            id: 'wc_overview_action_configure',
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
