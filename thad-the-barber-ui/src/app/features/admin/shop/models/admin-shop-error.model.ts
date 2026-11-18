/** What the shop info page says went wrong, by the API's problem `code`. */
export enum AdminShopError {
  /** The file can't be read or saved (`shop_info_unavailable`). */
  Unavailable = 'unavailable',
  /** The save was refused as invalid (`validation_failed`). */
  Invalid = 'invalid',
  Failed = 'failed',
}
