import { TestBed, ComponentFixture } from '@angular/core/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'

import type { ImageDataResponse, ImageInfo, ObjectFit } from 'src/app/shared/generated'
import { ImageItemComponent } from './image-item.component'

describe('ImageItemComponent', () => {
  let component: ImageItemComponent
  let fixture: ComponentFixture<ImageItemComponent>
  let blobUrlsMap: Map<string, string>

  const mockBlob = new Blob([''], { type: 'image/png' })

  const mockImageInfo: ImageInfo = {
    imageId: 'img-123',
    url: 'http://fallback.com',
    objectFit: 'cover' as unknown as ObjectFit,
    objectPosition: 'center top',
    backgroundColor: '#ffffff',
    workspaceName: 'test-workspace'
  }

  beforeEach(async () => {
    blobUrlsMap = new Map<string, string>()

    spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/mock-blob-123')

    await TestBed.configureTestingModule({
      imports: [
        ImageItemComponent,
        TranslateTestingModule.withTranslations({
          en: {
            'DIALOG.DETAIL.PIC': 'Picture',
            'DIALOG.DETAIL.TOOLTIP': 'Tooltip Text'
          }
        }).withDefaultLanguage('en')
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(ImageItemComponent)
    component = fixture.componentInstance

    fixture.componentRef.setInput('index', 1)
    fixture.componentRef.setInput('imageInfo', mockImageInfo)
    fixture.componentRef.setInput('imageData', [] as ImageDataResponse[])
    fixture.componentRef.setInput('blobUrls', blobUrlsMap)

    fixture.detectChanges()
  })

  it('should create the component', () => {
    expect(component).toBeTruthy()
  })

  it('should return undefined if images array is empty', async () => {
    fixture.componentRef.setInput('imageData', [])
    fixture.detectChanges()
    await fixture.whenStable()

    expect(component.imageSrc()).toBeUndefined()
  })

  it('should return fallback URL from imageInfo if image is not found in images array', async () => {
    const dummyImages: ImageDataResponse[] = [
      {
        imageId: 'different-id',
        imageData: mockBlob
      }
    ]

    fixture.componentRef.setInput('imageData', dummyImages)
    fixture.detectChanges()
    await fixture.whenStable()

    expect(component.imageSrc()).toBe(mockImageInfo.url)
  })

  it('should create and cache blob URL if imageData is an instance of Blob', async () => {
    const blobImages: ImageDataResponse[] = [
      {
        imageId: 'img-123',
        imageData: mockBlob
      }
    ]

    fixture.componentRef.setInput('imageData', blobImages)
    fixture.detectChanges()
    await fixture.whenStable()

    expect(component.imageSrc()).toBe('blob:http://localhost/mock-blob-123')
    expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob)

    expect(blobUrlsMap.get('img-123')).toBe('blob:http://localhost/mock-blob-123')
  })

  it('should reuse cached blob URL from map if it already exists', async () => {
    const blobImages: ImageDataResponse[] = [
      {
        imageId: 'img-123',
        imageData: mockBlob
      }
    ]

    blobUrlsMap.set('img-123', 'blob:http://localhost/already-cached-url')

    fixture.componentRef.setInput('imageData', blobImages)
    fixture.detectChanges()
    await fixture.whenStable()

    expect(component.imageSrc()).toBe('blob:http://localhost/already-cached-url')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('should return base64 string fallback if imageData is somehow not a Blob', async () => {
    const fakeBase64Image = {
      imageId: 'img-123',
      mimeType: 'image/png',
      imageData: 'iVBORw0KGgoAAAANSU...' as unknown as Blob
    }

    fixture.componentRef.setInput('imageData', [fakeBase64Image])
    fixture.detectChanges()
    await fixture.whenStable()

    expect(component.imageSrc()).toBe('data:image/png;base64,iVBORw0KGgoAAAANSU...')
  })

  it('should return undefined if the found image has no imageId', async () => {
    const corruptedImages: ImageDataResponse[] = [
      {
        imageId: undefined,
        imageData: new Blob([''], { type: 'image/png' })
      }
    ]

    fixture.componentRef.setInput('imageInfo', { imageId: undefined })
    fixture.componentRef.setInput('imageData', corruptedImages)
    fixture.detectChanges()
    await fixture.whenStable()

    expect(component.imageSrc()).toBeUndefined()
  })

  it('should apply styles and attributes correctly to the img element', () => {
    const imgElement: HTMLImageElement = fixture.nativeElement.querySelector('img')

    expect(imgElement).toBeTruthy()
    expect(imgElement.style.objectFit).toBe('cover')
    expect(imgElement.style.objectPosition).toBe('center top')
    expect(imgElement.style.backgroundColor).toBe('rgb(255, 255, 255)')
    expect(imgElement.getAttribute('alt')).toBe('Picture_1')
    expect(imgElement.getAttribute('aria-label')).toBe('Tooltip Text')
  })
})
