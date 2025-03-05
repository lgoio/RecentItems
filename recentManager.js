/**
* Original source: https://github.com/BlankParticle/RecentItems-gnome/blob/master/recentManager.js
*/
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import * as Signals from "resource:///org/gnome/shell/misc/signals.js";

export default class RecentManager extends Signals.EventEmitter {
  constructor() {
    super();

    this._bookmarkFilePath = GLib.get_home_dir() + "/.local/share/recently-used.xbel";
    this._bookmarkFile = new GLib.BookmarkFile();
    this._load_entries();

    this._fileMonitor = Gio.File.new_for_path(this._bookmarkFilePath).monitor(
      Gio.FileMonitorFlags.NONE,
      null,
    );

    this._changedSignal = this._fileMonitor.connect("changed", () => {
      this._load_entries();
      this.emit("changed");
    });
  }

  _load_entries() {
    if (GLib.file_test(this._bookmarkFilePath, GLib.FileTest.EXISTS)) {
      this._bookmarkFile.load_from_file(this._bookmarkFilePath);
    } else {
      this._bookmarkFile.to_file(this._bookmarkFilePath);
    }
  }


  get_items() {
    return this._bookmarkFile.get_uris().map(uri => {
      try {

        const file = Gio.File.new_for_uri(uri);
        const fileExist = file.query_exists(null);
          // The file doesn't exist, fallback to bookmarkFile informations
        let displayName = this._bookmarkFile.get_title(uri);
        let mime_type = this._bookmarkFile.get_mime_type(uri);
        let visited = this._bookmarkFile.get_visited(uri);
        let modified= this._bookmarkFile.get_modified(uri);
        if(fileExist) {
          const info = file.query_info("standard::*,time::modified,time::access", Gio.FileQueryInfoFlags.NONE, null);
          visited = Math.max(info.get_attribute_uint64("time::access"), visited);
          modified = Math.max(info.get_attribute_uint64("time::modified"), modified);
          if (displayName == null) {
            displayName = info.get_display_name();
          }
        }
        if (displayName == null) {
          // Fallback: Extract the filename from the URI if no title is available
          displayName = uri.replace(/^.*\//, ""); // Removes everything before the last `/`
        }
        if (mime_type == null) {
          mime_type = "application/octet-stream";
        }
        return {
          uri,
          exist: fileExist,
          displayName,
          visited,
          modified,
          mime_type,
        };
      } catch (e) {
        logError(e, `Failed to retrieve information for URI: ${uri}`);
        return null;
      }
    }).filter(item => item !== null);
  }

  get_size() {
    return this._bookmarkFile.get_size();
  }

  purge_items() {
    this._bookmarkFile.get_uris().forEach((uri) => {
      this._bookmarkFile.remove_item(uri);
    });
    this._bookmarkFile.to_file(this._bookmarkFilePath);
  }

  remove_item(uri) {
    try {
      if (this._bookmarkFile.has_item(uri)) {
        this._bookmarkFile.remove_item(uri);
        this._bookmarkFile.to_file(this._bookmarkFilePath);
        this.emit("item-removed", uri);
        return true;
      } else {
        return false; // Item not found
      }
    } catch (e) {
      logError(e, `Failed to remove item: ${uri}`);
      return false;
    }
  }

  destroy() {
    this._fileMonitor.disconnect(this._changedSignal);
    this._fileMonitor.cancel();
    this._fileMonitor = null;
    this._bookmarkFile = null;
  }
}
