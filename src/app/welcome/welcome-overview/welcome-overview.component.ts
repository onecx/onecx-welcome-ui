import { animate, style, transition, trigger } from '@angular/animations'
import { Component, OnInit } from '@angular/core'
import { Observable, Subscription, timer } from 'rxjs'

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
  readonly CAROUSEL_SPEED: number = 15000
  workspace: Workspace | undefined
  currentSlide = -1
  user$: Observable<UserProfile>
  currentDate = new Date()
  subscription: Subscription | undefined
  images: ImageDataResponse[] = []
  imageData: ImageInfo[] = []
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
    this.fetchImageData()
  }

  public fetchImageData() {
    if (this.workspace)
      this.imageService.getAllImageInfosByWorkspaceName({ workspaceName: this.workspace.workspaceName }).subscribe({
        next: (data) => {
          this.imageData = data
          //.filter((img) => img.visible === true)
          //.sort((a, b) => (a.position! < b.position! ? -1 : a.position! > b.position! ? 1 : 0))
          this.fetchImages()
        }
      })
  }

  public fetchImages() {
    this.imageData.forEach((info) => {
      if (info.imageId) {
        this.imageService.getImageById({ id: info.imageId }).subscribe({
          next: (imageData) => {
            this.images.push(imageData)
          },
          error: () => {
            this.msgService.error({ summaryKey: 'GENERAL.IMAGES.NOT_FOUND' })
          }
        })
      }
    })
    this.initGallery()
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

  private initGallery(): void {
    this.subscription = timer(0, this.CAROUSEL_SPEED).subscribe(() => {
      this.currentSlide = ++this.currentSlide % this.imageData.length
    })
  }
}
