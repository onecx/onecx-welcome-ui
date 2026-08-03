import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core'
import { NgStyle } from '@angular/common'
import { TranslateModule } from '@ngx-translate/core'

import type { ImageDataResponse, ImageInfo } from 'src/app/shared/generated'

@Component({
  selector: 'app-image-item',
  standalone: true,
  imports: [NgStyle, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<img
    [src]="imageSrc()"
    class="border-round-sm w-13rem sm:w-14rem md:w-18rem h-7rem sm:h-9rem md:h-13rem"
    [ngStyle]="{
      'object-fit': imageInfo().objectFit ?? 'scale-down',
      'object-position': imageInfo().objectPosition ?? 'center center',
      'background-color': imageInfo().backgroundColor ?? 'unset'
    }"
    [alt]="('DIALOG.DETAIL.PIC' | translate) + '_' + index()"
    [attr.aria-label]="'DIALOG.DETAIL.TOOLTIP' | translate"
  />`
})
export class ImageItemComponent {
  public readonly index = input.required<any>()
  public readonly imageInfo = input.required<ImageInfo>()
  public readonly imageData = input.required<ImageDataResponse[]>()
  public readonly blobUrls = input.required<Map<string, string>>()

  public imageSrc = computed(() => {
    const images = this.imageData()
    const blobUrls = this.blobUrls()
    const imageInfo = this.imageInfo()

    if (!images || images.length === 0) return undefined
    return this.buildImageSrc(imageInfo, images, blobUrls)
  })

  private buildImageSrc(ii: ImageInfo, ids: ImageDataResponse[], blobUrls: Map<string, string>): string | undefined {
    const image = ids.find((img) => img.imageId === ii.imageId)
    if (image) {
      const imageData = image?.imageData
      if (!imageData || !image.imageId) return undefined
      if (imageData instanceof Blob) {
        const cachedBlobUrl = blobUrls.get(image.imageId)
        if (cachedBlobUrl) return cachedBlobUrl
        const blobUrl = URL.createObjectURL(imageData)
        blobUrls.set(image.imageId, blobUrl)
        return blobUrl
      }
      return 'data:' + image?.mimeType + ';base64,' + imageData
    } else {
      return ii.url
    }
  }
}
