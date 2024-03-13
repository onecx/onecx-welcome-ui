import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import {
  AppStateService,
  createTranslateLoader,
  PortalMessageService,
  UserService
} from '@onecx/portal-integration-angular'
import { of, throwError } from 'rxjs'
import { ImageInfo, ImagesInternalAPIService } from 'src/app/shared/generated'
import { WelcomeDetailComponent } from '../welcome-detail/welcome-detail.component'
describe('WelcomeDetailComponent', () => {
  let component: WelcomeDetailComponent
  let fixture: ComponentFixture<WelcomeDetailComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', [
    'success',
    'error',
    'info',
    'warning'
  ])

  const apiServiceSpy = {
    getAllImageInfos: jasmine.createSpy('getAllImageInfos').and.returnValue(of({})),
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
      declarations: [WelcomeDetailComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ImagesInternalAPIService, useValue: apiServiceSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.info.calls.reset()
    msgServiceSpy.warning.calls.reset()
    apiServiceSpy.getAllImageInfos.calls.reset()
    apiServiceSpy.getImageById.calls.reset()
    mockUserService.lang$.getValue.and.returnValue('de')
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WelcomeDetailComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })
  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should get all imageinfos onInit', () => {
    const imageInfos = [{ id: '123', url: 'http://onecx.de', visible: true, position: '1' } as ImageInfo]
    apiServiceSpy.getAllImageInfos.and.returnValue(of(imageInfos))
    component.imageInfos = []

    component.ngOnInit()

    expect(component.imageInfos).toContain({ id: '123', url: 'http://onecx.de', visible: true, position: '1' })
  })

  it('should log error if getAllImageInfos fails', () => {
    apiServiceSpy.getAllImageInfos.and.returnValue(throwError(() => new Error()))
    spyOn(console, 'error')

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.IMAGES.NOT_FOUND'
    })
  })

  it('should display image in carousel', () => {
    const imageInfos = [{ id: '123', url: 'http://onecx.de', visible: true, position: '1' } as ImageInfo]
    apiServiceSpy.getAllImageInfos.and.returnValue(of(imageInfos))
    component.imageInfos = []

    component.ngOnInit()
    fixture.detectChanges()
    const dElement = fixture.debugElement
    const nElement = dElement.nativeElement
    const slide = nElement.querySelector('.slide')

    expect(slide).toBeDefined()
  })
})
