import { animate, style, transition, trigger } from '@angular/animations'
import { Component, OnInit } from '@angular/core'
import {
  AppStateService,
  Portal,
  PortalMessageService,
  UserProfile,
  UserService
} from '@onecx/portal-integration-angular'
import { Observable, Subscription, timer } from 'rxjs'
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
  readonly CAROUSEL_SPEED: number = 5000
  readonly permission: string = 'BASE_PORTAL#SHOW'
  portal: Portal | undefined
  currentSlide = -1
  public helpArticleId = 'PAGE_WELCOME'
  user$: Observable<UserProfile>
  currentDate = new Date()
  subscription: Subscription | undefined
  images: ImageDataResponse[] = []
  imageInfos: ImageInfo[] = []

  constructor(
    private appStateService: AppStateService,
    private userService: UserService,
    private imageService: ImagesInternalAPIService,
    private msgService: PortalMessageService
  ) {
    this.portal = this.appStateService.currentPortal$.getValue()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    // this.user = this.auth.getCurrentUser()!
    this.user$ = this.userService.profile$.asObservable()
  }

  ngOnInit(): void {
    this.fetchImageInfos()
  }

  public fetchImageInfos() {
    this.imageService.getAllImageInfos().subscribe({
      next: (data) => {
        this.imageInfos = data
          .filter((img) => img.visible === true)
          .sort((a, b) => (a.position! < b.position! ? -1 : a.position! > b.position! ? 1 : 0))
        this.fetchImageData()
      }
    })
  }

  public fetchImageData() {
    this.imageInfos.forEach((info) => {
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
    let currentImage = this.images.find((image) => {
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
      this.currentSlide = ++this.currentSlide % this.imageInfos.length
    })
  }
}
