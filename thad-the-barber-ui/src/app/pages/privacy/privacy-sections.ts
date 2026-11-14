import { PrivacyPartKind } from './models/privacy-part-kind.model';
import { PrivacySection } from './models/privacy-section.model';

export const PRIVACY_SECTIONS: readonly PrivacySection[] = [
  {
    label: 'What we collect',
    fragment: 'collect',
    paragraphs: [
      [
        { kind: PrivacyPartKind.Text, text: 'When you book with ' },
        { kind: PrivacyPartKind.ShopName },
        {
          kind: PrivacyPartKind.Text,
          text: ' on this site, we ask for your name, your phone number and the time you pick. '
            + "That's all: there's no account, no email address and no payment.",
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
          kind: PrivacyPartKind.Text,
          text: "Your name and phone book the appointment, so the shop knows who's coming and can reach you about it. "
            + "We don't sell them, and we don't use them for marketing.",
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
          kind: PrivacyPartKind.Text,
          text: "After you book, the shop's booking system, Square, texts the phone number you gave to confirm your "
            + 'appointment, and may text a reminder before it. A text is sent only after you submit a booking with a '
            + 'phone number. You get no other texts from us, and no promotions.',
        },
      ],
      [
        {
          kind: PrivacyPartKind.Text,
          text: 'Reply STOP to any of these texts to stop them. Reply HELP for help, or call or text ',
        },
        { kind: PrivacyPartKind.ShopName },
        { kind: PrivacyPartKind.Text, text: ' at ' },
        { kind: PrivacyPartKind.Phone },
        { kind: PrivacyPartKind.Text, text: '. Message and data rates may apply.' },
      ],
      [
        {
          kind: PrivacyPartKind.Text,
          text: 'Your number is used only for booking texts. It is never shared or sold. If you ask to find your '
            + 'bookings, we also text a one-time code to that number, once for each request.',
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
          kind: PrivacyPartKind.Text,
          text: "Bookings go straight into Square, the shop's booking system. This site keeps no copy of its own. "
            + "If you've booked before, your booking is linked to the customer record Square already has for your "
            + "phone number. Square's ",
        },
        {
          kind: PrivacyPartKind.ExternalLink,
          text: 'privacy notice',
          href: 'https://squareup.com/us/en/legal/general/privacy',
        },
        { kind: PrivacyPartKind.Text, text: ' covers how Square handles it.' },
      ],
    ],
  },
  {
    label: "How long it's kept",
    fragment: 'how-long',
    paragraphs: [
      [
        {
          kind: PrivacyPartKind.Text,
          text: "Your details stay in the shop's Square customer list until the shop removes them. "
            + 'To have your details corrected or deleted, call or text the shop.',
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
          kind: PrivacyPartKind.Text,
          text: "When you open the home page, the booking page or a booking's manage link, Google reCAPTCHA checks that "
            + "you're a person, not a bot. It uses Google cookies and sends information about your device and how you use "
            + 'the page to Google. The Google ',
        },
        {
          kind: PrivacyPartKind.ExternalLink,
          text: 'Privacy Policy',
          href: 'https://policies.google.com/privacy',
        },
        { kind: PrivacyPartKind.Text, text: ' and ' },
        {
          kind: PrivacyPartKind.ExternalLink,
          text: 'Terms of Service',
          href: 'https://policies.google.com/terms',
        },
        { kind: PrivacyPartKind.Text, text: ' apply.' },
      ],
    ],
  },
  {
    label: 'The map',
    fragment: 'map',
    paragraphs: [
      [
        {
          kind: PrivacyPartKind.Text,
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
          kind: PrivacyPartKind.Text,
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
          kind: PrivacyPartKind.Text,
          text: "The site saves the shop's details, such as its hours and address, in your browser so pages load "
            + 'faster. It never saves your name or phone number.',
        },
      ],
      [
        {
          kind: PrivacyPartKind.Text,
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
        { kind: PrivacyPartKind.Text, text: 'Call or text ' },
        { kind: PrivacyPartKind.ShopName },
        { kind: PrivacyPartKind.Text, text: ' at ' },
        { kind: PrivacyPartKind.Phone },
        { kind: PrivacyPartKind.Text, text: ". If this policy changes, we'll update this page and the date above it." },
      ],
    ],
  },
];
