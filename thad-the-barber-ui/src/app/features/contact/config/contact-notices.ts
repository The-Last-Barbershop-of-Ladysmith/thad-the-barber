import { Notice } from '../../../shared/models/notice.model';
import { NoticeSeverity } from '../../../shared/models/notice-severity.model';
import { ProblemCode } from '../../../shared/models/problem-code.model';

export const CONTACT_SENT_NOTICE: Notice = {
  severity: NoticeSeverity.Success,
  title: 'Message sent.',
  text: 'Thank you. If you asked a question or reported a problem, the shop will reply by phone or email.',
  canRetry: false,
};

export const CONTACT_FAILED_NOTICE: Notice = {
  severity: NoticeSeverity.Error,
  text: 'We couldn’t send your message.',
  canRetry: true,
};

export const CONTACT_PROBLEM_NOTICES: Record<string, Notice> = {
  [ProblemCode.RateLimited]: {
    severity: NoticeSeverity.Warn,
    text: 'Too many messages from this device for now.',
    canRetry: false,
  },
  [ProblemCode.BotCheckFailed]: {
    severity: NoticeSeverity.Warn,
    text: 'We can’t take messages from this browser.',
    canRetry: false,
  },
  [ProblemCode.ContactUnavailable]: {
    severity: NoticeSeverity.Error,
    text: 'Messages can’t be sent right now.',
    canRetry: false,
  },
  [ProblemCode.ValidationFailed]: {
    severity: NoticeSeverity.Warn,
    text: 'Please check the form and send it again.',
    canRetry: false,
  },
};
