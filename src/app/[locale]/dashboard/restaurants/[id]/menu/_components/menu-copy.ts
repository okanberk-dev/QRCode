// Builder UI copy (TR/EN). Moved verbatim out of page.tsx.
export function buildMenuCopy(isTr: boolean) {
  return {
    title: isTr ? 'Menü' : 'Menu',
    // §38.73 — Editor PageHeader Pulse pattern (eyebrow + pageDescription).
    // Custom hero korunur, sadece copy hint inline ekleniyor.
    // (`description` adı form label'ı için zaten kullanılıyor — line 276.)
    eyebrow: isTr ? 'MENÜ' : 'MENU',
    pageDescription: isTr
      ? 'Kategoriler ve ürünleri düzenle. Sağ taraftaki canlı önizlemede değişiklikleri anında gör.'
      : 'Manage categories and items. Watch changes live in the preview on the right.',
    backToMenus: isTr ? 'İşletmeye Dön' : 'Back to Business',
    categories: isTr ? 'Kategoriler' : 'Categories',
    items: isTr ? 'Ürünler' : 'Items',
    addCategory: isTr ? 'Kategori Ekle' : 'Add Category',
    addItem: isTr ? 'Ürün Ekle' : 'Add Item',
    editCategory: isTr ? 'Kategori Düzenle' : 'Edit Category',
    editItem: isTr ? 'Ürün Düzenle' : 'Edit Item',
    noCategories: isTr ? 'Henüz kategori yok. Başlamak için ekleyin.' : 'No categories yet. Add one to begin.',
    noItems: isTr ? 'Bu kategoride henüz ürün yok.' : 'No items in this category yet.',
    noCategorySelected: isTr ? 'Soldan bir kategori seçin.' : 'Select a category from the left.',
    categoryName: isTr ? 'Kategori Adı' : 'Category Name',
    description: isTr ? 'Açıklama' : 'Description',
    visible: isTr ? 'Görünür' : 'Visible',
    hidden: isTr ? 'Gizli' : 'Hidden',
    itemName: isTr ? 'Ürün Adı' : 'Item Name',
    price: isTr ? 'Fiyat (₺)' : 'Price (₺)',
    imageUrl: isTr ? 'Görsel URL (opsiyonel)' : 'Image URL (optional)',
    badges: isTr ? 'Etiketler' : 'Badges',
    available: isTr ? 'Satışta' : 'Available',
    outOfStock: isTr ? 'Tükendi' : 'Out of stock',
    cancel: isTr ? 'İptal' : 'Cancel',
    save: isTr ? 'Kaydet' : 'Save',
    delete: isTr ? 'Sil' : 'Delete',
    deleteCategoryConfirm: isTr
      ? 'Bu kategori silinecek. Emin misiniz? (Aktif ürünler varsa silinemez.)'
      : 'Delete this category? (Cannot delete if it has active items.)',
    deleteItemConfirm: isTr ? 'Bu ürün silinsin mi?' : 'Delete this item?',
    publish: isTr ? 'Yayına Al' : 'Publish',
    unpublish: isTr ? 'Yayından Kaldır' : 'Unpublish',
    preview: isTr ? 'Önizle' : 'Preview',
    exitPreview: isTr ? 'Önizlemeden Çık' : 'Exit Preview',
    viewPublic: isTr ? 'Genel Sayfa' : 'Public Page',
    // §38.73 — Copy güçlendirildi: sadece publish değil, edit (kategori/ürün
    // ekle/değiştir) de POST endpoint tarafında 403 dönüyor (CLAUDE.md §5.2).
    // UI'da edit butonları disabled state'e geçer (aşağıda); banner read-only
    // moda işaret eder.
    disabledByAdmin: isTr
      ? 'Bu paket plan menü düzenlemeyi kapsamıyor. Sadece görüntüleme modu — kategori, ürün ekleyemez ve menü yayınlayamazsınız.'
      : 'Menu editing is not included in this plan. View-only mode — you cannot add categories, items, or publish the menu.',
    published: isTr ? 'Yayında' : 'Published',
    draft: isTr ? 'Taslak' : 'Draft',
    disabled: isTr ? 'Kapalı' : 'Disabled',
    lastUpdated: isTr ? 'Son güncelleme' : 'Last updated',
    menuDesign: isTr ? 'Menü Tasarımı' : 'Menu Design',
    themeLabel: isTr ? 'Tema' : 'Theme',
    themeClassic: isTr ? 'Klasik' : 'Classic',
    themeModern: isTr ? 'Modern' : 'Modern',
    themeElegant: isTr ? 'Şık' : 'Elegant',
    themeGastronomy: isTr ? 'Gastronomi' : 'Gastronomy',
    themeMinimal: isTr ? 'Minimal' : 'Minimal',
    themeBistro: isTr ? 'Bistro' : 'Bistro',
    themePulse: isTr ? 'Pulse' : 'Pulse',
    accentColor: isTr ? 'Renk' : 'Accent Color',
    menuQr: isTr ? 'Menü QR' : 'Menu QR',
    downloadQr: isTr ? 'İndir' : 'Download',
    qrFormat: isTr ? 'Format' : 'Format',
    dragToReorder: isTr ? 'Sırala' : 'Reorder',
    analytics: isTr ? 'Analitik' : 'Analytics',
    logo: isTr ? 'Menü Logosu' : 'Menu Logo',
    logoHint: isTr ? 'Kare görsel önerilir. PNG veya WebP, 5 MB altı.' : 'Square image recommended. PNG or WebP, under 5 MB.',
    uploadImage: isTr ? 'Görsel Yükle' : 'Upload Image',
    uploading: isTr ? 'Yükleniyor…' : 'Uploading…',
    removeImage: isTr ? 'Kaldır' : 'Remove',
    orUrl: isTr ? 'veya URL' : 'or URL',
    toggleVisible: isTr ? 'Görünürlüğü değiştir' : 'Toggle visibility',
    toggleOutOfStock: isTr ? 'Stok durumunu değiştir' : 'Toggle out of stock',
    saving: isTr ? 'Kaydediliyor' : 'Saving',
    resetAccent: isTr ? 'Sıfırla' : 'Reset',
  };
}
