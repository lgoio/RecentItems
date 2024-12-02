import Gio from "gi://Gio";
import Adw from "gi://Adw";
import Gtk from "gi://Gtk";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class RecentItemsPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
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

    widget = new Gtk.SpinButton({ halign: Gtk.Align.END });
    widget.set_sensitive(true);
    widget.set_range(3, 20);
    widget.set_increments(1, 2);

    window._settings.bind("item-count", widget, "value", Gio.SettingsBindFlags.DEFAULT);

    itemCountBox.append(label);
    itemCountBox.append(widget);
    group.add(itemCountBox);

    // Item Blacklist
    const itemBlacklistBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 10,
      margin_start: 10,
      margin_end: 10,
      margin_top: 10,
      margin_bottom: 10,
    });
    
    const mimeBlacklist = _("Mime Blacklist"	);
    const seperateWithComma = _("Seperate with comma"	);
    const mimeExamples = _("Example: image,audio,video");
    label = new Gtk.Label({
      label: mimeBlacklist +"\n" +  seperateWithComma + "\n" + mimeExamples,
      hexpand: true,
      halign: Gtk.Align.START,
    });

    widget = new Gtk.Entry({ halign: Gtk.Align.END });
    widget.set_sensitive(true);

    window._settings.bind("item-blacklist", widget, "text", Gio.SettingsBindFlags.DEFAULT);

    itemBlacklistBox.append(label);
    itemBlacklistBox.append(widget);

    group.add(itemBlacklistBox);
  }
}
