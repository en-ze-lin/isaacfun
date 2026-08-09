/* =============================================================
   projects.js  —  EDIT THIS FILE to change the site content.
   -------------------------------------------------------------
   This is the ONLY file you need to touch to add / rename / edit
   projects. The homepage builds every card from this data using
   .map(), so anything you change here shows up automatically.

   Each project card has four fields:
     slug        kebab-case id, also the subfolder name in /projects
     title       the bold text (upper-right of the card)
     description one short sentence (lower-right of the card)
     image       path to the square logo on the LEFT of the card.
                 Leave "" to show an auto-generated monogram instead.
                 The add-project skill fills this with a screenshot,
                 but you can point it at ANY image, e.g.:
                   image: "projects/waveform-editor/thumbnail.png"

   To add a project by hand: copy one { ... } line, paste it into
   the right section, and edit the four fields. Done.
   ============================================================= */


/* =============================================================
   HOME MENU  —  the numbered list on the homepage.
   -------------------------------------------------------------
   Reorder, rename, add, or remove lines freely. The numbers
   01, 02, 03 ... are added automatically, top to bottom.
     label = the BIG text shown on the homepage (write it any way)
     slug  = which page it opens; must match a section name in
             window.SITE below (about / tools / concepts / ideas / read)
   ============================================================= */
// Hover on the homepage reveals a hidden letter. By default one letter is
// blanked automatically. Options per item:
//   blanks: 2      -> blank two letters automatically
//   masked: "..."  -> choose EXACTLY which letters are blanked ("_" = hidden;
//                     must be the same length as the label)
window.MENU = [
  { label: "ABOUT",   slug: "about"    },
  { label: "USE",     slug: "tools"    },
  { label: "IMAGINE", slug: "concepts", masked: "_MA_INE" },
  { label: "ENJOY",   slug: "ideas",    masked: "ENJ_Y"   },
  { label: "DIGEST",  slug: "read"     }
];


window.SITE = {

  /* -------- About page: one string per paragraph -------- */
  about: [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Isaac builds small tools, writes down loose concepts, and lets ideas sit until they are ready. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus, nulla gravida orci a odio."
  ],

  /* -------- Tools -------- */
  tools: [
    { slug: "waveform-editor", title: "Waveform Editor", description: "A browser-based audio slicer for trimming and layering short samples.", image: "" },
    { slug: "color-extractor", title: "Color Extractor", description: "Pull dominant palettes from any image and export them as tokens.",      image: "" },
    { slug: "markdown-deck",   title: "Markdown Deck",   description: "Turn a plain text file into a keyboard-driven slide presentation.",    image: "" },
    { slug: "unit-converter",  title: "Unit Converter",  description: "A tiny, fast converter for length, mass, temperature, and time.",     image: "" }
  ],

  /* -------- Concepts -------- */
  concepts: [
    { slug: "slow-interfaces", title: "Slow Interfaces", description: "An exploration of software that intentionally resists urgency.",   image: "" },
    { slug: "local-first",     title: "Local First",     description: "Notes on building apps that own their data before the cloud does.", image: "" },
    { slug: "ambient-displays",title: "Ambient Displays", description: "Screens that inform at a glance without demanding attention.",     image: "" },
    { slug: "calm-automation", title: "Calm Automation", description: "Letting scripts do quiet work so the desk stays clear.",           image: "" },
    { slug: "jansport-outpost", title: "JanSport Outpost", description: "Carry your story. Find your Outpost.", image: "projects/jansport-outpost/thumbnail.png", url: "projects/jansport-outpost/index.html" },
    { slug: "jandorm", title: "JanDorm", description: "A compact stay for travelers who carry their world with them.", image: "projects/jandorm/og.png", url: "projects/jandorm/index.html" }
  ],

  /* -------- Ideas -------- */
  ideas: [
    { slug: "the-reading-room", title: "The Reading Room", description: "A single-tab reader that hides everything but the words.",        image: "" },
    { slug: "grid-journal",     title: "Grid Journal",     description: "One square per day, colored by how the day actually felt.",       image: "" },
    { slug: "sound-of-places",  title: "Sound of Places",  description: "Field recordings mapped to the streets where they were made.",    image: "" },
    { slug: "paper-radio",      title: "Paper Radio",      description: "A printable weekly digest generated from your own feeds.",        image: "" }
  ],

  /* -------- Read (writing / notes) -------- */
  read: [
    { slug: "field-notes",  title: "Field Notes",  description: "Short essays on making small, quiet software.", image: "" },
    { slug: "reading-list", title: "Reading List", description: "Books and articles worth your time.",           image: "" }
  ]

};
