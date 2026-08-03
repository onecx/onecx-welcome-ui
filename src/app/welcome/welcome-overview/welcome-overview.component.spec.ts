/* eslint-disable @angular-eslint/component-selector */
/* eslint-disable @angular-eslint/directive-selector */
import { Component, Directive, inject, input, TemplateRef, ViewContainerRef } from '@angular/core'
import { ComponentFixture, fakeAsync, TestBed, tick, discardPeriodicTasks, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ActivatedRoute } from '@angular/router'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { BehaviorSubject, of, throwError } from 'rxjs'

import { Workspace } from '@onecx/integration-interface'
import { AppStateService, PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import { PermissionService, PortalPageComponent } from '@onecx/angular-utils'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { SlotService } from '@onecx/angular-remote-components'

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
  let componentTypeLess: Record<string, unknown> // needed to access readonly private properties
  let fixture: ComponentFixture<WelcomeOverviewComponent>
  let appStateSubject: BehaviorSubject<Workspace | undefined>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const imageServiceSpy = {
    getAllImageInfosByWorkspaceName: jasmine.createSpy('getAllImageInfosByWorkspaceName').and.returnValue(of({})),
    getImageById: jasmine.createSpy('getImageById').and.returnValue(of({}))
  }
  const lang$ = new BehaviorSubject<string>('de')
  const profile$ = new BehaviorSubject<any>({})
  const mockActivatedRoute = { snapshot: { data: {} } }
  const mockUserService = { lang$, profile$ }
  const mockSlotService = jasmine.createSpyObj('SlotService', [
    'init',
    'isSomeComponentDefinedForSlot',
    'getComponentsForSlot'
  ])
  mockSlotService.isSomeComponentDefinedForSlot.and.returnValue(of(true))
  mockSlotService.getComponentsForSlot.and.returnValue(of([]))
  /*
   *  Fake (empty) components
   *  This is necessary because the real components uses stuff which is not available.
   *  See overrideComponent() below, where the Mock components are used instead of the real ones.
   */
  @Component({ selector: 'ocx-portal-page', standalone: true, template: '<ng-content></ng-content>' })
  class MockPortalPageComponent {}
  @Directive({
    selector: '[ocxIfPermission]',
    standalone: true
  })
  class MockOcxIfPermissionDirective {
    ocxIfPermission = input<any>()
    private templateRef = inject(TemplateRef)
    private viewContainer = inject(ViewContainerRef)

    constructor() {
      this.viewContainer.createEmbeddedView(this.templateRef)
    }
  }

  function initTestComponent(): void {
    fixture = TestBed.createComponent(WelcomeOverviewComponent)
    component = fixture.componentInstance
    componentTypeLess = component as unknown as Record<string, unknown>
    fixture.detectChanges()
  }

  beforeEach(waitForAsync(() => {
    appStateSubject = new BehaviorSubject<Workspace | undefined>(undefined)
    TestBed.configureTestingModule({
      imports: [
        WelcomeOverviewComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: SlotService, useValue: mockSlotService },
        { provide: UserService, useValue: mockUserService },
        { provide: AppStateService, useValue: { currentWorkspace$: appStateSubject.asObservable() } },
        { provide: PermissionService, useValue: { hasPermission: () => of(true), getPermissions: () => of([]) } },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ImagesInternalAPIService, useValue: imageServiceSpy }
      ]
    })
      // replace problematic components with mocks to avoid errors during testing
      .overrideComponent(WelcomeOverviewComponent, {
        remove: { imports: [AngularAcceleratorModule, PortalPageComponent] },
        add: { imports: [MockPortalPageComponent, MockOcxIfPermissionDirective] }
      })
      .compileComponents()
  }))

  beforeEach(() => {
    initTestComponent()
    // reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    imageServiceSpy.getAllImageInfosByWorkspaceName.calls.reset()
    imageServiceSpy.getImageById.calls.reset()
    ;(component as any).imageService = imageServiceSpy
    ;(component as any).msgService = msgServiceSpy
    // default data
    lang$.next('de')
  })

  it('should create', (done) => {
    expect(component).toBeTruthy()
    component.dockItems$.subscribe({
      next: (items) => {
        expect(items).toHaveSize(1)
        done()
      },
      error: done.fail
    })
  })

  it('should set workspace and load images when workspace becomes available', () => {
    imageServiceSpy.getAllImageInfosByWorkspaceName.and.returnValue(of([]))
    spyOn<any>(component, 'getImages')

    appStateSubject.next(ws)

    expect(component.workspace).toEqual(ws)
    expect(component['getImages']).toHaveBeenCalled()
  })

  describe('getImages', () => {
    it('should return early and reset loading when workspace has no name', () => {
      component.workspace = undefined
      component.loading = true

      component['getImages']()

      expect(component.loading).toBeFalse()
    })

    describe('with workspace', () => {
      beforeEach(() => {
        component.workspace = ws
      })

      it('should get infos for all images', (done) => {
        imageServiceSpy.getAllImageInfosByWorkspaceName.and.returnValue(of(imageInfos))

        component['getImages']()

        component.imageInfo$?.subscribe({
          next: (imgs) => {
            expect(imgs).toHaveSize(5)
            done()
          },
          error: done.fail
        })
      })

      it('should handle error when fetching imageinfos', (done) => {
        const errorResponse = { status: 404, statusText: 'Not Found' }
        imageServiceSpy.getAllImageInfosByWorkspaceName.and.returnValue(throwError(() => errorResponse))
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
  })

  describe('fetchImageData', () => {
    it('should not fetch images if they are already loaded', () => {
      componentTypeLess['imageData'] = [{ imageId: '123', mimeType: 'image/png', imageData: new Blob() }]

      component['fetchImageData'](imageInfos)

      expect(imageServiceSpy.getImageById).not.toHaveBeenCalled()
    })

    it('should not fetch images if no image info is available', () => {
      component['fetchImageData']([])

      expect(imageServiceSpy.getImageById).not.toHaveBeenCalled()
    })

    it('should not fetch images if no image to loaded is available', () => {
      const iInfos: ImageInfo[] = [imageInfos[0]]
      spyOn<any>(component, 'setCarousel')

      component['fetchImageData'](iInfos)

      expect(imageServiceSpy.getImageById).not.toHaveBeenCalled()
      expect(component['setCarousel']).toHaveBeenCalled()
    })

    it('should get data for one image: position -1', () => {
      const imgDataResponse: ImageDataResponse = { imageId: 'id' }
      imageServiceSpy.getImageById.and.returnValue(of(imgDataResponse))
      component.currentImagePos.set(-1)

      component['fetchImageData'](imageInfos)

      expect(component['imageData']).toContain(imgDataResponse)
    })

    it('should get data for one image: position 0', () => {
      const imgDataResponse: ImageDataResponse = { imageId: 'id' }
      imageServiceSpy.getImageById.and.returnValue(of(imgDataResponse))
      component.currentImagePos.set(0)

      component['fetchImageData'](imageInfos)

      expect(component['imageData']).toContain(imgDataResponse)
    })
  })

  describe('setCarousel', () => {
    it('should advance currentImagePos on each tick', fakeAsync(() => {
      componentTypeLess['imageAvailableNumbers'] = [0, 1, 2, 3, 4]
      component.currentImagePos.set(0)

      component['setCarousel'](5)
      tick(0)

      expect(component.currentImagePos()).toBe(1)
      discardPeriodicTasks()
    }))
  })

  describe('getNextAvailableImagePos - edge cases', () => {
    it('should return to the first available image if current position is beyond the last', () => {
      componentTypeLess['imageAvailableNumbers'] = [0, 1, 2, 3, 4]
      const nextPos = component['getNextAvailableImagePos'](5)

      expect(nextPos).toBe(0)
    })

    it('should prevent a position which is not available', () => {
      componentTypeLess['imageAvailableNumbers'] = [0, 1, 2, 3, 4]
      componentTypeLess['imageUnavailableNumbers'] = [2]
      const nextPos = component['getNextAvailableImagePos'](1)

      expect(nextPos).toBe(3)
    })
  })

  describe('onImageLoadError', () => {
    it('should add the failed position to imageUnavailableNumbers', () => {
      componentTypeLess['imageAvailableNumbers'] = [0, 1, 2]

      component.onImageLoadError(0)

      expect(componentTypeLess['imageUnavailableNumbers'] as number[]).toContain(0)
    })

    it('should advance currentImagePos to the next available image', () => {
      componentTypeLess['imageAvailableNumbers'] = [0, 1, 2]

      component.onImageLoadError(0)

      expect(component.currentImagePos()).toBe(1)
    })
  })

  describe('buildImageSrc', () => {
    it('should return data string if image is found', () => {
      component.loading = false
      componentTypeLess['imageData'] = []

      const result = component.buildImageSrc(imageInfos.find((i) => i.imageId === '1234')!)

      expect(result).toBeUndefined()
    })

    it('should not build source if page is loading', () => {
      componentTypeLess['imageData'] = [{ imageId: '123', mimeType: 'image/png', imageData: new Blob() }]

      const result = component.buildImageSrc(imageInfos[0])

      expect(result).toBeUndefined()
    })

    it('should return the URL if image is based on', () => {
      componentTypeLess['imageData'] = [{ imageId: '123' }]
      component.loading = false
      const info = imageInfos.find((i) => i.imageId === '123')!

      const result = component.buildImageSrc(info)

      expect(result).toBe(info.url)
    })

    it('should return data string if image is found', () => {
      componentTypeLess['imageData'] = [{ imageId: '1234', mimeType: 'image/png', imageData: 'abc123' as any }]
      component.loading = false

      const result = component.buildImageSrc(imageInfos.find((i) => i.imageId === '1234')!)

      expect(result).toBe('data:image/png;base64,abc123')
    })

    it('should return data URI with empty base64 when imageData field is undefined', () => {
      componentTypeLess['imageData'] = [{ imageId: '1234', mimeType: 'image/png', imageData: undefined }]
      component.loading = false

      const result = component.buildImageSrc(imageInfos.find((i) => i.imageId === '1234')!)

      expect(result).toBe('data:image/png;base64,')
    })

    it('should return base64 string with empty data if image is not matched in loaded imageData', () => {
      componentTypeLess['imageData'] = [{ imageId: 'other', mimeType: 'image/png' }]
      component.loading = false

      const result = component.buildImageSrc(imageInfos.find((i) => i.imageId === '1234')!)

      expect(result).toBe('data:undefined;base64,')
    })
  })
})
