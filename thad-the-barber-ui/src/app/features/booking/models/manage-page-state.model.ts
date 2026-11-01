/** What the manage page keeps in `history.state`, so a reload still has it once the link's fragment is gone. */
export interface ManagePageState {
  /** Set by the booking page when it opens the manage page after a booking. */
  isJustBooked?: boolean;
  manageToken?: string;
}
