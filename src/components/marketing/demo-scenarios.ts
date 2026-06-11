// Scenario data for the rotating demo showcase. Pure TS (no React) so the
// vitest node environment can import it directly.

export type Step =
  | { type: "user" | "gigler"; text: string; hold: number }
  | { type: "typing"; hold: number }
  | { type: "map"; place: string; city: string; hold: number }
  | { type: "email"; subject: string; to: string; hold: number };

export type Annotation = {
  /** Script index whose appearance reveals this annotation. */
  afterStep: number;
  side: "left" | "right";
  title: string;
  body: string;
};

export type Scenario = {
  id: "dinner" | "trip" | "calls" | "email";
  /** Second line of the "Gigler can …" headline. */
  phrase: string;
  /** Used in the dot's aria-label: "Show the {label} demo". */
  label: string;
  script: Step[];
  annotations: Annotation[];
};

export const SCENARIOS: Scenario[] = [
  {
    id: "dinner",
    phrase: "book your dinner",
    label: "dinner reservation",
    script: [
      {
        type: "user",
        text: "Can you get us a table for 4 somewhere good Friday at 7?",
        hold: 1300,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "On it. You loved Italian last month, checking a couple of spots near you.",
        hold: 1700,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "Give me one sec to call them and see what tables they have.",
        hold: 1700,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "Via Carota has Friday, 7:15 for 4. Want it?",
        hold: 1400,
      },
      { type: "user", text: "Yes, book it", hold: 1200 },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "Done. Table for 4, Friday 7:15 PM. Confirmation's in your email, and here's the spot:",
        hold: 1400,
      },
      { type: "map", place: "Via Carota", city: "New York, NY", hold: 5200 },
    ],
    annotations: [
      {
        afterStep: 2,
        side: "left",
        title: "It remembers",
        body: "“You loved Italian last month.” No re-explaining.",
      },
      {
        afterStep: 10,
        side: "right",
        title: "Reservation made",
        body: "Real bookings, real confirmations. Not just advice.",
      },
    ],
  },
  {
    id: "trip",
    phrase: "plan your trip",
    label: "trip planning",
    script: [
      {
        type: "user",
        text: "Can you find me a flight to NYC for my brother's birthday? Under $300",
        hold: 1300,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "On it — his birthday's Friday the 26th. Delta nonstop, LAX to JFK, $284. Leaves 9:30 AM, lands 6:05 PM. Book it?",
        hold: 1900,
      },
      { type: "user", text: "Yes, and a hotel near SoHo", hold: 1200 },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "Flight's booked. The Dominick in SoHo is $219 a night, rated 4.7 stars. Want it?",
        hold: 1700,
      },
      { type: "user", text: "Book it", hold: 1200 },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "Done. Boarding pass coming Thursday, and the whole trip's on your calendar.",
        hold: 4800,
      },
    ],
    annotations: [
      {
        afterStep: 5,
        side: "left",
        title: "One ask, whole trip",
        body: "Flight, hotel, follow-ups. One thread.",
      },
      {
        afterStep: 8,
        side: "right",
        title: "On your calendar",
        body: "Boarding pass, check-in, all of it.",
      },
    ],
  },
  {
    id: "calls",
    phrase: "make your calls",
    label: "phone call",
    script: [
      {
        type: "user",
        text: "My internet bill jumped $30 this month. Can you deal with it?",
        hold: 1300,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "That's not right. On it, calling them now.",
        hold: 1700,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "On hold with billing. You don't have to do a thing.",
        hold: 2200,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "Done. They applied a $30 credit and moved you to a cheaper plan, $42 a month starting next cycle.",
        hold: 1400,
      },
      { type: "user", text: "You're the best", hold: 4800 },
    ],
    annotations: [
      {
        afterStep: 2,
        side: "right",
        title: "It makes the call",
        body: "Waits on hold, talks to a human, texts you the result.",
      },
    ],
  },
  {
    id: "email",
    phrase: "handle your email",
    label: "email",
    script: [
      {
        type: "user",
        text: "The kitchen sink's been leaking since Monday. Can you get the landlord on it?",
        hold: 1300,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "On it. Writing to Westside Property now, I'll ask them to send a plumber this week.",
        hold: 1700,
      },
      { type: "typing", hold: 1500 },
      { type: "gigler", text: "Sent. Here's a copy:", hold: 1200 },
      {
        type: "email",
        subject: "Kitchen leak repair request",
        to: "Westside Property",
        hold: 5200,
      },
    ],
    annotations: [
      {
        afterStep: 5,
        side: "left",
        title: "Real emails, actually sent",
        body: "Drafted, sent, and followed up for you.",
      },
    ],
  },
];
