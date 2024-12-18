import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient, HttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import { Workspace } from '@onecx/integration-interface'
import {
  AppStateService,
  createTranslateLoader,
  PortalMessageService,
  UserService
} from '@onecx/portal-integration-angular'
import { ImageDataResponse, ImageInfo, ImagesInternalAPIService } from 'src/app/shared/generated'
import { WelcomeOverviewComponent } from './welcome-overview.component'

const imageData: ImageInfo[] = [
  {
    id: '123',
    imageId: '123',
    visible: true,
    position: '1',
    workspaceName: 'ws',
    url: 'http://example.com/image1.png'
  },
  { id: '1234', imageId: '1234', visible: true, position: '2', workspaceName: 'ws' },
  { id: '12345', imageId: '12345', visible: true, position: '4', workspaceName: 'ws' },
  { id: '123456', imageId: '123456', visible: true, position: '3', workspaceName: 'ws' },
  { id: '1234567', imageId: '1234567', visible: true, position: '3', workspaceName: 'ws' }
]

const ws: Workspace = {
  workspaceName: 'wsName',
  portalName: 'wsName',
  baseUrl: 'url',
  microfrontendRegistrations: []
}

describe('WelcomeOverviewComponent', () => {
  let component: WelcomeOverviewComponent
  let fixture: ComponentFixture<WelcomeOverviewComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', [
    'success',
    'error',
    'info',
    'warning'
  ])

  const apiServiceSpy = {
    getAllImageInfosByWorkspaceName: jasmine.createSpy('getAllImageInfosByWorkspaceName').and.returnValue(of({})),
    getImageById: jasmine.createSpy('getImageById').and.returnValue(of({}))
  }

  const mockUserService = {
    lang$: {
      getValue: jasmine.createSpy('getValue')
    },
    profile$: {
      getValue: jasmine.createSpy('getValue'),
      asObservable: jasmine.createSpy('asObservable')
    }
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WelcomeOverviewComponent],
      imports: [
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        }),
        BrowserAnimationsModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ImagesInternalAPIService, useValue: apiServiceSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.info.calls.reset()
    msgServiceSpy.warning.calls.reset()
    apiServiceSpy.getAllImageInfosByWorkspaceName.calls.reset()
    apiServiceSpy.getImageById.calls.reset()
    mockUserService.lang$.getValue.and.returnValue('de')
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WelcomeOverviewComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('getImageData', () => {
    beforeEach(() => {
      component.workspace = ws
    })

    it('should get infos for all images', (done) => {
      apiServiceSpy.getAllImageInfosByWorkspaceName.and.returnValue(of(imageData))

      component['getImageData']()

      component.imageData$?.subscribe({
        next: (images) => {
          expect(images.length).toBe(5)
          done()
        },
        error: done.fail
      })
    })

    it('should handle error when fetching imageinfos', (done) => {
      const err = { status: 404 }
      apiServiceSpy.getAllImageInfosByWorkspaceName.and.returnValue(throwError(() => err))
      spyOn(console, 'error')

      component['getImageData']()

      component.imageData$?.subscribe({
        next: () => {
          expect(console.error).toHaveBeenCalledWith('getAllImageInfosByWorkspaceName():', err)
          done()
        },
        error: done.fail
      })
    })
  })

  describe('fetchImages', () => {
    it('should not fetch images if they are already loaded', () => {
      component.images = [{ imageId: '123', mimeType: 'image/png', imageData: new Blob() }]

      component['fetchImages'](imageData)

      expect(apiServiceSpy.getImageById).not.toHaveBeenCalled()
    })

    it('should get data for one image', () => {
      const imgDataResponse: ImageDataResponse = { imageId: 'id' }
      apiServiceSpy.getImageById.and.returnValue(of(imgDataResponse))

      component['fetchImages'](imageData)

      expect(component.images).toContain(imgDataResponse)
    })
  })

  describe('buildImageSrc', () => {
    it('should not build source if page is loading', () => {
      component.images = [{ imageId: '123', mimeType: 'image/png', imageData: new Blob() }]
      component.loading = true

      const result = component.buildImageSrc(imageData[0])

      expect(result).toBeUndefined()
    })

    it('should return base64 string if image is found', () => {
      component.images = [{ imageId: '123', mimeType: 'image/png', imageData: new Blob() }]
      component.loading = false

      const result = component.buildImageSrc(imageData[0])

      expect(result).toBe('data:image/png;base64,[object Blob]')
    })

    it('should return the URL if image is not found', () => {
      const imageInfo = {
        id: 'id',
        imageId: 'id',
        visible: true,
        position: '1',
        workspaceName: 'w1',
        url: 'http://example.com/image3.png'
      }
      component.images = imageData
      component.loading = false

      const result = component.buildImageSrc(imageInfo)

      expect(result).toBe(imageInfo.url)
    })
  })
})
