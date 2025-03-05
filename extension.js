/*
    RECENT ITEMS, an extension for the gnome-shell.
    (c) 2011-2024 Kurt Fleisch; <https://www.bananenfisch.net/> <https://github.com/bananenfisch/RecentItems>
    Gnome Shell Extensions: <https://extensions.gnome.org/>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version. <http://www.gnu.org/licenses/>
*/
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import RecentManager from "./recentManager.js";
const ByteArray = imports.byteArray;


const FallbackMirrorMapping = {
  '(': ')',
  ')': '(',
  '[': ']',
  ']': '[',
  '{': '}',
  '}': '{',
  '<': '>',
  '>': '<',
  '«': '»',
  '»': '«'
};
let mirrorMapping = FallbackMirrorMapping;

async function loadFile(filePath) {
  let file = Gio.File.new_for_path(filePath);
  // Wrap the asynchronous load in a promise
  let [success, contents] = await new Promise((resolve, reject) => {
    file.load_contents_async(null, (file, res) => {
      try {
        let [success, contents] = file.load_contents_finish(res);
        resolve([success, contents]);
      } catch (e) {
        reject(e);
      }
    });
  });
  return [success, contents];
}

function parseBidiMirroring(fileContent) {
  const mapping = {};
  // Split the content into lines
  const lines = fileContent.split(/\r?\n/);
  for (const line of lines) {
    // Remove comments and trim whitespace
    const commentIndex = line.indexOf('#');
    const lineWithoutComment = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    const trimmed = lineWithoutComment.trim();
    if (!trimmed) continue; // Skip empty lines

    // Each valid line should be in the format: <srcHex>; <destHex>
    const parts = trimmed.split(';');
    if (parts.length < 2) continue;
    
    const srcHex = parts[0].trim();
    const destHex = parts[1].trim();

    // Convert hex to actual characters
    const srcChar = String.fromCodePoint(parseInt(srcHex, 16));
    const destChar = String.fromCodePoint(parseInt(destHex, 16));
    
    mapping[srcChar] = destChar;
    // If needed, you can also store the reverse mapping:
    mapping[destChar] = srcChar;
  }
  return mapping;
}

async function loadMirrorMapping(filePath) {
		try {
			let [success, contents] = await loadFile(filePath);
			mirrorMapping = parseBidiMirroring(ByteArray.toString(contents));
		} catch (e) {
			mirrorMapping = FallbackMirrorMapping;
		}
}

function replaceMirroredChars(text) {
  let result = "";
  for (const char of text) {
    // If the character exists in the mapping, replace it; otherwise, keep the original.
    result += mirrorMapping[char] || char;
  }
  return result;
}


export default class RecentItemsExtension extends Extension {
  constructor(metadata) {
    super(metadata);
  }

  enable() {
    this._settings = this.getSettings();
		loadMirrorMapping(`${this.dir.get_path()}/BidiMirroring.txt`);
    this.rec = new RecentItems(this);


    // Add custom stylesheet
    const themeContext = St.ThemeContext.get_for_stage(global.stage);
    const cssFile = `${this.dir.get_path()}/stylesheet.css`;
    const file = Gio.File.new_for_path(cssFile);
    themeContext.get_theme().load_stylesheet(file);
  }

  disable() {
    this.rec.destroy();
    this.rec = null;
    this._settings = null;
  }
}

const RecentItems = GObject.registerClass(
  class RecentItems extends PanelMenu.Button {
    constructor(extension) {
      super(0.0);
      this._extension = extension;
      this._setMenuWidth();
      this._iconActor = new St.Icon({
        icon_name: 'document-open-recent-symbolic',
        style_class: 'system-status-icon',
      });
      this.add_child(this._iconActor);
      this.add_style_class_name('panel-status-button');

      // Section to hold recent items
      this.itemBox = new PopupMenu.PopupMenuSection({ reactive: false, can_focus: false });
      this.menu.addMenuItem(this.itemBox, 0);

      this.recentManager = new RecentManager();
      this._allItems = this.recentManager.get_items(); // Store all items
      this._searchTerm = ''; // Initialize search term
      this._searchQuery = ''; // Initialize search query
      this._page = 0; // Pagination index
      this._num_page = 0; // Number of pages
      this._isSyncing = false; // Mutex flag for syncing
      this.cleanPrivateModeTimeoutID = null;
			this._recentManagerChanged=true;
      // Add navigation and action buttons
      const actionsSection = new PopupMenu.PopupMenuSection();
      const actionsBox = new St.BoxLayout({
        style_class: 'recent-actions-section',
        vertical: false,
      });

      actionsSection.actor.add_child(actionsBox);

      // Add "Previous Page" button
      this.prevPage = new PopupMenu.PopupBaseMenuItem();
      this.prevPage.add_child(
        new St.Icon({
          icon_name: 'go-previous-symbolic',
          style_class: 'popup-menu-icon',
        }),
      );
      actionsBox.add_child(this.prevPage);
      
      // Add "Next Page" button
      this.nextPage = new PopupMenu.PopupBaseMenuItem();
      this.nextPage.add_child(
        new St.Icon({
          icon_name: 'go-next-symbolic',
          style_class: 'popup-menu-icon',
        }),
      );
      actionsBox.add_child(this.nextPage);

      this._prevPageSignalId = this.prevPage.connect('activate', this._navigatePrevPage.bind(this));
      this._nextPageSignalId = this.nextPage.connect('activate', this._navigateNextPage.bind(this));


      // Create a new numeric entry
      this.page_input = new St.Entry({
        style_class: 'number-entry',
        hint_text: this._page + ' of ' + this._num_page, // Placeholder text
        can_focus: true,
        track_hover: true,
      });
      this.page_input.get_clutter_text().connect('text-changed', () => {
        const clutterText = this.page_input.get_clutter_text();
        const currentText = clutterText.get_text();

        // Restrict input to digits only
        if (!/^\d*$/.test(currentText)) {
          clutterText.set_text(currentText.replace(/\D/g, '')); // Remove non-digit characters
          return;
        }

        // Check if input is non-empty
        if (currentText !== "") {
          // Wait for 1 second or Enter key press to process the input
          if (this._pageTimeoutId) {
            GLib.source_remove(this._pageTimeoutId); // Reset the timeout if the user continues typing
          }

          this._pageTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            const pageNumber = parseInt(currentText, 10) - 1; // Convert input to zero-based index
            if (!isNaN(pageNumber)) {
              this._page = Math.max(0, Math.min(pageNumber, this._num_page)); // Clamp the page number within range
              clutterText.set_text(""); // Clear input after processing
              this._sync(); // Update the view
            }
            this._pageTimeoutId = null; // Clear the timeout ID
            return GLib.SOURCE_REMOVE; // Ensure the timeout runs only once
          });
        }
      });

      // Handle the "Enter" key for immediate page change
      this.page_input.get_clutter_text().connect('key-press-event', (_, event) => {
        const symbol = event.get_key_symbol();
        if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter) {
          const pageNumber = parseInt(this.page_input.get_text(), 10) - 1;
          if (!isNaN(pageNumber)) {
            this._page = Math.max(0, Math.min(pageNumber, this._num_page)); // Clamp within range
            this.page_input.set_text(""); // Clear input
            this._sync(); // Update the view
          }
          return Clutter.EVENT_STOP; // Stop event propagation
        }
        return Clutter.EVENT_PROPAGATE;
      });
      actionsBox.add_child(this.page_input);

      actionsBox.add_child(new St.BoxLayout({ x_expand: true }));

      // Add "Private Mode" toggle
      this.privateModeMenuItem = new PopupMenu.PopupSwitchMenuItem(
        _('Private mode'),
        this._extension._settings.get_boolean("private-mode"),
        { reactive: true },
      );
      this.privateModeMenuItem.connect('toggled', () => {
        this._allItems = this.recentManager.get_items();
        this._extension._settings.set_boolean(
          "private-mode",
          this.privateModeMenuItem.state,
        );
        // Adjust icon opacity based on private mode state
        if (this.privateModeMenuItem.state) {
          this._iconActor.opacity = 100; // Dim the icon when private mode is active
        } else {
          this._iconActor.opacity = 255; // Restore full opacity when private mode is inactive
        }
      });
      actionsBox.add_child(this.privateModeMenuItem);

      // Add "Clear All" button
      const clearMenuItem = new PopupMenu.PopupBaseMenuItem();
      clearMenuItem.add_child(
        new St.Icon({
          icon_name: 'edit-delete-symbolic',
          style_class: 'popup-menu-icon',
        }),
      );
      actionsBox.add_child(clearMenuItem);
      clearMenuItem.connect('activate', this._clearAll.bind(this));

      this._sync();
      this.menu.addMenuItem(actionsSection);
      this._addSearchField();

      this.menu.connect('open-state-changed', (self, open) => {
        if (open) {
          this._setMenuWidth();
          this._page = 0; // Set the page to 0 when the menu opens
          this.searchEntry.set_text('');
          this._searchFocusHackCallbackId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            1,
            () => {
              global.stage.set_key_focus(this.searchEntry);
              this._searchFocusHackCallbackId = undefined;
              return false;
            },
          );
          this._sync();
        }
      });

      this.changeHandler = this.recentManager.connect('changed', () => {
        this._recentManagerChanged=true;
        if(this.menu.isOpen){
          this._sync();
        }
      });
      this.settingsChangeHandler = this._extension._settings.connect('changed', () => {
        this._setMenuWidth();
        this._sync();
      });

      // Scroll-Drosselung
      this._scrollThrottle = false;

      // Scroll-Event verbinden
      this._scrollEventId=this.menu.actor.connect('scroll-event', (_, event) => {
        this._onScroll(event);
        return Clutter.EVENT_STOP; // Konsumiere das Event
      });
      Main.panel.addToStatusArea(this._extension.uuid, this);

    }

    _setMenuWidth() {
      const display = global.display;
      const screenWidth = display.get_monitor_geometry(
        display.get_primary_monitor()
      ).width;
    
      this.window_width_percentage = this._extension._settings.get_int("window-width-percentage");
      const menuWidth = Math.round(screenWidth * (this.window_width_percentage / 100));
      
      this.menu.actor.set_width(menuWidth);
      
      // Ensure child elements respect this width
      if (this.searchEntry) {
        this.searchEntry.set_width(menuWidth - 40); // Adjust for padding
      }
    }
    _onSearchTextChanged() {
      const query = this.searchEntry.get_text();

      if (!query) {
        this._searchTerm = "";
        this._searchQuery = "";
      } else {
        this._searchTerm = query.toLowerCase();
        this._searchQuery = query;
      }

      this._sync(); // Update menu
    }

    _addRecentMenuItem(item, itemContainer) {
      const item_type = item.mime_type;
      const gicon = Gio.content_type_get_icon(item_type);
      const uri = item.uri;
      // Create a container for the menu item
      const menuBox = new St.BoxLayout({
        style_class: 'item-box',
        vertical: false,
        x_expand: true,
      });
      
      // Add an icon
      const icon = new St.Icon({ gicon, style_class: 'popup-menu-icon' });
      menuBox.add_child(icon);

      // Add a label
      const label = new St.Label({
        text: item.displayName,
        x_expand: true,
        x_align: Clutter.ActorAlign.START,
      });

      let path = replaceMirroredChars(decodeURIComponent(item.uri)
      .replace("file://", "")
      .replace(GLib.get_home_dir(), "~")
      .replace(/\/[^\/]*$/, "/"));
      
      // Add a label
      const pathLabel = new St.Label({
        text: "\u202E" + path.split("").reverse().join(""), // ellipsis at the beginning of a left-to-right text
        style_class: 'item-path',
        x_expand: true,
        x_align: Clutter.ActorAlign.END,
        y_align: Clutter.ActorAlign.END,
      });

      if (!item.exist)
      {
        label.set_style_class_name("item-deleted");
        pathLabel.set_style_class_name("item-path-deleted");
      }
      menuBox.add_child(label);
      menuBox.add_child(pathLabel);

      // Add a "Delete" button
      const deleteButton = new St.Button({
        style_class: 'delete-button',
        child: new St.Icon({
          icon_name: 'user-trash-symbolic',
          style_class: 'popup-menu-icon',
        }),
        x_align: Clutter.ActorAlign.END,
      });

      menuBox.add_child(deleteButton);

      // Make the entire item clickable
      const menuItem = new PopupMenu.PopupBaseMenuItem();
      menuItem.add_child(menuBox);
      menuItem._deleteButton=deleteButton;
      menuItem._deleteSignalId=deleteButton.connect('clicked', () => this._deleteItem(uri));
      menuItem._activateSignalId = menuItem.connect('activate', (_, ev) => {
        this._launchFile(uri, ev);
      });
      itemContainer.addMenuItem(menuItem);
    }

    async _sync() {
      new Promise((resolve, reject) => {
        if(!this.menu.isOpen || this._isSyncing)
        {
          resolve();
          return;
        }
        this._isSyncing = true;
        if(this._recentManagerChanged) {
          this._recentManagerChanged = false;
          if (!this.privateModeMenuItem.state) {
            this._allItems = this.recentManager.get_items();
          } else {
            const tmpAllItems = this.recentManager.get_items();
            for (const item of tmpAllItems) {
              const uri = item.uri;

              // Remove item if not in the current list
              if (!this._allItems.some(existingItem => existingItem.uri === uri)) {
                // console.log("Remove item in private mode: " + uri);
                this.recentManager.remove_item(uri);
                resolve();
                this._isSyncing = false;
                return;
              }
            }
            this._allItems = tmpAllItems;
          }
        }

        const itemBlacklist = this._extension._settings.get_string('item-blacklist');
        const blacklistList = itemBlacklist.replace(/\s/g, "").split(",");

        for (const item of this._allItems) {
          if (blacklistList.indexOf(item.mime_type.split("/")[0]) !== -1) {
            const uri = item.uri;
            // console.log("Remove blacklisted item: " + uri);
            this.recentManager.remove_item(uri);
            resolve();
            this._isSyncing = false;
            return;
          }
        }
        const items = this.itemBox._getMenuItems();
        for (const item of items) {
          item.reactive = false;
          if (item._deleteButton && item._deleteSignalId) {
            item._deleteButton.disconnect(item._deleteSignalId);
          }
          if (item._activateSignalId) {
            item.disconnect(item._activateSignalId);
          }
        }
        this.itemBox.removeAll();
        const filteredItems = this._filterItems(this._searchTerm, blacklistList);
        const countItem = filteredItems.length;

        if (countItem > 0) {
          const showItemCount = this._extension._settings.get_int('item-count');
          this._num_page = Math.ceil(countItem / showItemCount) - 1;
          this.page_input.set_hint_text( _('%x of %y').replace('%x', this._page + 1).replace('%y', this._num_page + 1));
          let modlist = [];
          for (let i = 0; i < countItem; i++) {
            modlist[i] = [Math.max(filteredItems[i].visited, filteredItems[i].modified), i];
          }

          modlist.sort((x, y) => y[0] - x[0]);

          const startID = this._page * showItemCount;
          let id = startID;
          while (id < showItemCount + startID && id < countItem) {
            this._addRecentMenuItem(filteredItems[modlist[id][1]], this.itemBox);
            id++;
          }
        } else {
          const noResultsItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
          const noResultsLabel = new St.Label({ text: _('No items found') });
          noResultsItem.add_child(noResultsLabel);
          this.itemBox.addMenuItem(noResultsItem);
        }
        this._isSyncing = false;
        resolve();
      });
    }

    _navigatePrevPage() {
      if (this._page > 0) {
        this._page -= 1;
      } else {
        this._page = this._num_page;
      }
      this._sync();
    }

    _navigateNextPage() {
      if (this._page < this._num_page) {
        this._page += 1;
      } else {
        this._page = 0;
      }
      this._sync();
    }

    _addSearchField() {
      const searchBox = new St.BoxLayout({
        style_class: 'search-box',
        vertical: false,
        x_expand: true,
      });
    
      this.searchEntry = new St.Entry({
        style_class: 'search-entry',
        hint_text: _('Search...'),
        can_focus: true,
        track_hover: true,
        x_expand: true,
        y_expand: true,
      });
    
      // Adjust search entry width dynamically
      const menuWidth = this.menu.actor.get_width();
      this.searchEntry.set_width(menuWidth - 40); // Account for padding
    
      this.searchEntry
        .get_clutter_text()
        .connect('text-changed', this._onSearchTextChanged.bind(this));
    
      searchBox.add_child(this.searchEntry);
    
      const searchMenuItem = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false });
      searchMenuItem.add_child(searchBox);
      this.menu.addMenuItem(searchMenuItem);
    }

    _filterItems(searchTerm, blacklistList) {
      if (!searchTerm || searchTerm === "")
        return this._allItems;

      return this._allItems.filter(item => item.displayName.toLowerCase().includes(searchTerm));
    }

    _launchFile(uri, ev) {
      Gio.app_info_launch_default_for_uri(
        ev.get_button() === 3
          ? Gio.Vfs.get_default().get_file_for_uri(uri).get_parent().get_uri()
          : uri,
        global.create_app_launch_context(0, -1),
      );
    }

    _onScroll(event) {
      // If scrolling is throttled, ignore the event
      if (this._scrollThrottle) return;
        
      const direction = event.get_scroll_direction();
    
      try {
        if (direction === Clutter.ScrollDirection.UP) {
          this._navigatePrevPage();
        } else if (direction === Clutter.ScrollDirection.DOWN) {
          this._navigateNextPage();
        } else {
          return;
        }
      } catch (e) {
        logError(e);
        return;
      }

      // Activate scroll throttle
      this._scrollThrottle = true;
      // Reset throttle after 100 ms
      this._scrollThrottleTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
        this._scrollThrottleTimeoutId = false;
        this._scrollThrottle = false;
        return GLib.SOURCE_REMOVE; // Run timeout only once
      });
    }
    
    _deleteItem(uri) {
      this.recentManager.remove_item(uri);
    }

    _clearAll() {
      this.recentManager.purge_items();
      this._searchTerm = '';
      this._searchQuery = '';
    }
    destroy() {
      const items = this.itemBox._getMenuItems();
      for (const item of items) {
        if (item._activateSignalId) {
          item.disconnect(item._activateSignalId);
        }
      }
      this.itemBox.removeAll();
      // Disconnect settings handler
      if (this.settingsChangeHandler) {
        this._extension._settings.disconnect(this.settingsChangeHandler);
        this.settingsChangeHandler = null;
      }
    
      // Disconnect recent manager signal handler
      if (this.changeHandler) {
        this.recentManager.disconnect(this.changeHandler);
        this.changeHandler = null;
      }
    
      // Destroy the recent manager instance
      if (this.recentManager) {
        this.recentManager.destroy();
        this.recentManager = null;
      }
    
      // Remove scroll throttle timeout
      if (this._scrollThrottleTimeoutId) {
        GLib.Source.remove(this._scrollThrottleTimeoutId);
        this._scrollThrottleTimeoutId = null;
      }
    
      // Remove page input timeout
      if (this._pageTimeoutId) {
        GLib.Source.remove(this._pageTimeoutId);
        this._pageTimeoutId = null;
      }
    
      // Remove search focus timeout
      if (this._searchFocusHackCallbackId) {
        GLib.Source.remove(this._searchFocusHackCallbackId);
        this._searchFocusHackCallbackId = null;
      }
    
      // Disconnect scroll event handler
      if (this._scrollEventId && this.menu.actor) {
        this.menu.actor.disconnect(this._scrollEventId);
        this._scrollEventId = null;
      }
    
      // Disconnect specific signal handlers for prevPage and nextPage
      if (this._prevPageSignalId) {
        this.prevPage.disconnect(this._prevPageSignalId);
        this._prevPageSignalId = null;
      }
    
      if (this._nextPageSignalId) {
        this.nextPage.disconnect(this._nextPageSignalId);
        this._nextPageSignalId = null;
      }
    
      // Disconnect page input text and key event handlers
      if (this.page_input && this.page_input.get_clutter_text()) {
        const clutterText = this.page_input.get_clutter_text();
        if (this._pageInputTextChangedId) {
          clutterText.disconnect(this._pageInputTextChangedId);
          this._pageInputTextChangedId = null;
        }
        if (this._pageInputKeyPressId) {
          clutterText.disconnect(this._pageInputKeyPressId);
          this._pageInputKeyPressId = null;
        }
      }
    
      // Disconnect private mode toggle
      if (this._privateModeToggleId) {
        this.privateModeMenuItem.disconnect(this._privateModeToggleId);
        this._privateModeToggleId = null;
      }
    
      // Call parent destroy method
      super.destroy();
    }
  },
);
