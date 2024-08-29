import { animate, style, transition, trigger } from '@angular/animations'
import { Component, OnInit } from '@angular/core'
import { catchError, map, Observable, of, Subject, Subscription, takeUntil, tap, timer } from 'rxjs'

import { Workspace } from '@onecx/integration-interface'
import { AppStateService, PortalMessageService, UserProfile, UserService } from '@onecx/portal-integration-angular'
import { SlotService } from '@onecx/angular-remote-components'

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
  public loading = true
  readonly CAROUSEL_SPEED: number = 15000
  workspace: Workspace | undefined
  currentSlide = 0
  user$: Observable<UserProfile>
  currentDate = new Date()
  subscription: Subscription | undefined
  images: ImageDataResponse[] = []
  public imageData$!: Observable<ImageInfo[]>
  public isAnnouncementListActiveComponentAvailable$: Observable<boolean>
  public listActiveSlotName = 'onecx-welcome-list-active'

  constructor(
    private appStateService: AppStateService,
    private userService: UserService,
    private imageService: ImagesInternalAPIService,
    private msgService: PortalMessageService,
    private readonly slotService: SlotService
  ) {
    this.user$ = this.userService.profile$.asObservable()
    this.isAnnouncementListActiveComponentAvailable$ = this.slotService.isSomeComponentDefinedForSlot(
      this.listActiveSlotName
    )
  }

  ngOnInit(): void {
    this.workspace = this.appStateService.currentWorkspace$.getValue()
    this.getImageData()
  }

  private getImageData(): void {
    this.loading = true
    if (this.workspace)
      this.imageData$ = this.imageService
        .getAllImageInfosByWorkspaceName({ workspaceName: this.workspace.workspaceName })
        .pipe(
          tap((x) => {
            console.log(x)
          }),
          map((images) => {
            this.fetchImages(images) // get images
            return images
              .filter((img) => img.visible === true)
              .sort((a, b) => (a.position! < b.position! ? -1 : a.position! > b.position! ? 1 : 0))
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
    let data: string | undefined = undefined
    const existingImage = this.images.find((image) => {
      return image.imageId === imageInfo.imageId
    })
    data = existingImage ? 'data:' + existingImage.mimeType + ';base64,' + existingImage.imageData : imageInfo.url
    return data
  }
}
