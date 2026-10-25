import { ButtonVariant } from '../../../shared/models/button.models';
import { LinkKind } from '../../../shared/models/link.models';

export interface AnnouncementButton {
  label: string;
  url: string;
  kind: LinkKind;
  variant: ButtonVariant;
}
