import { Component, OnInit } from '@angular/core'
import { animate, style, transition, trigger } from '@angular/animations'
import { catchError, map, Observable, of, Subject, Subscription, takeUntil, timer } from 'rxjs'

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
      transition('void => *', [style({ opacity: 0 }), animate('300ms', style({ opacity: 1 }))]),
      transition('* => void', [animate('300ms', style({ opacity: 0 }))])
    ])
  ]
})
export class WelcomeOverviewComponent implements OnInit {
  private readonly destroy$ = new Subject()
  // dialog
  public readonly CAROUSEL_SPEED: number = 15000 // ms
  public loading = true
  public currentSlide = 0
  public currentDate = new Date()
  // data
  public user$: Observable<UserProfile>
  public workspace: Workspace | undefined
  public subscription: Subscription | undefined
  public images: ImageDataResponse[] = []
  public imageInfo$!: Observable<ImageInfo[]>
  // slot
  public isAnnouncementListActiveComponentAvailable$: Observable<boolean>
  public isBookmarkListComponentAvailable$: Observable<boolean>
  public bookmarkListSlotName = 'onecx-welcome-list-bookmarks'
  public listActiveSlotName = 'onecx-welcome-list-active'

  constructor(
    private readonly userService: UserService,
    private readonly slotService: SlotService,
    private readonly appStateService: AppStateService,
    private readonly imageService: ImagesInternalAPIService
  ) {
    this.user$ = this.userService.profile$.asObservable()
    this.isAnnouncementListActiveComponentAvailable$ = this.slotService.isSomeComponentDefinedForSlot(
      this.listActiveSlotName
    )
    this.isBookmarkListComponentAvailable$ = this.slotService.isSomeComponentDefinedForSlot(this.bookmarkListSlotName)
  }

  ngOnInit(): void {
    this.workspace = this.appStateService.currentWorkspace$.getValue()
    this.getImageData()
  }

  private getImageData(): void {
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
            console.error('getAllImageInfosByWorkspaceName():', err)
            return of([] as ImageInfo[])
          })
        )
        .pipe(takeUntil(this.destroy$))
  }

  public fetchImages(imageData: ImageInfo[]): void {
    if (this.images.length > 0) return
    imageData.forEach((info) => {
      if (info.imageId) {
        this.imageService.getImageById({ id: info.imageId }).subscribe({
          next: (img) => {
            this.images.push(img)
            if (this.images.length === imageData.length) {
              this.subscription = timer(0, this.CAROUSEL_SPEED).subscribe(() => {
                this.currentSlide = ++this.currentSlide % this.images.length
              })
              this.loading = false
            }
          }
        })
      }
    })
  }

  public buildImageSrc(imageInfo: ImageInfo): string | undefined {
    if (this.loading || this.images.length === 0) return undefined
    const existingImage = this.images.find((image) => {
      return image.imageId === imageInfo.imageId
    })
    return existingImage ? 'data:' + existingImage.mimeType + ';base64,' + existingImage.imageData : imageInfo.url
  }
}
