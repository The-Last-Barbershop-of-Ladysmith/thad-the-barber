import { LegalPartKind } from '../../shared/models/legal-part-kind.model';
import { LegalSection } from '../../shared/models/legal-section.model';

export const TERMS_SECTIONS: readonly LegalSection[] = [
  {
    label: 'Using this site',
    fragment: 'using',
    paragraphs: [
      [
        { kind: LegalPartKind.Text, text: 'This site belongs to ' },
        { kind: LegalPartKind.ShopName },
        {
          kind: LegalPartKind.Text,
          text: ' and lets you see open times, book a haircut and manage a booking you made. By using it you agree to '
            + 'these terms and to the privacy policy. If you disagree with either, please call or text the shop '
            + 'instead of using the site.',
        },
      ],
    ],
  },
  {
    label: 'Booking an appointment',
    fragment: 'booking',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: 'A booking holds the time you pick for the name and phone number you give. Please give your own name '
            + 'and a phone number you can be reached on. A booking is free to make: the site takes no payment, and '
            + 'you pay the shop when you are there.',
        },
      ],
      [
        {
          kind: LegalPartKind.Text,
          text: 'You can change or cancel a booking with its manage link, or by texting or calling the shop. '
            + 'Please do so as early as you can, so the time can go to someone else. The shop may cancel or move a '
            + 'booking if it has to, and will tell you if it does.',
        },
      ],
      [
        {
          kind: LegalPartKind.Text,
          text: 'Bookings are limited to a few at a time per phone number. This keeps times fair for everyone, and the '
            + 'site tells you if you reach the limit.',
        },
      ],
    ],
  },
  {
    label: 'Booking texts',
    fragment: 'booking-texts',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: 'When you book, you can agree to receive text messages about that appointment. This is the '
            + 'booking texts program: a text to confirm your appointment and, if the shop sends one, a reminder '
            + 'before it. You get a small number of texts for each booking, and none unless you book.',
        },
      ],
      [
        {
          kind: LegalPartKind.Text,
          text: 'Agreeing is optional and never needed to book. To get these texts, tick the box for them on the '
            + 'booking form, which starts unticked. '
            + 'Message and data rates may apply. Reply STOP to any text to stop them, or HELP for help. You can also '
            + 'call or text ',
        },
        { kind: LegalPartKind.Phone },
        {
          kind: LegalPartKind.Text,
          text: '. Carriers are not liable for delayed or undelivered messages.',
        },
      ],
    ],
  },
  {
    label: 'Shop news texts',
    fragment: 'shop-news-texts',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: 'Separately, you can choose to get shop news by text: openings, closures, special hours and offers '
            + 'from ',
        },
        { kind: LegalPartKind.ShopName },
        {
          kind: LegalPartKind.Text,
          text: '. This is optional and never needed to book a haircut or to get your booking texts. You choose it '
            + 'with its own box, which starts unticked, or on the text updates sign-up in the footer.',
        },
      ],
      [
        {
          kind: LegalPartKind.Text,
          text: 'Expect no more than 4 messages a month. Message and data rates may apply. Reply STOP at any time '
            + 'to stop them, or HELP for help. Stopping shop news texts does not stop your booking texts, and the '
            + 'other way round. Your number is never shared or sold, and is not used for anything else.',
        },
      ],
    ],
  },
  {
    label: 'Fair use',
    fragment: 'fair-use',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: "Please don't use the site to book times you don't plan to keep, to book for someone without their "
            + "say-so, to try to get around the site's limits or its bot check, or to break or overload it. The shop "
            + 'may cancel bookings made that way and may stop a phone number from booking again.',
        },
      ],
    ],
  },
  {
    label: 'Changes and availability',
    fragment: 'changes',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: 'Times, hours and the shop information on the site come from the shop and may change. The site tries '
            + 'to be available all the time but may be down for a while, and the shop is not responsible for a '
            + "missed booking because of that. If the site is down, call or text the shop, or use the shop's "
            + 'booking page on Square.',
        },
      ],
      [
        {
          kind: LegalPartKind.Text,
          text: 'The shop may update these terms. The date at the top of the page shows when they last changed, and '
            + 'continuing to use the site after that means you accept the new terms.',
        },
      ],
    ],
  },
  {
    label: 'Contact',
    fragment: 'contact',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: 'Questions about these terms or your bookings? Call or text ',
        },
        { kind: LegalPartKind.Phone },
        {
          kind: LegalPartKind.Text,
          text: ', or use the contact page. See the privacy policy for how your details are handled.',
        },
      ],
    ],
  },
];
