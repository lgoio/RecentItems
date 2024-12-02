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
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class RecentItemsExtension extends Extension {
  constructor(metadata) {
    super(metadata);
  }

  enable() {
    this._settings = this.getSettings();
    this.rec = new RecentItems(this);
  }

  disable() {
    this.rec.destroy();
    this.rec = null;
    this._settings = null;
  }
}

const PopupMenuItem = GObject.registerClass(
  class PopupMenuItem extends PopupMenu.PopupBaseMenuItem {
    constructor(gicon, text, params) {
      super(params);

      this.box = new St.BoxLayout({ style_class: 'popup-combobox-item' });

      if (gicon)
        this.icon = new St.Icon({ gicon, style_class: 'popup-menu-icon' });
      else
        this.icon = new St.Icon({ icon_name: 'edit-clear-symbolic', icon_size: 22 });

      this.box.add_child(this.icon);
      this.label = new St.Label({ text: ' ' + text });
      this.box.add_child(this.label);
      this.add_child(this.box);
    }
  },
);

const RecentItems = GObject.registerClass(
  class RecentItems extends PanelMenu.Button {
    constructor(extension) {
      super(0.0);
      this._extension = extension;
      this._iconActor = new St.Icon({
        icon_name: 'document-open-recent-symbolic',
        style_class: 'system-status-icon',
      });
      this.add_child(this._iconActor);
      this.add_style_class_name('panel-status-button');

      // Section to hold recent items
      this.itemBox = new PopupMenu.PopupMenuSection({ reactive: false, can_focus: false });
      this.menu.addMenuItem(this.itemBox, 0);

      this.RecentManager = Gtk.RecentManager.get_default();
      this._allItems = this.RecentManager.get_items(); // Store all items
      this._searchTerm = ''; // Initialize search term
      this._searchQuery = ''; // Initialize search query
      this._page = 0; // Pagination index
      this._private_mode = this._extension._settings.get_boolean("private-mode");
      this._isSyncing = false; // Mutex flag for syncing
      this.cleanPrivateModeTimeoutID = null;

      // Add navigation and action buttons
      const actionsSection = new PopupMenu.PopupMenuSection();
      const actionsBox = new St.BoxLayout({
        style_class: 'recent-actions-section',
        vertical: false,
      });

      actionsSection.actor.add_child(actionsBox);

      // Add "Previous Page" button
      const prevPage = new PopupMenu.PopupBaseMenuItem();
      prevPage.add_child(
        new St.Icon({
          icon_name: 'go-previous-symbolic',
          style_class: 'popup-menu-icon',
        }),
      );
      prevPage.connect('activate', this._navigatePrevPage.bind(this));
      actionsBox.add_child(prevPage);

      // Add "Next Page" button
      const nextPage = new PopupMenu.PopupBaseMenuItem();
      nextPage.add_child(
        new St.Icon({
          icon_name: 'go-next-symbolic',
          style_class: 'popup-menu-icon',
        }),
      );
      nextPage.connect('activate', this._navigateNextPage.bind(this));
      actionsBox.add_child(nextPage);

      actionsBox.add_child(new St.BoxLayout({ x_expand: true }));

      // Add "Private Mode" toggle
      this.privateModeMenuItem = new PopupMenu.PopupSwitchMenuItem(
        _('Private mode'),
        this._private_mode,
        { reactive: true },
      );
      this.privateModeMenuItem.connect('toggled', () => {
        this._allItems = this.RecentManager.get_items();

        this._extension._settings.set_boolean(
          "private-mode",
          this.privateModeMenuItem.state,
        );
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

      this.changeHandler = this.RecentManager.connect('changed', () => this._sync());
      this.settingsChangeHandler = this._extension._settings.connect('changed', () => this._sync());

      Main.panel.addToStatusArea(this._extension.uuid, this);
    }

    destroy() {
      this._extension._settings.disconnect(this.settingsChangeHandler);
      this.RecentManager.disconnect(this.changeHandler);
      this.RecentManager = null;
      if (this._searchFocusHackCallbackId) {
        GLib.Source.source_remove(this._searchFocusHackCallbackId);
        this._searchFocusHackCallbackId = undefined;
      }
      super.destroy();
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
      const item_type = item.get_mime_type();
      const gicon = Gio.content_type_get_icon(item_type);
      const uri = item.get_uri();

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
        text: item.get_display_name(),
        x_expand: true,
        x_align: Clutter.ActorAlign.START,
      });
      menuBox.add_child(label);

      // Add a "Delete" button
      const deleteButton = new St.Button({
        style_class: 'delete-button',
        child: new St.Icon({
          icon_name: 'user-trash-symbolic',
          style_class: 'popup-menu-icon',
        }),
        x_align: Clutter.ActorAlign.END,
      });

      deleteButton.connect('clicked', () => this._deleteItem(uri));
      menuBox.add_child(deleteButton);

      // Make the entire item clickable
      const menuItem = new PopupMenu.PopupBaseMenuItem();
      menuItem.add_child(menuBox);
      menuItem.connect('activate', (_, ev) => {
        this._launchFile(uri, ev);
      });
      itemContainer.addMenuItem(menuItem);
    }

    _sync() {
      this._private_mode = this._extension._settings.get_boolean("private-mode");
      this.itemBox.removeAll();

      if (!this._private_mode) {
        this._allItems = this.RecentManager.get_items();
      } else {
        const tmpAllItems = this.RecentManager.get_items();
        for (const item of tmpAllItems) {
          const uri = item.get_uri();

          // Remove item if not in the current list
          if (!this._allItems.some(existingItem => existingItem.get_uri() === uri)) {
            // console.log("Remove item in private mode: " + uri);
            this.RecentManager.remove_item(uri);
            return;
          }
        }
        this._allItems = tmpAllItems;
      }

      const itemBlacklist = this._extension._settings.get_string('item-blacklist');
      const blacklistList = itemBlacklist.replace(/\s/g, "").split(",");

      for (const item of this._allItems) {
        if (blacklistList.indexOf(item.get_mime_type().split("/")[0]) !== -1) {
          const uri = item.get_uri();
          // console.log("Remove blacklisted item: " + uri);
          this.RecentManager.remove_item(uri);
          return;
        }
      }

      const filteredItems = this._filterItems(this._searchTerm, blacklistList);
      const countItem = filteredItems.length;

      if (countItem > 0) {
        const showItemCount = this._extension._settings.get_int('item-count');
        this._num_page = Math.floor(countItem / showItemCount);
        let modlist = [];
        for (let i = 0; i < countItem; i++) {
          modlist[i] = [filteredItems[i].get_modified().to_unix(), i];
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
      this.searchEntry
        .get_clutter_text()
        .connect('text-changed', this._onSearchTextChanged.bind(this));
      searchBox.add_child(this.searchEntry);

      const searchMenuItem = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false });
      searchMenuItem.add_child(searchBox);
      this.menu.addMenuItem(searchMenuItem);

      this.menu.connect('open-state-changed', (self, open) => {
        if (open) {
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
        }
      });
    }

    _filterItems(searchTerm, blacklistList) {
      if (!searchTerm || searchTerm === "")
        return this._allItems;

      return this._allItems.filter(item => item.get_display_name().toLowerCase().includes(searchTerm));
    }

    _launchFile(uri, ev) {
      Gio.app_info_launch_default_for_uri(
        ev.get_button() === 3
          ? Gio.Vfs.get_default().get_file_for_uri(uri).get_parent().get_uri()
          : uri,
        global.create_app_launch_context(0, -1),
      );
    }

    _deleteItem(uri) {
      this.RecentManager.remove_item(uri);
    }

    _clearAll() {
      this.RecentManager.purge_items();
      this._searchTerm = '';
      this._searchQuery = '';
    }
  },
);
