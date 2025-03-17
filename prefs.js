import Gio from "gi://Gio";
import Adw from "gi://Adw";
import Gtk from "gi://Gtk";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class RecentItemsPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    // Set the default window size (width, height in pixels)
    window.set_default_size(800, 600);

    window._settings = this.getSettings();

    const page = new Adw.PreferencesPage({
      title: _("Recent Item Settings"),
      icon_name: "dialog-information-symbolic",
    });

    window.add(page);

    const group = new Adw.PreferencesGroup({
      title: _("Settings"),
    });

    page.add(group);



    let label = null;
    let widget = null;


        
    // Show deleted files
    const showDeletedFilesBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 10,
      margin_start: 10,
      margin_end: 10,
      margin_top: 10,
      margin_bottom: 10,
    });

    label = new Gtk.Label({
      label: _('Show deleted files'),
      hexpand: true,
      halign: Gtk.Align.START,
    });
    
    widget =new Gtk.Switch({
    });
    window._settings.bind("show-deleted-files", widget, "active", Gio.SettingsBindFlags.DEFAULT);

    showDeletedFilesBox.append(label);
    showDeletedFilesBox.append(widget);
    group.add(showDeletedFilesBox);
    
    
    // Window width
    const windowWidthBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 10,
      margin_start: 10,
      margin_end: 10,
      margin_top: 10,
      margin_bottom: 10,
    });

    label = new Gtk.Label({
      label: _('Window width (%)'),
      hexpand: true,
      halign: Gtk.Align.START,
    });
    
    widget =new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 100,
        step_increment: 5,
      }),
      width_chars: 3,
    });
    
    
    window._settings.bind("window-width-percentage", widget, "value", Gio.SettingsBindFlags.DEFAULT);

    windowWidthBox.append(label);
    windowWidthBox.append(widget);
    group.add(windowWidthBox);

    // Item count
    const itemCountBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 10,
      margin_start: 10,
      margin_end: 10,
      margin_top: 10,
      margin_bottom: 10,
    });
    
    label = new Gtk.Label({
      label: _("Item Count"),
      hexpand: true,
      halign: Gtk.Align.START,
    });


    widget = new Gtk.SpinButton({
      halign: Gtk.Align.END,
      width_chars: 3,
    });
    widget.set_sensitive(true);
    widget.set_range(3, 20);
    widget.set_increments(1, 2);

    window._settings.bind("item-count", widget, "value", Gio.SettingsBindFlags.DEFAULT);

    itemCountBox.append(label);
    itemCountBox.append(widget);
    group.add(itemCountBox);

    // Item Blacklist
    const itemBlacklistBox = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 10,
      margin_start: 10,
      margin_end: 10,
      margin_top: 10,
      margin_bottom: 10,
    });
    
    label = new Gtk.Label({
      label: _("Comma separated Extension and MIME Blacklist")+":",
      hexpand: true,
      halign: Gtk.Align.START,
    });

    // A scrolled window so the text view can grow and scroll
    const scrolledWindow = new Gtk.ScrolledWindow({
      hexpand: true,
      vexpand: true,
      min_content_height: 100, // Adjust as desired
    });

    // Multiline text view with word wrapping
    const textView = new Gtk.TextView({
      wrap_mode: Gtk.WrapMode.WORD_CHAR,
    });
    scrolledWindow.set_child(textView);


    // Retrieve the TextBuffer
    const textBuffer = textView.get_buffer();

    // 1) Load the existing GSettings value into the TextView
    const savedBlacklist = window._settings.get_string("item-blacklist");
    textBuffer.set_text(savedBlacklist, -1);

    // 2) Whenever the TextBuffer changes, store it back to GSettings
    textBuffer.connect("changed", () => {
      const startIter = textBuffer.get_start_iter();
      const endIter = textBuffer.get_end_iter();
      const text = textBuffer.get_text(startIter, endIter, /* include_hidden_chars */ true);

      // Save the entire multiline string as comma-separated
      // (You could also parse or validate it here if needed)
      window._settings.set_string("item-blacklist", text);
    });

    itemBlacklistBox.append(label);

    itemBlacklistBox.append(label);
    itemBlacklistBox.append(scrolledWindow);

    label = new Gtk.Label({
      label: _("Example") +":.bash_history,.rar,image,audio,video" ,
      hexpand: true,
      selectable: true,
      halign: Gtk.Align.START,
    });

    itemBlacklistBox.append(label);
    group.add(itemBlacklistBox);

  }
}
