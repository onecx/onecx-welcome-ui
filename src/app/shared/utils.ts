import { AbstractControl, FormArray, FormGroup } from '@angular/forms'
import { SelectItem } from 'primeng/api'

// This object encapsulates functions because ...
//  ...Jasmine has problems to spying direct imported functions
export const Utils = {
  mapping_error_status(status: number): number {
    return [400, 401, 403, 404, 500].includes(status) ? status : 0
  },

  limitText(text: string, limit: number): string {
    if (text) {
      return text.length < limit ? text : text.substring(0, limit) + '...'
    } else {
      return ''
    }
  },

  copyToClipboard(text?: string): void {
    if (text) navigator.clipboard.writeText(text)
  },

  getCurrentDateTime(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day}_${hours}${minutes}${seconds}`
  },

  /**
   *  FORM
   */
  forceFormValidation(form: AbstractControl): void {
    if (form instanceof FormGroup || form instanceof FormArray) {
      for (const inner in form.controls) {
        const control = form.get(inner)
        control && this.forceFormValidation(control)
      }
    } else {
      form.markAsDirty()
      form.markAsTouched()
      form.updateValueAndValidity()
    }
  },

  dropDownSortItemsByLabel(a: SelectItem, b: SelectItem): number {
    return (a.label ? a.label.toUpperCase() : '').localeCompare(b.label ? b.label.toUpperCase() : '')
  },
  dropDownGetLabelByValue(ddArray: SelectItem[], val: string): string | undefined {
    const a: any = ddArray.find((item: SelectItem) => {
      return item?.value == val
    })
    return a.label
  },
  sortByLocale(a: any, b: any): number {
    return a.toUpperCase().localeCompare(b.toUpperCase())
  }
}
