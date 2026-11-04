/** What the manage page keeps in `history.state`, so a reload still has it once the link's fragment is gone. */
export interface ManagePageState {
  isJustBooked?: boolean;
  manageToken?: string;
}
