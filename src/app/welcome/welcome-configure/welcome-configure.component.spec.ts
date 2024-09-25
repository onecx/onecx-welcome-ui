import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateModule, TranslateLoader } from '@ngx-translate/core'
import { AppStateService, createTranslateLoader, PortalMessageService } from '@onecx/portal-integration-angular'
import { of, throwError } from 'rxjs'
import { ImageDataResponse, ImageInfo, ImagesInternalAPIService } from 'src/app/shared/generated'
import { WelcomeConfigureComponent } from './welcome-configure.component'
import { CardModule } from 'primeng/card'
import { ButtonModule } from 'primeng/button'
import { ImageCreateComponent } from './image-create/image-create.component'
import { DialogModule } from 'primeng/dialog'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { Workspace } from '@onecx/integration-interface'

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

describe('WelcomeConfigureComponent', () => {
  let component: WelcomeConfigureComponent
  let fixture: ComponentFixture<WelcomeConfigureComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', [
    'success',
    'error',
    'info',
    'warning'
  ])

  const apiServiceSpy = {
    getAllImageInfosByWorkspaceName: jasmine.createSpy('getAllImageInfosByWorkspaceName').and.returnValue(of([])),
    getImageById: jasmine.createSpy('getImageById').and.returnValue(of({})),
    deleteImageInfoById: jasmine.createSpy('deleteImageInfoById').and.returnValue(of({})),
    updateImageInfo: jasmine.createSpy('updateImageInfo').and.returnValue(of({})),
    updateImageOrder: jasmine.createSpy('updateImageOrder').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WelcomeConfigureComponent, ImageCreateComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        }),
        CardModule,
        ButtonModule,
        DialogModule,
        BrowserAnimationsModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ImagesInternalAPIService, useValue: apiServiceSpy }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.info.calls.reset()
    msgServiceSpy.warning.calls.reset()
    apiServiceSpy.getAllImageInfosByWorkspaceName.calls.reset()
    apiServiceSpy.getImageById.calls.reset()
    apiServiceSpy.deleteImageInfoById.calls.reset()
    apiServiceSpy.updateImageInfo.calls.reset()
    apiServiceSpy.updateImageOrder.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WelcomeConfigureComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('fetchImageData', () => {
    beforeEach(() => {
      component.workspace = ws
    })

    it('should get infos for all images', (done) => {
      apiServiceSpy.getAllImageInfosByWorkspaceName.and.returnValue(of(imageData))

      component.fetchImageInfos()

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
      component.imageData = imageData

      component.fetchImageInfos()

      component.imageData$?.subscribe({
        next: () => {
          expect(console.error).toHaveBeenCalledWith('getAllImageInfosByWorkspaceName():', err)
          done()
        },
        error: done.fail
      })
    })
  })

  describe('fetchImageData', () => {
    it('should get data for one image', () => {
      const imgDataResponse: ImageDataResponse = { imageId: 'id' }
      apiServiceSpy.getImageById.and.returnValue(of(imgDataResponse))
      component.imageData = imageData

      component.fetchImageData()

      expect(component.images).toContain(imgDataResponse)
    })

    it('should handle error when fetching imageData', () => {
      apiServiceSpy.getImageById.and.returnValue(throwError(() => new Error()))
      component.imageData = [{ id: '123', imageId: '123', visible: true, position: '1', workspaceName: 'w1' }]

      component.fetchImageData()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'GENERAL.IMAGES.NOT_FOUND' })
    })
  })

  describe('buildImageSrc', () => {
    it('should return base64 string if image is found', () => {
      component.images = [{ imageId: '123', mimeType: 'image/png', imageData: new Blob() }]

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

      const result = component.buildImageSrc(imageInfo)

      expect(result).toBe(imageInfo.url)
    })
  })

  /*
   * UI ACTIONS
   */
  describe('OnDeleteImage', () => {
    it('should delete an image', () => {
      component.imageData = imageData
      apiServiceSpy.deleteImageInfoById.and.returnValue(of({}))

      component.onDeleteImage('123')

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.SUCCESS' })
    })

    it('should handle error when deleting image', () => {
      apiServiceSpy.deleteImageInfoById.and.returnValue(throwError(() => new Error()))

      component.onDeleteImage('123')

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.ERROR' })
    })
  })

  describe('onChangeVisibility', () => {
    it('should handle error when updating visiblity', () => {
      apiServiceSpy.updateImageInfo.and.returnValue(of({}))

      component.onChangeVisibility({ id: '123', imageId: '123', visible: true, position: '1', workspaceName: 'w1' })

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.VISIBILITY.SUCCESS' })
    })

    it('should handle error when updating visiblity', () => {
      apiServiceSpy.updateImageInfo.and.returnValue(throwError(() => new Error()))

      component.onChangeVisibility({ id: '123', imageId: '123', visible: true, position: '1', workspaceName: 'w1' })

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.VISIBILITY.ERROR' })
    })
  })

  describe('onSaveOrder', () => {
    it('should swap elements and update their positions', () => {
      const array = [
        { position: 1, value: 'a' },
        { position: 2, value: 'b' },
        { position: 3, value: 'c' }
      ]

      component.swapElement(array, 0, 2)

      expect(array[0].value).toBe('c')
      expect(array[0].position).toBe(1)
      expect(array[2].value).toBe('a')
      expect(array[2].position).toBe(3)
      expect(component.isReordered).toBe(true)
    })

    it('should save positions', () => {
      apiServiceSpy.updateImageOrder.and.returnValue(of({}))

      component.onSaveOrder()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.REORDER.SUCCESS' })
    })

    it('should handle error when updating positions', () => {
      apiServiceSpy.updateImageOrder.and.returnValue(throwError(() => new Error()))

      component.onSaveOrder()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.REORDER.ERROR' })
    })
  })

  describe('onCloseCreateDialog', () => {
    it('should close create dialog', () => {
      component.onCloseCreateDialog(false)

      expect(component.displayCreateDialog).toBeFalse()
    })

    it('should refresh images after closing', () => {
      spyOn(component, 'fetchImageInfos')

      component.onCloseCreateDialog(true)

      expect(component.fetchImageInfos).toHaveBeenCalled()
    })

    it('should not refresh after closing', () => {
      spyOn(component, 'fetchImageInfos')

      component.onCloseCreateDialog(false)

      expect(component.fetchImageInfos).not.toHaveBeenCalled()
    })
  })

  it('should close detail dialog', () => {
    component.onCloseDetailDialog()

    expect(component.displayDetailDialog).toBeFalse()
  })

  describe('sortImagesByPosition', () => {
    it('should sort images by position in ascending order', () => {
      const images: ImageInfo[] = [
        { position: '3', workspaceName: 'ws' },
        { position: '1', workspaceName: 'ws' },
        { position: '2', workspaceName: 'ws' }
      ]
      const sortedImages = images.sort(component['sortImagesByPosition'])
      expect(sortedImages).toEqual([
        { position: '1', workspaceName: 'ws' },
        { position: '2', workspaceName: 'ws' },
        { position: '3', workspaceName: 'ws' }
      ])
    })

    it('should treat undefined positions as 0', () => {
      const images: ImageInfo[] = [
        { position: undefined, workspaceName: 'ws' },
        { position: '0', workspaceName: 'ws' },
        { position: '1', workspaceName: 'ws' }
      ]
      const sortedImages = images.sort(component['sortImagesByPosition'])
      expect(sortedImages).toEqual([
        { position: undefined, workspaceName: 'ws' },
        { position: '0', workspaceName: 'ws' },
        { position: '1', workspaceName: 'ws' }
      ])
    })

    it('should handle an empty array', () => {
      const images: ImageInfo[] = []
      const sortedImages = images.sort(component['sortImagesByPosition'])
      expect(sortedImages).toEqual([])
    })

    it('should handle a mix of defined and undefined positions', () => {
      const images: ImageInfo[] = [
        { position: undefined, workspaceName: 'ws1' },
        { position: '2', workspaceName: 'ws2' },
        { position: undefined, workspaceName: 'ws3' },
        { position: '1', workspaceName: 'ws4' },
        { position: '3', workspaceName: 'ws5' }
      ]
      const sortedImages = images.sort(component['sortImagesByPosition'])
      expect(sortedImages).toEqual([
        { position: undefined, workspaceName: 'ws1' },
        { position: undefined, workspaceName: 'ws3' },
        { position: '1', workspaceName: 'ws4' },
        { position: '2', workspaceName: 'ws2' },
        { position: '3', workspaceName: 'ws5' }
      ])
    })
  })
})
