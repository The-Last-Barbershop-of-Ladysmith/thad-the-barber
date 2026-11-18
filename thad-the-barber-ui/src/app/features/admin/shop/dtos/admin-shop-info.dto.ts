/**
 * `GET /api/admin/shop`: the notice the owner saved (null while Square's description is used), whether the booking page
 * shows a notice at all, and the Square description that shows when no text is saved.
 */
export interface AdminShopInfoDto {
  notice: string | null;
  isNoticeShown: boolean;
  squareNotice: string | null;
}
