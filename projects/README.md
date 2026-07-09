# projects/

Each uploaded project gets its own folder here, created by the **add-project** skill:

    projects/
      <slug>/
        index.html      # the project itself
        thumbnail.png   # auto-captured card logo (change freely)
        _nav.html       # shared navbar snippet injected at the top

The card for each project is driven by `../projects.js`. Edit that file to
change any title, description, or image path.
