/** `PUT /api/admin/shop`: the notice text (blank to use Square's) and whether it shows. */
export interface ShopInfoSaveRequestDto {
  notice: string | null;
  isNoticeShown: boolean;
}
