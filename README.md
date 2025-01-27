# RecentItems (Enhanced Fork)

## About This Fork

This fork enhances the original RecentItems GNOME extension with the following features and improvements:

### Completed TODOs from the Original Plugin:
- **Search Input Field:** Easily filter recent items using a search box at the top.
- **Simple Float-Right Icon:** A straightforward icon to the right of each item allows quick removal.

### New Features in This Fork:
- **GTK-independent RecentManager:** Enhanced version of BlankParticle's RecentManager.
- **Private Mode:** A mode to ensure that no new items are saved to the Recent Manager while active.
- **Blacklist Support:** Block specific MIME types and remove corresponding entries from `Gtk.RecentManager` automatically.
- **Installation via `make install`:** Simplifies installation by automating schema compilation and setup.
- **Bundle Creation via `make bundle`:** Generates a `bundle.zip` for easy distribution.
- **Translations for Multiple Languages:** 
  - Supported languages include:
    - `ar`, `ca`, `cs`, `de`, `el`, `es`, `eu`, `fa`, `fi`, `fr`, `hu`, `it`, `ja`, `nl`, `oc`, `pl`, `pt_BR`, `ru`, `sk`, `tr`, `uk`, `zh_CN`
- **Better Pagination:** Enhanced scrolling and navigation logic for smoother page transitions.
- **Visualize removed files:** Visualize removed files in the recent items list.


## Installation Instructions

### Using `bundle.zip` (Recommended)

1. **Extract the Archive:**
   - Extract the `bundle.zip` file into the following directory:
     ```plaintext
     ~/.local/share/gnome-shell/extensions/RecentItems@bananenfisch.net
     ```
   - Ensure the folder is named `RecentItems@bananenfisch.net`.

2. **Compile Schemas:**
   - Run the following command to compile schemas for the extension:
     ```bash
     glib-compile-schemas ~/.local/share/gnome-shell/extensions/RecentItems@bananenfisch.net/schemas
     ```

3. **Restart GNOME Shell:**
   - Press `Alt + F2`, type `r`, and press Enter.
   - Alternatively, log out and log back in.

4. **Enable the Extension:**
   - Open GNOME Extensions or GNOME Tweaks and enable **Recent Items**.

## Manual Installation (Alternative)

If you prefer to install from the source code, follow these steps:

1. Clone or download the repository:
   ```bash
   git clone https://github.com/lgoio/RecentItems.git
   cd RecentItems
   make install

## Important: this extension is not being updated on extensions.gnome.org for now

### Why?
The latest "GNOME Shell Extensions Review Guidelines" [https://gjs.guide/extensions/review-guidelines/review-guidelines.html#do-not-import-gtk-libraries-in-gnome-shell]:
"Do not import GTK libraries"

This extension uses the GTK.RecentManager to have access to the recent files. This works fine, but by importing GTK.RecentManager it's not compatible with the guidelines for extensions.gnome.org.

The previous solution (implement a custom RecentManger) would work, but there are many cons:
1. it violates the KISS principle - there is already a RecentManger implemented (in GTK)
2. it's more buggy, because every time gnome changes something on the RecentManager, it could break
3. it's bad memory management: the GTK.RecentManager already holds all items in the memory, it's ugly to read out the whole recent-items file and hold all items again

So until there is no better solution, i will maintain this extension, but cannot upload to gnome.

## Recent Items - an extension for gnome-shell

- left click to open file/folder
- right click to open containing folder

<https://extensions.gnome.org/extension/72/recent-items/>

## TODOS:

- shortcut, like \<super\>+r
- hide button after cleaning
- option to pin files on top?
