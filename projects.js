/* =============================================================
   projects.js  —  EDIT THIS FILE to change the site content.
   -------------------------------------------------------------
   This is the ONLY file you need to touch to add / rename / edit
   projects. The homepage builds every card from this data using
   .map(), so anything you change here shows up automatically.

   Each project card has four required fields, plus one optional:
     slug        kebab-case id
     title       the bold text (upper-right of the card)
     description one short sentence (lower-right of the card)
     image       path to the square logo on the LEFT of the card.
                 Leave "" to show an auto-generated monogram instead.
                 The add-project skill fills this with a screenshot,
                 but you can point it at ANY image, e.g.:
                   image: "imagine/waveform-editor/thumbnail.png"
     url         (optional) only set once a project has a real page
                 built for it. When present, the card links straight
                 to that page (a normal link, full page load). When
                 absent, the card opens a small placeholder page on
                 the site itself.

   FOLDER LAYOUT — a built project's files live in a folder that
   matches its section, not a flat "projects/" folder:
     imagine/<slug>/index.html
     enjoy/<slug>/index.html
     use/<slug>/index.html
     digest/<slug>/index.html
   e.g. the JanDorm project's url is "imagine/jandorm/index.html".

   To add a project by hand: copy one { ... } line, paste it into
   the right section, and edit the fields. Done.
   ============================================================= */


/* =============================================================
   HOME MENU  —  the numbered list on the homepage.
   -------------------------------------------------------------
   Reorder, rename, add, or remove lines freely. The numbers
   01, 02, 03 ... are added automatically, top to bottom.
     label = the BIG text shown on the homepage (write it any way)
     slug  = which page it opens; must match a section name in
             window.SITE below (about / use / imagine / enjoy / digest)
   ============================================================= */
// Hover on the homepage reveals a hidden letter. By default one letter is
// blanked automatically. Options per item:
//   blanks: 2      -> blank two letters automatically
//   masked: "..."  -> choose EXACTLY which letters are blanked ("_" = hidden;
//                     must be the same length as the label)
window.MENU = [
  { label: "ABOUT",   slug: "about"   },
  { label: "USE",     slug: "use"     },
  { label: "IMAGINE", slug: "imagine", masked: "_MA_INE" },
  { label: "ENJOY",   slug: "enjoy",   masked: "ENJ_Y"   },
  { label: "DIGEST",  slug: "digest"  }
];


/* =============================================================
   SECTION INTROS  —  one short line shown above the card grid on
   use / imagine / enjoy (about has its own paragraphs; digest has
   none for now). Leave a section out of this object to show no
   intro line at all. Currently lorem ipsum — replace with real
   copy whenever you're ready.
   ============================================================= */
window.SECTION_INTRO = {
  use:     "Lorem ipsum dolor sit amet, consectetur adipiscing elit — small tools built to solve one problem well.",
  imagine: "Lorem ipsum dolor sit amet, consectetur adipiscing elit — concepts and ideas that haven't fully shipped yet.",
  enjoy:   "Lorem ipsum dolor sit amet, consectetur adipiscing elit — things made purely because they were fun to make."
};


window.SITE = {

  /* -------- About page: one string per paragraph -------- */
  about: [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Isaac builds small tools, writes down loose concepts, and lets ideas sit until they are ready. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus, nulla gravida orci a odio."
  ],

  /* -------- Use (tools) -------- */
  use: [
    { slug: "waveform-editor", title: "Waveform Editor", description: "A browser-based audio slicer for trimming and layering short samples.", image: "" },
    { slug: "color-extractor", title: "Color Extractor", description: "Pull dominant palettes from any image and export them as tokens.",      image: "" },
    { slug: "markdown-deck",   title: "Markdown Deck",   description: "Turn a plain text file into a keyboard-driven slide presentation.",    image: "" },
    { slug: "unit-converter",  title: "Unit Converter",  description: "A tiny, fast converter for length, mass, temperature, and time.",     image: "" }
  ],

  /* -------- Imagine (concepts) -------- */
  imagine: [
    { slug: "slow-interfaces", title: "Slow Interfaces", description: "An exploration of software that intentionally resists urgency.",   image: "" },
    { slug: "local-first",     title: "Local First",     description: "Notes on building apps that own their data before the cloud does.", image: "" },
    { slug: "ambient-displays",title: "Ambient Displays", description: "Screens that inform at a glance without demanding attention.",     image: "" },
    { slug: "calm-automation", title: "Calm Automation", description: "Letting scripts do quiet work so the desk stays clear.",           image: "" },
    { slug: "jansport-outpost", title: "JanSport Outpost", description: "Carry your story. Find your Outpost.", image: "imagine/jansport-outpost/thumb.webp", url: "imagine/jansport-outpost/index.html" },
    { slug: "jandorm", title: "JanDorm", description: "A compact stay for travelers who carry their world with them.", image: "imagine/jandorm/thumb.webp", url: "imagine/jandorm/index.html" }
  ],

  /* -------- Enjoy (ideas) -------- */
  enjoy: [
    { slug: "the-reading-room", title: "The Reading Room", description: "A single-tab reader that hides everything but the words.",        image: "" },
    { slug: "grid-journal",     title: "Grid Journal",     description: "One square per day, colored by how the day actually felt.",       image: "" },
    { slug: "sound-of-places",  title: "Sound of Places",  description: "Field recordings mapped to the streets where they were made.",    image: "" },
    { slug: "paper-radio",      title: "Paper Radio",      description: "A printable weekly digest generated from your own feeds.",        image: "" },
    { slug: "events-museum", title: "The Unofficial Events Museum", description: "A walkable museum preserving past Roblox events and their artifacts.", image: "enjoy/events-museum/assets/museum-icon.webp", url: "enjoy/events-museum/index.html" }
  ],

  /* -------- Digest (read / writing) -------- */
  digest: [
    { slug: "field-notes",  title: "Field Notes",  description: "Short essays on making small, quiet software.", image: "" },
    { slug: "reading-list", title: "Reading List", description: "Books and articles worth your time.",           image: "" }
  ]

};
