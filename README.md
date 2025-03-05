# RecentItems (Enhanced Fork)
![RecentItems Enhanced Fork](RecentItems.png)

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

## Important: This extension is not updated on extensions.gnome.org for now

### Why?

The original extension uses GTK.RecentManager to access recent files.
In contrast, the fork does not use GTK.RecentManager.
There is an open merge request addressing this change.
Until that merge request is resolved, the extension will not be available on extensions.gnome.org.

## Recent Items - an extension for gnome-shell

- left click to open file/folder
- right click to open containing folder

<https://extensions.gnome.org/extension/72/recent-items/>

## TODOS:

- shortcut, like \<super\>+r
- hide button after cleaning
- option to pin files on top?
