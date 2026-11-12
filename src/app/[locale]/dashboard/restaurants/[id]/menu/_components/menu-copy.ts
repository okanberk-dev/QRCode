// Builder UI copy (TR/EN). Plain strings live in `buildMenuCopy` (the modals
// that still take `Record<string, string>` can receive it as is); anything that
// needs a number or a name lives in `menuFmt`.
//
// Owner-facing wording only: no developer terms, no promise of a plan upgrade
// (the menu switch is an admin setting, not a plan feature), no raw server text
// (errors go through `mapMenuApiError`).
export function buildMenuCopy(isTr: boolean) {
  return {
    title: isTr ? 'Menü' : 'Menu',
    pageDescription: isTr
      ? 'Değişiklikler kaydedilir kaydedilmez menüne yansır.'
      : 'Changes appear on your menu as soon as you save them.',
    backToMenus: isTr ? 'İşletmeye dön' : 'Back to business',

    // ── header actions ──
    preview: isTr ? 'Önizle' : 'Preview',
    exitPreview: isTr ? 'Önizlemeden çık' : 'Exit preview',
    design: isTr ? 'Görünüm' : 'Design',
    shareAndQr: isTr ? 'Paylaş ve QR' : 'Share & QR',
    analytics: isTr ? 'Analitik' : 'Analytics',

    // ── status strip ──
    draft: isTr ? 'Taslak' : 'Draft',
    draftHint: isTr ? 'Müşteriler menünü henüz göremiyor.' : "Customers can't see your menu yet.",
    published: isTr ? 'Yayında' : 'Live',
    liveHint: isTr ? 'Değişiklikler anında yansır.' : 'Changes go live instantly.',
    liveButEmpty: isTr
      ? 'Menün yayında ama müşterilere gösterilecek ürün yok.'
      : 'Your menu is live but has no items to show customers.',
    stepCategory: isTr ? 'Kategori ekle' : 'Add categories',
    stepItems: isTr ? 'Ürün ekle' : 'Add items',
    stepPublish: isTr ? 'Yayına al' : 'Publish',
    stepCategoryShort: isTr ? 'Kategori' : 'Categories',
    stepItemsShort: isTr ? 'Ürün' : 'Items',
    stepPublishShort: isTr ? 'Yayın' : 'Publish',
    publish: isTr ? 'Yayına al' : 'Publish',
    publishNeedsItem: isTr ? 'Yayına almak için en az bir ürün ekle.' : 'Add at least one item to publish.',
    unpublish: isTr ? 'Yayından kaldır' : 'Unpublish',
    unpublishTitle: isTr ? 'Menü yayından kaldırılsın mı?' : 'Take the menu offline?',
    unpublishBody: isTr
      ? 'Menü bağlantısı ve basılı QR kodlar çalışmayı durdurur; müşteriler "Menü bulunamadı" sayfasını görür. İstediğin zaman yeniden yayına alabilirsin.'
      : 'The menu link and printed QR codes stop working; customers see a "Menu not found" page. You can publish again any time.',
    keepIt: isTr ? 'Vazgeç' : 'Cancel',
    justPublished: isTr
      ? 'Menün yayında! Linki kopyala ya da QR’ı indirip masalara koy.'
      : 'Your menu is live! Copy the link or download the QR and put it on your tables.',
    copyLink: isTr ? 'Linki kopyala' : 'Copy link',
    copied: isTr ? 'Kopyalandı' : 'Copied',
    openMenu: isTr ? 'Menüyü aç' : 'Open menu',
    moreActions: isTr ? 'Diğer işlemler' : 'More actions',
    more: isTr ? 'Diğer' : 'More',
    lastUpdated: isTr ? 'Son güncelleme' : 'Last updated',
    lockedTitle: isTr ? 'Menü düzenleme bu işletme için kapalı.' : 'Menu editing is turned off for this business.',
    lockedBody: isTr
      ? 'Mevcut menünü görüntüleyebilirsin. Düzenlemeyi açtırmak için bize yaz.'
      : 'You can view your menu. Write to us to have it turned on.',
    contactUs: isTr ? 'Bize yaz' : 'Contact us',
    contactSubject: isTr ? 'Menü modülü' : 'Menu module',
    viewerOnly: isTr
      ? 'Bu menüyü yalnızca görüntüleyebilirsin (izleyici rolü).'
      : 'You have view-only access to this menu.',

    // ── setup wizard (empty menu) ──
    moreTemplates: isTr ? 'Diğer şablonlar' : 'More templates',
    lessTemplates: isTr ? 'Daha az göster' : 'Show fewer',

    // ── categories ──
    categories: isTr ? 'Kategoriler' : 'Categories',
    addCategory: isTr ? 'Kategori ekle' : 'Add category',
    editCategory: isTr ? 'Kategoriyi düzenle' : 'Edit category',
    categoryName: isTr ? 'Kategori adı' : 'Category name',
    categoryVisibleHint: isTr
      ? 'Kapatırsan kategori ve ürünleri müşterilere görünmez.'
      : 'If off, the category and its items are hidden from customers.',
    categoryNamePlaceholder: isTr ? 'Örn. Burgerler' : 'e.g. Burgers',
    categoryNameRequired: isTr ? 'Kategori adını yaz' : 'Enter a category name',
    noCategorySelected: isTr ? 'Soldan bir kategori seç.' : 'Select a category from the left.',
    rename: isTr ? 'Yeniden adlandır' : 'Rename',
    hideFromMenu: isTr ? 'Menüde gizle' : 'Hide from menu',
    showOnMenu: isTr ? 'Menüde göster' : 'Show on menu',
    moveUp: isTr ? 'Yukarı taşı' : 'Move up',
    moveDown: isTr ? 'Aşağı taşı' : 'Move down',
    moveLeft: isTr ? 'Sola taşı' : 'Move left',
    moveRight: isTr ? 'Sağa taşı' : 'Move right',
    hiddenBadge: isTr ? 'Gizli' : 'Hidden',
    dragToReorder: isTr ? 'Sırala' : 'Reorder',
    dragHint: isTr
      ? 'Sıralamak için boşluk tuşuna bas, ok tuşlarıyla taşı, bırakmak için tekrar boşluk, vazgeçmek için Esc.'
      : 'Press space to pick up, arrow keys to move, space to drop, Escape to cancel.',
    deleteCategoryAndItems: isTr ? 'Kategoriyi ve ürünleri sil' : 'Delete category and items',
    categoryGroupLabel: isTr ? 'Kategoriler' : 'Categories',

    // ── items ──
    items: isTr ? 'Ürünler' : 'Items',
    addItem: isTr ? 'Ürün ekle' : 'Add item',
    editItem: isTr ? 'Ürünü düzenle' : 'Edit item',
    pasteList: isTr ? 'Liste yapıştır' : 'Paste a list',
    addFirstItem: isTr ? 'İlk ürünü ekle' : 'Add first item',
    emptyCategoryBody: isTr
      ? 'Ürün adı ve fiyatıyla başla. Fotoğraf ve açıklamayı sonra ekleyebilirsin.'
      : 'Start with a name and a price. Add a photo and description later.',
    soldOut: isTr ? 'Tükendi' : 'Sold out',
    hiddenOnMenu: isTr ? 'Menüde gizli' : 'Hidden',
    rowEdit: isTr ? 'Düzenle' : 'Edit',
    markSoldOut: isTr ? 'Tükendi olarak işaretle' : 'Mark as sold out',
    backInStock: isTr ? 'Tekrar satışa al' : 'Back in stock',
    hideItem: isTr ? 'Menüden gizle' : 'Hide from menu',
    showItem: isTr ? 'Menüde göster' : 'Show on menu',
    delete: isTr ? 'Sil' : 'Delete',
    cancel: isTr ? 'İptal' : 'Cancel',
    save: isTr ? 'Kaydet' : 'Save',

    // ── item editor ──
    category: isTr ? 'Kategori' : 'Category',
    itemName: isTr ? 'Ürün adı' : 'Item name',
    itemNamePlaceholder: isTr ? 'Örn. Klasik Burger' : 'e.g. Classic Burger',
    nameRequired: isTr ? 'Ürün adını yaz' : 'Enter an item name',
    priceLabel: isTr ? 'Fiyat' : 'Price',
    pricePlaceholder: isTr ? '0,00' : '0.00',
    priceRequired: isTr ? 'Fiyatı yaz (örn. 185 veya 185,50)' : 'Enter a price (e.g. 185 or 185.50)',
    priceInvalid: isTr ? 'Geçersiz fiyat' : 'Invalid price',
    priceEnterHint: isTr ? 'Enter: kaydet ve yenisini ekle' : 'Enter: save and add another',
    photo: isTr ? 'Fotoğraf' : 'Photo',
    addPhoto: isTr ? 'Fotoğraf ekle' : 'Add photo',
    photoPreparing: isTr ? 'Fotoğraf hazırlanıyor…' : 'Preparing photo…',
    photoFailed: isTr ? 'Yüklenemedi. Tekrar dene.' : 'Upload failed. Try again.',
    changePhoto: isTr ? 'Değiştir' : 'Change',
    removePhoto: isTr ? 'Kaldır' : 'Remove',
    photoHelp: isTr
      ? 'Telefondan çekebilir ya da galeriden seçebilirsin.'
      : 'Take one with your phone or pick one from your gallery.',
    photoLink: isTr ? 'Fotoğraf bağlantısı (isteğe bağlı)' : 'Photo link (optional)',
    moreOptions: isTr ? 'Daha fazla seçenek' : 'More options',
    description: isTr ? 'Açıklama' : 'Description',
    badges: isTr ? 'Etiketler' : 'Labels',
    allergens: isTr ? 'Alerjen bilgisi (isteğe bağlı)' : 'Allergen info (optional)',
    allergenHint: isTr
      ? 'Üründe bulunan ya da çapraz bulaşma riski taşıyan içerikleri seç. Müşteriler menüde uyarı olarak görür.'
      : 'Mark what the item contains or may be cross-contaminated with. Customers see it as a warning on the menu.',
    clearAll: isTr ? 'Tümünü temizle' : 'Clear all',
    sellableLabel: isTr ? 'Satışta' : 'Available',
    sellableHint: isTr ? 'Kapatırsan menüde “Tükendi” olarak görünür.' : 'If off, it shows as “Sold out” on the menu.',
    showOnMenuHint: isTr ? 'Kapatırsan ürün menüden tamamen kalkar.' : 'If off, the item disappears from the menu.',
    saveAndAdd: isTr ? 'Kaydet ve yenisini ekle' : 'Save & add another',

    // ── paste a list ──
    bulkHelp: isTr ? 'Her satıra bir ürün yaz: önce adı, sonra fiyatı.' : 'One item per line: name first, then price.',
    bulkPlaceholder: isTr ? 'Klasik Burger 185\nCheeseburger 215,50\nAyran 35' : 'Classic Burger 185\nCheeseburger 215.50\nAyran 35',
    bulkPreview: isTr ? 'Önizleme' : 'Preview',
    bulkNoPrice: isTr ? 'fiyat yok' : 'no price',
    bulkNoName: isTr ? 'ad yok' : 'no name',
    bulkNameTooLong: isTr ? 'ad çok uzun (en fazla 120 karakter)' : 'name too long (120 characters max)',
    bulkBadPrice: isTr ? 'fiyatı 1250 ya da 1250,00 yaz' : 'write the price as 1250 or 1250.00',

    // ── design dialog ──
    menuDesign: isTr ? 'Menü görünümü' : 'Menu design',
    themeLabel: isTr ? 'Tema' : 'Theme',
    themeClassic: isTr ? 'Klasik' : 'Classic',
    themeModern: isTr ? 'Modern' : 'Modern',
    themeElegant: isTr ? 'Şık' : 'Elegant',
    themeGastronomy: isTr ? 'Gastronomi' : 'Gastronomy',
    themeMinimal: isTr ? 'Minimal' : 'Minimal',
    themeBistro: isTr ? 'Bistro' : 'Bistro',
    themePulse: isTr ? 'Pulse' : 'Pulse',
    accentColor: isTr ? 'Vurgu rengi' : 'Accent color',
    accentHint: isTr
      ? 'Menü QR’ı bu rengi kullanır; okunabilirlik için çok açık renkler otomatik koyulaştırılır.'
      : 'The menu QR uses this color; very light colors are darkened automatically so it scans.',
    customColor: isTr ? 'Özel renk' : 'Custom',
    customColorChip: isTr ? 'Özel' : 'Custom',
    resetAccent: isTr ? 'Sıfırla' : 'Reset',
    logo: isTr ? 'Menü logosu' : 'Menu logo',
    uploadLogo: isTr ? 'Logo yükle' : 'Upload logo',
    changeLogo: isTr ? 'Logoyu değiştir' : 'Change logo',
    removeLogo: isTr ? 'Kaldır' : 'Remove',
    logoHint: isTr
      ? 'Kare görsel önerilir (PNG, JPG veya WebP).'
      : 'Square image recommended (PNG, JPG or WebP).',
    saving: isTr ? 'Kaydediliyor…' : 'Saving…',
    saved: isTr ? 'Kaydedildi' : 'Saved',
    done: isTr ? 'Bitti' : 'Done',
    tabSettings: isTr ? 'Ayarlar' : 'Settings',
    tabPreview: isTr ? 'Önizleme' : 'Preview',

    // ── share & QR dialog ──
    menuLink: isTr ? 'Menü bağlantısı' : 'Menu link',
    copyShort: isTr ? 'Kopyala' : 'Copy',
    downloadQr: isTr ? 'QR’ı indir' : 'Download QR',
    downloadPrint: isTr ? 'Baskı için yüksek kalite indir' : 'Download high quality for print',
    downloaded: isTr ? 'İndirildi' : 'Downloaded',
    qrAlt: isTr ? 'Menü QR kodu' : 'Menu QR code',
    qrAdjusted: isTr
      ? 'QR, telefonların rahat okuyabilmesi için seçtiğin rengin koyu tonuyla hazırlandı.'
      : 'The QR uses a darker shade of your color so phones can scan it reliably.',
    shareTip: isTr
      ? 'Masalara, kasaya ve vitrine koy. İlk taramalar Analitik’te görünür.'
      : 'Place it on tables, at the till and in the window. First scans show up in Analytics.',
    openAnalytics: isTr ? 'Analitiği aç' : 'Open Analytics',
    shareDraftWarning: isTr
      ? 'Menün henüz yayında değil. Bu QR’ı okutan müşteriler "Menü bulunamadı" sayfasını görür.'
      : 'Your menu isn’t live yet. Customers who scan this QR will see a "Menu not found" page.',
    retry: isTr ? 'Tekrar dene' : 'Try again',

    // ── dialogs ──
    leaveTitle: isTr ? 'Kaydetmeden çıkılsın mı?' : 'Leave without saving?',
    leaveBody: isTr ? 'Yazdıkların kaydedilmeyecek.' : "Your changes won't be saved.",
    leave: isTr ? 'Çık' : 'Leave',
    keepEditing: isTr ? 'Devam et' : 'Keep editing',
  };
}

export type MenuCopy = ReturnType<typeof buildMenuCopy>;

/** English noun agreement: "1 item" / "2 items". Turkish has no plural here. */
function count(n: number, tr: string, enOne: string, enMany: string, isTr: boolean): string {
  return isTr ? `${n} ${tr}` : `${n} ${n === 1 ? enOne : enMany}`;
}

/** Copy that needs a number or a name. */
export function menuFmt(isTr: boolean) {
  return {
    categoryCount: (n: number) => count(n, 'kategori', 'category', 'categories', isTr),
    itemCount: (n: number) => count(n, 'ürün', 'item', 'items', isTr),
    hiddenCount: (n: number) => (isTr ? `${n} menüde gizli` : `${n} hidden`),

    deleteCategoryTitle: (name: string) => (isTr ? `“${name}” silinsin mi?` : `Delete “${name}”?`),
    deleteCategoryBody: () =>
      isTr ? 'Bu kategori menüden kaldırılır.' : 'This category is removed from your menu.',
    deleteCategoryWithItemsTitle: (name: string, n: number) =>
      isTr
        ? `“${name}” ve içindeki ${n} ürün silinsin mi?`
        : `Delete “${name}” and its ${n} ${n === 1 ? 'item' : 'items'}?`,
    deleteCategoryWithItemsBody: () => (isTr ? 'Bu işlem geri alınamaz.' : "This can't be undone."),
    deleteItemTitle: (name: string) => (isTr ? `“${name}” silinsin mi?` : `Delete “${name}”?`),
    deleteItemBody: () => (isTr ? 'Ürün menüden kaldırılır.' : 'This item is removed from your menu.'),

    presetPartial: () =>
      isTr ? 'Bazı kategoriler eklenemedi. Tekrar dene.' : "Some categories couldn't be added. Try again.",
    setupCreated: (categories: number, items: number) =>
      isTr
        ? items > 0
          ? `Menün hazır: ${categories} kategori, ${items} ürün. Kontrol edip yayına alabilirsin.`
          : `${categories} kategori eklendi. Şimdi ürünlerini ekle.`
        : items > 0
          ? `Your menu is ready: ${categories} ${categories === 1 ? 'category' : 'categories'}, ${items} ${items === 1 ? 'item' : 'items'}. Check it and publish.`
          : `${categories} ${categories === 1 ? 'category' : 'categories'} added. Now add your items.`,

    emptyCategoryTitle: (name: string) => (isTr ? `${name} henüz boş` : `${name} is empty`),

    itemAdded: (name: string) => (isTr ? `${name} eklendi` : `${name} added`),
    priceZero: (symbol: string) =>
      isTr ? `Fiyat 0 ${symbol} olarak görünecek.` : `The price will show as 0 ${symbol}.`,
    allergenSelected: (n: number) => (isTr ? `${n} seçili` : `${n} selected`),

    bulkOverLimit: (max: number) =>
      isTr ? `En fazla ${max} ürün ekleyebilirsin.` : `You can add up to ${max} items at once.`,
    bulkWillAdd: (n: number) => (isTr ? `${n} ürün eklenecek` : `${n} ${n === 1 ? 'item' : 'items'} will be added`),
    bulkUnreadable: (n: number) =>
      isTr
        ? `${n} satır okunamadı — fiyatı satırın sonuna yaz.`
        : `${n} ${n === 1 ? 'line' : 'lines'} couldn’t be read — put the price at the end of the line.`,
    bulkAdd: (n: number) => (isTr ? `${n} ürünü ekle` : `Add ${n} ${n === 1 ? 'item' : 'items'}`),
    bulkAdded: (n: number) => (isTr ? `${n} ürün eklendi` : `${n} ${n === 1 ? 'item' : 'items'} added`),
    bulkRowLabel: (name: string, price: string) => `${name} — ${price}`,
    bulkRowError: (line: string, reason: string) => `${line} — ${reason}`,

    themeCardLabel: (name: string) => (isTr ? `${name} teması` : `${name} theme`),
    itemRowLabel: (name: string, price: string) =>
      isTr ? `${name}, ${price}. Düzenle` : `${name}, ${price}. Edit`,
    switchLabel: (name: string) => (isTr ? `${name}: satışta` : `${name}: available`),
    itemActionsLabel: (name: string) => (isTr ? `${name} için işlemler` : `Actions for ${name}`),
    categoryActionsLabel: (name: string) => (isTr ? `${name} kategorisi için işlemler` : `Actions for category ${name}`),
    selectedCategoryActionsLabel: (name: string) =>
      isTr ? `Seçili kategori (${name}) için işlemler` : `Actions for the selected category (${name})`,
    categoryChipLabel: (name: string, n: number) =>
      isTr ? `${name}, ${n} ürün` : `${name}, ${n} ${n === 1 ? 'item' : 'items'}`,
    stepCategoryDone: (n: number) => count(n, 'kategori', 'category', 'categories', isTr),
    stepItemsDone: (n: number) => count(n, 'ürün', 'item', 'items', isTr),
  };
}

export type MenuFmt = ReturnType<typeof menuFmt>;
