import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'

import { Workspace } from '@onecx/integration-interface'
import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import { ImageDataResponse, ImageInfo, ImagesInternalAPIService } from 'src/app/shared/generated'
import { WelcomeOverviewComponent } from './welcome-overview.component'

const imageInfos: ImageInfo[] = [
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
  displayName: 'Workspace',
  portalName: 'unused',
  baseUrl: '/base',
  microfrontendRegistrations: []
}

describe('WelcomeOverviewComponent', () => {
  let component: WelcomeOverviewComponent
  let fixture: ComponentFixture<WelcomeOverviewComponent>
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    getAllImageInfosByWorkspaceName: jasmine.createSpy('getAllImageInfosByWorkspaceName').and.returnValue(of({})),
    getImageById: jasmine.createSpy('getImageById').and.returnValue(of({}))
  }
  const mockUserService = {
    lang$: { getValue: jasmine.createSpy('getValue') },
    profile$: {
      getValue: jasmine.createSpy('getValue'),
      asObservable: jasmine.createSpy('asObservable')
    }
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WelcomeOverviewComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ImagesInternalAPIService, useValue: apiServiceSpy }
      ]
    }).compileComponents()
    // reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.getAllImageInfosByWorkspaceName.calls.reset()
    apiServiceSpy.getImageById.calls.reset()
    // default data
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

  describe('getImages', () => {
    beforeEach(() => {
      component.workspace = ws
    })

    it('should get infos for all images', (done) => {
      apiServiceSpy.getAllImageInfosByWorkspaceName.and.returnValue(of(imageInfos))

      component['getImages']()

      component.imageInfo$?.subscribe({
        next: (images) => {
          expect(images.length).toBe(5)
          done()
        },
        error: done.fail
      })
    })

    it('should handle error when fetching imageinfos', (done) => {
      const errorResponse = { status: 404, statusText: 'Not Found' }
      apiServiceSpy.getAllImageInfosByWorkspaceName.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component['getImages']()

      component.imageInfo$?.subscribe({
        next: () => {
          expect(console.error).toHaveBeenCalledWith('getAllImageInfosByWorkspaceName', errorResponse)
          done()
        },
        error: done.fail
      })
    })
  })

  describe('fetchImages', () => {
    it('should not fetch images if they are already loaded', () => {
      component.images = [{ imageId: '123', mimeType: 'image/png', imageData: new Blob() }]

      component['fetchImages'](imageInfos)

      expect(apiServiceSpy.getImageById).not.toHaveBeenCalled()
    })

    it('should get data for one image', () => {
      const imgDataResponse: ImageDataResponse = { imageId: 'id' }
      apiServiceSpy.getImageById.and.returnValue(of(imgDataResponse))

      component['fetchImages'](imageInfos)

      expect(component.images).toContain(imgDataResponse)
    })
  })

  describe('buildImageSrc', () => {
    it('should not build source if page is loading', () => {
      component.images = [{ imageId: '123', mimeType: 'image/png', imageData: new Blob() }]

      const result = component.buildImageSrc(imageInfos[0])

      expect(result).toBeUndefined()
    })

    it('should return the URL if image is based on', () => {
      component.images = [{ imageId: '123' }]
      const info = imageInfos.find((i) => i.imageId === '123')!
      component.loading = false

      const result = component.buildImageSrc(info)

      expect(result).toBe(info.url)
    })

    it('should return data string if image is found', () => {
      component.images = [{ imageId: '1234', mimeType: 'image/png', imageData: new Blob() }]
      component.loading = false

      const result = component.buildImageSrc(imageInfos.find((i) => i.imageId === '1234')!)

      expect(result).toBe('data:image/png;base64,[object Blob]')
    })
  })
})
