import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { FileSelectEvent } from 'primeng/fileupload'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { ConfigExportImportAPIService, ObjectFit, WelcomeSnapshot } from 'src/app/shared/generated'
import { WelcomeImportComponent } from './welcome-import.component'

const imageDTO: WelcomeSnapshot = {
  id: 'export-id',
  created: '2025-02-03T15:30:53.122632Z',
  config: {
    images: [
      {
        image: {
          visible: true,
          position: '1',
          url: 'http://example.com/image1.png',
          objectFit: ObjectFit.ScaleDown,
          objectPosition: undefined,
          backgroundColor: 'unset'
        },
        imageData: undefined
      },
      {
        image: {
          visible: true,
          position: '2',
          url: undefined,
          objectFit: ObjectFit.ScaleDown,
          objectPosition: 'center center',
          backgroundColor: 'white'
        },
        imageData: {
          imageData: new Blob(['/9j/4AAQSkZJRgABAQEASABIAAD'], { type: 'image/*' }),
          dataLength: 37,
          mimeType: 'image/*'
        }
      }
    ]
  }
}

describe('WelcomeImportComponent', () => {
  let component: WelcomeImportComponent
  let fixture: ComponentFixture<WelcomeImportComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const eximServiceSpy = {
    importConfiguration: jasmine.createSpy('importConfiguration').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WelcomeImportComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '', component: WelcomeImportComponent }]),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ConfigExportImportAPIService, useValue: eximServiceSpy }
      ]
    }).compileComponents()
    // reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    eximServiceSpy.importConfiguration.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WelcomeImportComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should clear import', () => {
    component.onImportClear()

    expect(component.importError).toBeFalse()
  })

  describe('close dialog', () => {
    it('should close on successful import', () => {
      spyOn(component.importEmitter, 'emit')

      component.onClose(true)

      expect(component.importEmitter.emit).toHaveBeenCalledOnceWith(true)
    })

    it('should close on aborted import', () => {
      spyOn(component.importEmitter, 'emit')

      component.onClose(false)

      expect(component.importEmitter.emit).toHaveBeenCalledOnceWith(false)
    })
  })

  describe('import', () => {
    it('should prepare import from a valid file: success', () => {
      const validJson = JSON.stringify(imageDTO)
      const mockFile = new File([validJson], 'test.json', { type: 'application/json' })
      spyOn(mockFile, 'text').and.returnValue(Promise.resolve(validJson))
      const fileList = { 0: mockFile, length: 1, item: () => mockFile }

      component.onImportSelect({ files: fileList } as any as FileSelectEvent)

      expect(component.importError).toBeFalse()
    })

    it('should prepare import from a valid file: invalid data', (done) => {
      const validJson = JSON.stringify({ invalid: 'data' })
      const mockFile = new File([validJson], 'test.json', { type: 'application/json' })
      spyOn(mockFile, 'text').and.returnValue(Promise.resolve(validJson))
      const fileList = { 0: mockFile, length: 1, item: () => mockFile }
      spyOn(console, 'error')

      component.onImportSelect({ files: fileList } as any as FileSelectEvent)

      setTimeout(() => {
        expect(component.importError).toBeTrue()
        expect(console.error).toHaveBeenCalledWith(
          'imported welcome configuration parse error',
          Object({ invalid: 'data' })
        )
        done()
      }, 0)
    })

    it('should prepare import from a valid file: not json', (done) => {
      const invalidJson = 'bla'
      const mockFile = new File([invalidJson], 'test.json', { type: 'application/json' })
      spyOn(mockFile, 'text').and.returnValue(Promise.resolve(invalidJson))
      const fileList = { 0: mockFile, length: 1, item: () => mockFile }
      spyOn(console, 'error')

      component.onImportSelect({ files: fileList } as any as FileSelectEvent)

      setTimeout(() => {
        expect(component.importError).toBeTrue()
        expect(console.error).toHaveBeenCalled()
        done()
      }, 0)
    })

    it('should import a and close the dialog', () => {
      eximServiceSpy.importConfiguration.and.returnValue(of({}))
      spyOn(component.importEmitter, 'emit')
      spyOn(component, 'onClose')
      component.workspaceName = 'wsName'
      component['config'] = imageDTO

      component.onImportConfirmation()

      expect(component.importEmitter.emit).toHaveBeenCalled()
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.IMPORT.MESSAGE_OK' })
      expect(component.onClose).toHaveBeenCalledWith(true)
    })

    it('should display error if import api call fails', () => {
      const errorResponse = { status: 400, statusText: 'Error on import configuration' }
      eximServiceSpy.importConfiguration.and.returnValue(throwError(() => errorResponse))
      spyOn(component.importEmitter, 'emit')
      spyOn(console, 'error')
      component.workspaceName = 'wsName'
      component['config'] = imageDTO

      component.onImportConfirmation()

      expect(component.importEmitter.emit).toHaveBeenCalled()
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.IMPORT.MESSAGE_NOK' })
      expect(console.error).toHaveBeenCalledWith('importConfiguration', errorResponse)
    })
  })
})
