MODULES = metadata.json recentManager.js extension.js prefs.js stylesheet.css LICENSE README.md BidiMirroring.txt schemas/
INSTALLPATH = ~/.local/share/gnome-shell/extensions/RecentItems@bananenfisch.net/

all: compile-settings compile-locales

compile-settings:
	glib-compile-schemas --strict --targetdir=schemas/ schemas

compile-locales:
	$(foreach file, $(wildcard locale/*/LC_MESSAGES/*.po), \
		msgfmt $(file) -o $(subst .po,.mo,$(file));)

generate-translations:
	./generate_translations.sh

update-pot:
	rm RecentItems.pot
	xgettext -L JavaScript --from-code=UTF-8 -k_ -kN_ -o RecentItems.pot *.js

update-po-files:
	$(foreach file, $(wildcard locale/*/LC_MESSAGES/*.po), \
		msgmerge --backup=none --update $(file) RecentItems.pot ;)

install: all
	rm -rf $(INSTALLPATH)
	mkdir -p $(INSTALLPATH)
	cp -r $(MODULES) $(INSTALLPATH)

	$(foreach file, $(wildcard locale/*/LC_MESSAGES/*.mo), \
		install -D "$(file)" $(INSTALLPATH)$(file);)
		
test: generate-translations all
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=1248x800 dbus-run-session -- gnome-shell --nested --wayland
	
bundle: generate-translations all
	zip -r bundle.zip $(MODULES) locale/*/*/*.mo
