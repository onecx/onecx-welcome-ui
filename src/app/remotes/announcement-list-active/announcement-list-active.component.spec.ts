import { ComponentFixture, TestBed } from '@angular/core/testing'

import { ReplaySubject, of } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { CarouselModule } from 'primeng/carousel'
import { TagModule } from 'primeng/tag'

import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { AppConfigService, AppStateService } from '@onecx/portal-integration-angular'
import { OneCXAnnouncementListActiveComponent } from './announcement-list-active.component'
// import {
//   Announcement,
//   AnnouncementInternalAPIService,
//   AnnouncementPriorityType,
//   AnnouncementStatus
// } from 'src/app/shared/generated'

class MockAppStateService {
  currentPortal$ = {
    asObservable: () =>
      of({
        workspaceName: 'wsName'
      })
  }
  currentMfe$ = {
    asObservable: () =>
      of({
        productName: 'productName'
      })
  }
}

// const importantAnnouncement: Announcement = {
//   id: 'importantAnncmtId',
//   priority: AnnouncementPriorityType.Important,
//   status: AnnouncementStatus.Active
// }
// const normalAnnouncement: Announcement = {
//   priority: AnnouncementPriorityType.Normal,
//   status: AnnouncementStatus.Active
// }
// const lowPrioAnnouncement: Announcement = {
//   priority: AnnouncementPriorityType.Low
// }

describe('AnnouncementBannerComponent', () => {
  let component: OneCXAnnouncementListActiveComponent
  let fixture: ComponentFixture<OneCXAnnouncementListActiveComponent>
  let mockAppStateService: MockAppStateService

  //   const apiServiceSpy = {
  //     searchAnnouncementBanners: jasmine
  //       .createSpy('searchAnnouncementBanners')
  //       .and.returnValue(of({ stream: [normalAnnouncement] }))
  //   }

  let baseUrlSubject: ReplaySubject<any>
  beforeEach(() => {
    mockAppStateService = new MockAppStateService()
    baseUrlSubject = new ReplaySubject<any>(1)

    TestBed.configureTestingModule({
      declarations: [],
      imports: [
        TranslateTestingModule.withTranslations({
          en: require('../../../assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        { provide: AppStateService, useValue: mockAppStateService },
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: BASE_URL,
          useValue: baseUrlSubject
        }
      ]
    })
      .overrideComponent(OneCXAnnouncementListActiveComponent, {
        set: {
          imports: [TranslateTestingModule, CarouselModule, TagModule],
          providers: [
            // { provide: AnnouncementInternalAPIService, useValue: apiServiceSpy },
            { provide: AppConfigService },
            { provide: AppStateService, useValue: mockAppStateService }
          ]
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')

    // apiServiceSpy.searchAnnouncementBanners.calls.reset()
  })

  function initializeComponent() {
    fixture = TestBed.createComponent(OneCXAnnouncementListActiveComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  it('should create', () => {
    initializeComponent()
    expect(component).toBeTruthy()
  })

  describe('RemoteComponent initialization', () => {
    it('should call ocxInitRemoteComponent with the correct config', () => {
      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }
      spyOn(component, 'ocxInitRemoteComponent')

      component.ocxRemoteComponentConfig = mockConfig

      expect(component.ocxInitRemoteComponent).toHaveBeenCalledWith(mockConfig)
    })

    it('should initialize the remote component', (done: DoneFn) => {
      initializeComponent()

      component.ocxInitRemoteComponent({
        baseUrl: 'base_url'
      } as RemoteComponentConfig)

      baseUrlSubject.asObservable().subscribe((item) => {
        expect(item).toEqual('base_url')
        done()
      })
    })
  })
})
