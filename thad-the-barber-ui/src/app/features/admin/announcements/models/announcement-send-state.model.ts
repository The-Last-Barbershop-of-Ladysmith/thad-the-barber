/** Where an announcement's text is, as the API says: waiting for its first day, ready, going out, or done. */
export enum AnnouncementSendState {
  Scheduled = 'scheduled',
  Queued = 'queued',
  Sending = 'sending',
  Done = 'done',
}
