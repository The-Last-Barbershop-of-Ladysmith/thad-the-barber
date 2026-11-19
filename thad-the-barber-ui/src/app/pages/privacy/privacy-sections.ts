import { LegalPartKind } from '../../shared/models/legal-part-kind.model';
import { LegalSection } from '../../shared/models/legal-section.model';

export const PRIVACY_SECTIONS: readonly LegalSection[] = [
  {
    label: 'What we collect',
    fragment: 'collect',
    paragraphs: [
      [
        { kind: LegalPartKind.Text, text: 'When you book with ' },
        { kind: LegalPartKind.ShopName },
        {
          kind: LegalPartKind.Text,
          text: ' on this site, we ask for your name, your phone number and the time you pick. '
            + "That's all for a booking: there's no account and no payment.",
        },
      ],
    ],
  },
  {
    label: 'Why we collect it',
    fragment: 'why',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: "Your name and phone book the appointment, so the shop knows who's coming and can reach you about it. "
            + "We don't sell them. We use your phone for the shop's news texts only if you choose to get them.",
        },
      ],
    ],
  },
  {
    label: 'Booking texts',
    fragment: 'texts',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: "After you book, the shop's booking system, Square, texts the phone number you gave to confirm your "
            + 'appointment, and may text a reminder before it. A text is sent only after you tick the box for it on '
            + 'the booking form, which starts unticked, and submit a booking with a phone number. You can book without '
            + 'ticking it. Booking texts never include promotions.',
        },
      ],
      [
        {
          kind: LegalPartKind.Text,
          text: 'Reply STOP to any of these texts to stop them. Reply HELP for help, or call or text ',
        },
        { kind: LegalPartKind.ShopName },
        { kind: LegalPartKind.Text, text: ' at ' },
        { kind: LegalPartKind.Phone },
        { kind: LegalPartKind.Text, text: '. Message and data rates may apply.' },
      ],
      [
        {
          kind: LegalPartKind.Text,
          text: 'Your number is used only for booking texts and, if you choose them, shop news texts. It is never '
            + 'shared or sold. If you ask to find your bookings, we also text a one-time code to that number, once '
            + 'for each request.',
        },
      ],
    ],
  },
  {
    label: 'Shop news texts',
    fragment: 'news-texts',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: 'Separately from booking texts, you can choose to get news from the shop by text: openings, closures, '
            + 'special hours and offers, no more than 4 a month. You choose this with its own box on the booking '
            + 'form, which starts unticked, or on the text updates sign-up. You can book without ticking it.',
        },
      ],
      [
        {
          kind: LegalPartKind.Text,
          text: 'If you choose it, the shop keeps your phone number, the date you agreed and where you agreed '
            + '(the booking form or the sign-up) in a private list in its Azure storage, so the shop can send you '
            + 'its news and show that you agreed. The list is never shared or sold. Reply STOP to any news text to '
            + 'stop them, or call or text the shop to be taken off the list. Message and data rates may apply.',
        },
      ],
    ],
  },
  {
    label: "Where it's kept",
    fragment: 'where',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: "Bookings go straight into Square, the shop's booking system. This site keeps no copy of its own. "
            + "If you've booked before, your booking is linked to the customer record Square already has for your "
            + "phone number. Square's ",
        },
        {
          kind: LegalPartKind.ExternalLink,
          text: 'privacy notice',
          href: 'https://squareup.com/us/en/legal/general/privacy',
        },
        { kind: LegalPartKind.Text, text: ' covers how Square handles it.' },
      ],
    ],
  },
  {
    label: "How long it's kept",
    fragment: 'how-long',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: "Your details stay in the shop's Square customer list until the shop removes them. "
            + 'To have your details corrected or deleted, call or text the shop.',
        },
      ],
    ],
  },
  {
    label: 'Contact messages',
    fragment: 'contact',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: 'If you write to the shop from the contact page, we keep your message and what you choose to give: '
            + 'a name, an email address, a phone number and, for a problem, the page or booking involved. A question '
            + 'or a problem needs a name and an email or phone number, so the shop can reply; feedback can be '
            + 'anonymous.',
        },
      ],
      [
        {
          kind: LegalPartKind.Text,
          text: "Each message is saved privately, as its own file in the shop's Azure storage, and is used only to "
            + 'answer you or fix the problem. A question or a problem also sends the shop an alert that names the '
            + 'kind of message and its file, never your details. Messages are never shared or sold, and the shop '
            + 'keeps one until it removes it. To have yours deleted, call or text the shop.',
        },
      ],
    ],
  },
  {
    label: 'The bot check',
    fragment: 'bot',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: "When you open the home page, the booking page, the contact page or a booking's manage link, Google "
            + "reCAPTCHA checks that you're a person, not a bot. It uses Google cookies and sends information "
            + 'about your device and how you use the page to Google. The Google ',
        },
        {
          kind: LegalPartKind.ExternalLink,
          text: 'Privacy Policy',
          href: 'https://policies.google.com/privacy',
        },
        { kind: LegalPartKind.Text, text: ' and ' },
        {
          kind: LegalPartKind.ExternalLink,
          text: 'Terms of Service',
          href: 'https://policies.google.com/terms',
        },
        { kind: LegalPartKind.Text, text: ' apply.' },
      ],
    ],
  },
  {
    label: 'The map',
    fragment: 'map',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: 'The map on the home page comes from Google Maps, which may set Google cookies when it loads.',
        },
      ],
    ],
  },
  {
    label: 'Site statistics',
    fragment: 'stats',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: 'To find errors and slow pages, the site records which pages are visited, how fast they load and '
            + 'the errors it hits, with Microsoft Azure Application Insights. It uses no cookies and never '
            + 'records names or phone numbers.',
        },
      ],
    ],
  },
  {
    label: 'Your browser',
    fragment: 'browser',
    paragraphs: [
      [
        {
          kind: LegalPartKind.Text,
          text: "The site saves the shop's details, such as its hours and address, in your browser so pages load "
            + 'faster. It never saves your name or phone number.',
        },
      ],
      [
        {
          kind: LegalPartKind.Text,
          text: 'After you book, you get a link to manage your appointment. Anyone with that link can reschedule '
            + 'or cancel it, so keep it to yourself. Your browser keeps an opened manage link in that tab\'s '
            + "history, so on a shared device, close the browser when you're done.",
        },
      ],
    ],
  },
  {
    label: 'Questions',
    fragment: 'questions',
    paragraphs: [
      [
        { kind: LegalPartKind.Text, text: 'Call or text ' },
        { kind: LegalPartKind.ShopName },
        { kind: LegalPartKind.Text, text: ' at ' },
        { kind: LegalPartKind.Phone },
        { kind: LegalPartKind.Text, text: ". If this policy changes, we'll update this page and the date above it." },
      ],
    ],
  },
];
