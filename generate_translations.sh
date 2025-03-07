#!/bin/bash
# Called by make all and generated by ChatGPT
SCRIPT_PATH="$(dirname "$0")"
SCRIPT_PATH="$(cd "$SCRIPT_PATH" && pwd)"

# Define the output directory and domain
LOCALE_DIR="$SCRIPT_PATH/locale"
DOMAIN=$(grep '"uuid":' $SCRIPT_PATH/metadata.json | sed -E 's/.*"uuid": "([^"]+)".*/\1/')

if [ -d "$LOCALE_DIR" ]; then
	rm -Rf "$LOCALE_DIR"
fi




declare -A page_of=(
  ["en"]="%x of %y"
  ["ar"]="%x من %y"
  ["ca"]="%x de %y"
  ["cs"]="%x z %y"
  ["de"]="%x von %y"
  ["el"]="%x από %y"
  ["es"]="%x de %y"
  ["eu"]="%x tik %y"
  ["fa"]="%x از %y"
  ["fi"]="%x / %y"
  ["fr"]="%x sur %y"
  ["hu"]="%x az %y"
  ["it"]="%x di %y"
  ["ja"]="%y 中の %x"
  ["nl"]="%x van %y"
  ["oc"]="%x de %y"
  ["pl"]="%x z %y"
  ["pt_BR"]="%x de %y"
  ["ru"]="%x из %y"
  ["sk"]="%x z %y"
  ["tr"]="%x / %y"
  ["uk"]="%x з %y"
  ["zh_CN"]="第 %x，共 %y"
)

declare -A window_width_percentage=(
  ["en"]="Window width (%)"
  ["ar"]="عرض النافذة (%)"
  ["ca"]="Amplada de la finestra (%)"
  ["cs"]="Šířka okna (%)"
  ["de"]="Fensterbreite (%)"
  ["el"]="Πλάτος παραθύρου (%)"
  ["es"]="Ancho de ventana (%)"
  ["eu"]="Leihoaren zabalera (%)"
  ["fa"]="عرض پنجره (%)"
  ["fi"]="Ikkunan leveys (%)"
  ["fr"]="Largeur de la fenêtre (%)"
  ["hu"]="Ablak szélessége (%)"
  ["it"]="Larghezza finestra (%)"
  ["ja"]="ウィンドウの幅 (%)"
  ["nl"]="Vensterbreedte (%)"
  ["oc"]="Largor de la fenèstra (%)"
  ["pl"]="Szerokość okna (%)"
  ["pt_BR"]="Largura da janela (%)"
  ["ru"]="Ширина окна (%)"
  ["sk"]="Šírka okna (%)"
  ["tr"]="Pencere genişliği (%)"
  ["uk"]="Ширина вікна (%)"
  ["zh_CN"]="窗口宽度 (%)"
)

# Define translations for each string
declare -A private_mode=(
  ["en"]="Private mode"
  ["ar"]="وضع خاص"
  ["ca"]="Mode privat"
  ["cs"]="Soukromý režim"
  ["de"]="Privater Modus"
  ["el"]="Ιδιωτική λειτουργία"
  ["es"]="Modo privado"
  ["eu"]="Modu pribatua"
  ["fa"]="حالت خصوصی"
  ["fi"]="Yksityinen tila"
  ["fr"]="Mode privé"
  ["hu"]="Privát mód"
  ["it"]="Modalità privata"
  ["ja"]="プライベートモード"
  ["nl"]="Privémodus"
  ["oc"]="Mòde privat"
  ["pl"]="Tryb prywatny"
  ["pt_BR"]="Modo privado"
  ["ru"]="Приватный режим"
  ["sk"]="Súkromný režim"
  ["tr"]="Gizli mod"
  ["uk"]="Приватний режим"
  ["zh_CN"]="私人模式"
)

declare -A clear_all_recent_items=(
  ["en"]="Clear all recent items"
  ["ar"]="مسح جميع العناصر الأخيرة"
  ["ca"]="Esborra tots els elements recents"
  ["cs"]="Vymazat všechny poslední položky"
  ["de"]="Alle letzten Elemente löschen"
  ["el"]="Καθαρίστε όλα τα πρόσφατα στοιχεία"
  ["es"]="Borrar todos los elementos recientes"
  ["eu"]="Ezabatu azken elementu guztiak"
  ["fa"]="حذف همه موارد اخیر"
  ["fi"]="Tyhjennä kaikki viimeisimmät kohteet"
  ["fr"]="Effacer tous les éléments récents"
  ["hu"]="Minden legutóbbi elem törlése"
  ["it"]="Cancella tutti gli elementi recenti"
  ["ja"]="すべての最近のアイテムをクリア"
  ["nl"]="Verwijder alle recente items"
  ["oc"]="Escafar totes las elements recents"
  ["pl"]="Usuń wszystkie ostatnie elementy"
  ["pt_BR"]="Limpar todos os itens recentes"
  ["ru"]="Очистить все последние элементы"
  ["sk"]="Vymazať všetky posledné položky"
  ["tr"]="Tüm son öğeleri temizle"
  ["uk"]="Очистити всі останні елементи"
  ["zh_CN"]="清除所有最近的项目"
)

declare -A recent_item_settings=(
  ["en"]="Recent Item Settings"
  ["ar"]="إعدادات العناصر الأخيرة"
  ["ca"]="Configuració d'elements recents"
  ["cs"]="Nastavení posledních položek"
  ["de"]="Einstellungen für letzte Elemente"
  ["el"]="Ρυθμίσεις πρόσφατων στοιχείων"
  ["es"]="Configuración de elementos recientes"
  ["eu"]="Azken elementuen ezarpenak"
  ["fa"]="تنظیمات موارد اخیر"
  ["fi"]="Viimeisimpien kohteiden asetukset"
  ["fr"]="Paramètres des éléments récents"
  ["hu"]="Legutóbbi elemek beállításai"
  ["it"]="Impostazioni degli elementi recenti"
  ["ja"]="最近のアイテム設定"
  ["nl"]="Instellingen voor recente items"
  ["oc"]="Paramètres dels elements recents"
  ["pl"]="Ustawienia ostatnich elementów"
  ["pt_BR"]="Configurações de itens recentes"
  ["ru"]="Настройки последних элементов"
  ["sk"]="Nastavenia posledných položiek"
  ["tr"]="Son öğe ayarları"
  ["uk"]="Налаштування останніх елементів"
  ["zh_CN"]="最近项目设置"
)

declare -A settings=(
  ["en"]="Settings"
  ["ar"]="الإعدادات"
  ["ca"]="Configuració"
  ["cs"]="Nastavení"
  ["de"]="Einstellungen"
  ["el"]="Ρυθμίσεις"
  ["es"]="Configuración"
  ["eu"]="Ezarpenak"
  ["fa"]="تنظیمات"
  ["fi"]="Asetukset"
  ["fr"]="Paramètres"
  ["hu"]="Beállítások"
  ["it"]="Impostazioni"
  ["ja"]="設定"
  ["nl"]="Instellingen"
  ["oc"]="Paramètres"
  ["pl"]="Ustawienia"
  ["pt_BR"]="Configurações"
  ["ru"]="Настройки"
  ["sk"]="Nastavenia"
  ["tr"]="Ayarlar"
  ["uk"]="Налаштування"
  ["zh_CN"]="设置"
)

declare -A mime_blacklist=(
  ["en"]="Mime Blacklist"
  ["ar"]="قائمة MIME المحظورة"
  ["ca"]="Llista negra MIME"
  ["cs"]="Blacklist MIME"
  ["de"]="MIME-Blacklist"
  ["el"]="Μαύρη λίστα MIME"
  ["es"]="Lista negra MIME"
  ["eu"]="MIME beltzaren zerrenda"
  ["fa"]="لیست سیاه MIME"
  ["fi"]="MIME-musta lista"
  ["fr"]="Liste noire MIME"
  ["hu"]="MIME tiltólistája"
  ["it"]="Lista nera MIME"
  ["ja"]="MIMEブラックリスト"
  ["nl"]="MIME-zwarte lijst"
  ["oc"]="Lista negra MIME"
  ["pl"]="Czarna lista MIME"
  ["pt_BR"]="Lista negra MIME"
  ["ru"]="Черный список MIME"
  ["sk"]="Blacklist MIME"
  ["tr"]="MIME kara listesi"
  ["uk"]="Чорний список MIME"
  ["zh_CN"]="MIME黑名单"
)

declare -A separate_with_comma=(
  ["en"]="Seperate with comma"
  ["ar"]="افصل بفاصلة"
  ["ca"]="Separar amb comes"
  ["cs"]="Oddělte čárkou"
  ["de"]="Mit Komma trennen"
  ["el"]="Διαχωρίστε με κόμμα"
  ["es"]="Separar con coma"
  ["eu"]="Koma batekin bereizi"
  ["fa"]="با کاما جدا کنید"
  ["fi"]="Erottele pilkulla"
  ["fr"]="Séparer par des virgules"
  ["hu"]="Vesszővel elválasztva"
  ["it"]="Separare con virgola"
  ["ja"]="カンマで区切る"
  ["nl"]="Scheiden met komma"
  ["oc"]="Separar amb coma"
  ["pl"]="Oddziel przecinkiem"
  ["pt_BR"]="Separar com vírgula"
  ["ru"]="Разделить запятой"
  ["sk"]="Oddelujte čiarkou"
  ["tr"]="Virgülle ayırın"
  ["uk"]="Розділіть комами"
  ["zh_CN"]="用逗号分隔"
)

declare -A mime_blacklist_example=(
  ["en"]="Example: image,audio,video"
  ["ar"]="مثال: image,audio,video"
  ["ca"]="Exemple: image,audio,video"
  ["cs"]="Příklad: image,audio,video"
  ["de"]="Beispiel: image,audio,video"
  ["el"]="Παράδειγμα: image,audio,video"
  ["es"]="Ejemplo: image,audio,video"
  ["eu"]="Adibidea: image,audio,video"
  ["fa"]="مثال: image,audio,video"
  ["fi"]="Esimerkki: image,audio,video"
  ["fr"]="Exemple : image,audio,vidéo"
  ["hu"]="Példa: image,audio,video"
  ["it"]="Esempio: image,audio,video"
  ["ja"]="例: image,audio,video"
  ["nl"]="Voorbeeld: image,audio,video"
  ["oc"]="Exemple: image,audio,video"
  ["pl"]="Przykład: image,audio,video"
  ["pt_BR"]="Exemplo: image,audio,video"
  ["ru"]="Пример: image,audio,video"
  ["sk"]="Príklad: image,audio,video"
  ["tr"]="Örnek: image,audio,video"
  ["uk"]="Приклад: image,audio,video"
  ["zh_CN"]="例如：image,audio,video"
)

declare -A item_count=(
  ["en"]="Item Count"
  ["ar"]="عدد العناصر"
  ["ca"]="Recompte d'elements"
  ["cs"]="Počet položek"
  ["de"]="Anzahl der Elemente"
  ["el"]="Αριθμός αντικειμένων"
  ["es"]="Recuento de elementos"
  ["eu"]="Elementu kopurua"
  ["fa"]="تعداد موارد"
  ["fi"]="Kohteiden lukumäärä"
  ["fr"]="Nombre d'éléments"
  ["hu"]="Elemek száma"
  ["it"]="Conteggio elementi"
  ["ja"]="アイテム数"
  ["nl"]="Aantal items"
  ["oc"]="Nombre d'elements"
  ["pl"]="Liczba elementów"
  ["pt_BR"]="Contagem de itens"
  ["ru"]="Количество элементов"
  ["sk"]="Počet položiek"
  ["tr"]="Öğe Sayısı"
  ["uk"]="Кількість елементів"
  ["zh_CN"]="项目计数"
)

declare -A search=(
  ["en"]="Search..."
  ["ar"]="بحث..."
  ["ca"]="Cerca..."
  ["cs"]="Hledat..."
  ["de"]="Suchen..."
  ["el"]="Αναζήτηση..."
  ["es"]="Buscar..."
  ["eu"]="Bilatu..."
  ["fa"]="جستجو..."
  ["fi"]="Etsi..."
  ["fr"]="Rechercher..."
  ["hu"]="Keresés..."
  ["it"]="Cerca..."
  ["ja"]="検索..."
  ["nl"]="Zoeken..."
  ["oc"]="Cercar..."
  ["pl"]="Szukaj..."
  ["pt_BR"]="Pesquisar..."
  ["ru"]="Поиск..."
  ["sk"]="Hľadať..."
  ["tr"]="Ara..."
  ["uk"]="Пошук..."
  ["zh_CN"]="搜索..."
)
# Generate PO and MO files
mkdir -p "$LOCALE_DIR"
cd "$SCRIPT_PATH"

for lang in "ar" "ca" "cs" "de" "el" "es" "eu" "fa" "fi" "fr" "hu" "it" "ja" "nl" "oc" "pl" "pt_BR" "ru" "sk" "tr" "uk" "zh_CN"; do
  mkdir -p "$LOCALE_DIR/$lang/LC_MESSAGES"
  PO_FILE="$LOCALE_DIR/$lang/LC_MESSAGES/$DOMAIN.po"

  # Create PO file with translations
  echo "msgid \"\"" > "$PO_FILE"
  echo "msgstr \"\"" >> "$PO_FILE"
  echo "\"Content-Type: text/plain; charset=UTF-8\"" >> "$PO_FILE"
  for key in page_of window_width_percentage private_mode clear_all_recent_items recent_item_settings settings mime_blacklist  separate_with_comma mime_blacklist_example search item_count; do
    declare -n translations=$key
    echo "" >> "$PO_FILE"
    echo "msgid \"${translations[en]}\"" >> "$PO_FILE"
    echo "msgstr \"${translations[$lang]}\"" >> "$PO_FILE"
  done
done
make update-pot
make update-po-files
