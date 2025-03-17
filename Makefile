MODULES = extension.js prefs.js recentManager.js mirrorMapping.js mutex.js metadata.json stylesheet.css BidiMirroring.txt LICENSE README.md schemas
INSTALLPATH = ~/.local/share/gnome-shell/extensions/RecentItems@lgo.io/

# Separate JS and non-JS modules
JS_MODULES := $(filter %.js, $(MODULES))
NO_JS_MODULES := $(filter-out %.js, $(MODULES))

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

dev-install: all generate-translations
	rm -rf $(INSTALLPATH)
	mkdir -p $(INSTALLPATH)
	cp -r $(MODULES) $(INSTALLPATH)

	$(foreach file, $(wildcard locale/*/LC_MESSAGES/*.mo), \
		install -D "$(file)" $(INSTALLPATH)$(file);)
		
	glib-compile-schemas ~/.local/share/gnome-shell/extensions/RecentItems@lgo.io/schemas
		
install: bundle
	unzip -o bundle.zip -d ~/.local/share/gnome-shell/extensions/RecentItems@lgo.io
	glib-compile-schemas ~/.local/share/gnome-shell/extensions/RecentItems@lgo.io/schemas
	rm bundle.zip

test: install
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=1248x800 dbus-run-session -- gnome-shell --nested --wayland
	
dev-test: dev-install
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=1248x800 dbus-run-session -- gnome-shell --nested --wayland
	# gnome-extensions enable RecentItems@lgo.io
	# gnome-extensions disable RecentItems@lgo.io
	
bundle: generate-translations all
	echo "Creating temporary directory..."
	TEMP_DIR=$$(mktemp -d) ; \
	echo "Using $$TEMP_DIR as temporary directory" ; \
	echo "Process and copy JS files into TEMP_DIR"; \
	for mod in $(JS_MODULES); do \
	  echo "Processing JS file: $$mod"; \
	  echo "cp "$$mod" "$$TEMP_DIR/""; \
	  cp "$$mod" "$$TEMP_DIR/"; \
	  sed -i '/console\.\(log\|debug\|warn\|error\|trace\)/ s/^/\/\/ /' "$$TEMP_DIR/$$mod"; \
	done ; \
	echo "Create the bundle from the processed JS files in TEMP_DIR"; \
	BUNDLE_DIR=$$(pwd) && cd $$TEMP_DIR && zip -r "$$BUNDLE_DIR/bundle.zip" . && cd $$BUNDLE_DIR ; \
	echo "Add non-JS modules and locale files to the bundle" ; \
	zip -r bundle.zip $(NO_JS_MODULES) locale/*/*/*.mo ; \
	echo "Cleanup: remove the temporary directory" ; \
	rm -rf $$TEMP_DIR ; \
	echo "Bundle created and temporary directory removed."
