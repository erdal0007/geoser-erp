# GEOSER ERP — Kod İnceleme ve Güvenlik Raporu

**Tarih:** 24.09.2026
**Kapsam:** Repodaki tüm dosyalar (`index.html`, `index.htmll`, `firestore.rules`, `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `.env.example`)

Uygulama, tek bir `index.html` dosyasında çalışan, verileri tarayıcının `localStorage` alanında tutan bir ERP/CRM ekranı. `package.json` ve Vite/Tailwind yapılandırması bir React + Firebase projesine göre hazırlanmış, ancak `src/` klasörü yok ve bu bağımlılıkların hiçbiri kullanılmıyor.

Bu PR'da yalnızca **güvenli ve küçük kapsamlı** düzeltmeler yapıldı (bkz. Bölüm 1). Mimari değişiklik gerektiren veya riskli bulgular düzeltilmedi. Bunlar Bölüm 2'de öncelik sırasıyla listelendi.

---

## 1. Bu PR'da yapılan düzeltmeler

| # | Sorun | Düzeltme |
|---|-------|----------|
| 1 | **Modallar ikinci kez açılmıyordu.** `closeModal` iki kez tanımlanmıştı. Sonraki tanım (CRM için yazılmış olan) ERP modallarına `style.display='none'` yazıyordu. Bu yüzden bir modal bir kez kapatıldıktan sonra (Ürün, Sipariş, Üretim vb.) sayfa yenilenene kadar bir daha açılmıyordu. | `closeModal` tek tanıma indirildi. `.modal` sınıfı olanlarda `open` sınıfını kaldırıyor, CRM modallarında `display:none` kullanıyor. |
| 2 | **"+ Yeni" kaydı eski kaydın üzerine yazıyordu.** Bir kayıt düzenlendikten sonra "+ Yeni …" butonuna basılınca gizli `id` alanı dolu kalıyordu. Bu yüzden "yeni" kayıt, en son düzenlenen kaydın üzerine yazılıyordu (veri kaybı). | "+ Yeni" butonları artık `openModalNew()` fonksiyonunu çağırıyor. Bu fonksiyon formu ve gizli id'yi sıfırlıyor, başlığı "Yeni …" olarak geri getiriyor. |
| 3 | **Sevkiyat düzenleme kopya oluşturuyordu.** Her düzenlemede yeni bir sevkiyat kaydı ekleniyordu. | Gizli `shipmentId` alanı eklendi. Düzenleme artık mevcut kaydı güncelliyor. |
| 4 | **Pazarlama rolleri CRM'e giremiyordu.** `dis_ticaret` ve `ic_pazar` kullanıcıları "görüntüleyici" sayıldığı için `showSection('crm')` "erişim yetkiniz yok" uyarısıyla engelleniyordu. | `VIEWER_ALLOWED` listesine `crm` ve `mystats` eklendi. Bu iki bölümün sayfa başlıkları da eklendi. |
| 5 | **Stored XSS.** Ürün adları (Firestore'dan kimlik doğrulamasız okunuyor), müşteri/teklif alanları, loglar ve ayarlar kaçışsız biçimde `innerHTML` ve `document.write` ile basılıyordu. Firestore'a veya localStorage'a yazılan `<img onerror=…>` gibi bir değer kod çalıştırabiliyordu. | `esc()` HTML kaçış fonksiyonu eklendi. Tüm tablo, rapor, detay, proforma (`printQuote`), CRM ve reçete görünümlerinde kullanıcı/uzak veri kaçışlanıyor. |
| 6 | **Teklif satırı açıklaması bozuluyordu.** Açıklama `encodeURIComponent` ile input'a yazılıyordu. Kullanıcı `PVC%20…` gibi bir metin görüyordu, "Satır Ekle" her tıklamada metni yeniden kodluyordu, metinde `%` karakteri varsa `decodeURIComponent` hata verip kaydı engelliyordu. | HTML kaçışına geçildi, decode kaldırıldı. Kayıtlı veri formatı değişmedi. |
| 7 | **Başarısız Firestore isteği id sayaçlarını sıfırlıyordu.** Firestore isteği başarısız olunca (çevrimdışı vb.) `seedData()` `nextId` sayaçlarını sıfırlıyordu. Sonrasında aynı numaralı sipariş/üretim kayıtları oluşabiliyordu. | Kayıtlı sayaç varsa `seedData` artık dokunmuyor. |
| 8 | **Red işleminde "İptal" de reddediyordu.** Teklif reddinde neden sorusuna "İptal" denince teklif yine reddediliyordu. | İptal edilince işlem duruyor. |
| 9 | **Müşteri sahipliği değişiyordu.** Yönetici başka bir kullanıcının müşterisini düzenleyince `ownerId` yöneticiye geçiyordu ve müşteri asıl sorumlunun listesinden kayboluyordu. | Düzenlemede mevcut sahip korunuyor. |
| 10 | **"Bu hafta" istatistiğinde hata.** Hafta başı günün o anki saatinden hesaplandığı için haftanın ilk günündeki teklifler sayılmıyordu. | Hafta başı 00:00'a çekildi. |
| 11 | **Bozuk kayıt uygulamayı çökertiyordu.** `geoser_rt` localStorage kaydı bozuksa `JSON.parse` tüm betiği durduruyordu (giriş bile yapılamıyordu). | `try/catch` eklendi. |
| 12 | **Boş tablo satırı eksik genişlikteydi.** Hammadde ve Sipariş tablolarında `colspan` 8 idi, sütun sayısı ise 9. | `colspan="9"` yapıldı. |
| 13 | **Chart.js sürümü sabit değildi.** Sürümsüz CDN adresi kullanılıyordu. Yeni bir major sürüm çıkarsa grafikler kırılabilirdi. | `chart.js@4` olarak sabitlendi. |

**Doğrulama:** JS sözdizimi `node --check` ile kontrol edildi. Değişiklikler headless Chromium'da Playwright ile uçtan uca denendi. Denenen senaryolar: giriş; tüm bölümlerin açılması; ürün düzenleme → kapatma → "+ Yeni" (orijinal dosyada bu adım takılıyordu, düzeltilmiş dosyada çalışıyor); sevkiyat düzenleme; pazarlama kullanıcısıyla CRM, müşteri ve teklif akışı; XSS yükünün çalışmaması; raporlar ve reçete hesaplama. Sayfada hiçbir JS hatası oluşmadı.

---

## 2. Düzeltilmeyen bulgular (öncelik sırasıyla)

### 🔴 KRİTİK

**K1. Tüm kullanıcı şifreleri kaynak kodda düz metin olarak duruyor (`index.html`, `USERS` dizisi).**
Süper admin dahil 8 hesabın e-posta ve şifresi, sayfanın kaynağını açan herkes tarafından görülebiliyor. Şifreler git geçmişinde de var. Çoğu hesap aynı şifreyi (`Geoser2026!`) kullanıyor. Yeni kullanıcıların varsayılan şifresi de bu.
- **Hemen yapılması gerekenler:** Bu şifreler başka bir yerde (e-posta, Firebase, sunucu vb.) kullanılıyorsa **derhal değiştirin**. Repo herkese açıksa şifreleri ele geçirilmiş sayın. Git geçmişinden temizlemek için `git filter-repo` / BFG kullanılabilir, ancak bu yeterli değildir: şifreler mutlaka değiştirilmelidir.
- **Kalıcı çözüm:** Firebase Authentication'a (veya başka bir sunucu tarafı kimlik doğrulamaya) geçin. Şifreler istemci kodunda hiçbir biçimde bulunmamalıdır.
- *Neden düzeltilmedi:* Kimlik doğrulama altyapısının değişmesini ve kullanıcıların yeniden oluşturulmasını gerektiriyor. Yalnızca istemci tarafında hash'lemek gerçek bir koruma sağlamaz (bkz. K2).

**K2. Kimlik doğrulama ve yetkilendirme tamamen istemci tarafında yapılıyor.**
Giriş kontrolü, roller ve menü kısıtlamaları yalnızca tarayıcıdaki JavaScript'te uygulanıyor. Tarayıcı konsolunda `APP.currentUser=USERS[0]` gibi tek bir satırla veya DOM düzenlenerek herkes süper admin olabilir. "Görüntüleyici" kısıtlaması yalnızca butonları gizliyor. Tüm fonksiyonlar (`deleteProduct`, `approveQuote` vb.) konsoldan çağrılabiliyor. Oturum da kalıcı değil (sayfa yenilenince çıkış yapılıyor).
- **Çözüm:** Veriyi ve yetkiyi sunucu tarafına taşıyın (ör. Firebase Auth + rol bazlı Firestore kuralları). İstemcideki kontroller yalnızca arayüz kolaylığı olarak kalmalı.

**K3. Kurumsal verilerin tamamı yalnızca tarayıcının localStorage alanında tutuluyor.**
Siparişler, müşteriler, teklifler ve reçeteler cihaza özel. Kullanıcılar birbirinin verisini görmüyor (ör. teklif onay akışı yalnızca aynı tarayıcıda çalışır). Tarayıcı verisi temizlenirse her şey kalıcı olarak kaybolur ve yedekleme yok. Aynı bilgisayarı kullanan herkes tüm veriyi okuyabilir ve değiştirebilir.
- **Çözüm:** Merkezi bir veritabanına (Firestore vb.) geçiş ve düzenli yedekleme.

### 🟠 YÜKSEK

**Y1. Firestore'dan kimlik doğrulamasız okuma yapılıyor ve repodaki kurallarla uyuşmuyor.**
`initApp()` fonksiyonu `urunler` koleksiyonunu REST API ile token olmadan okuyor. `firestore.rules` dosyasında `urunler` için bir kural yok, bu da varsayılan olarak reddetme anlamına gelir. Uygulama çalışıyorsa, canlıdaki kurallar repodakinden farklı ve **herkese açık okuma** izni veriyor demektir. Canlı kuralları Firebase Console'dan kontrol edin. Herkese açık yazma da varsa bu kritik düzeydedir (XSS kaçışı bu PR'da eklendi, ancak veri bütünlüğü yine risk altında).

**Y2. `firestore.rules`: giriş yapmış her kullanıcı her koleksiyona yazabiliyor.**
`products`, `orders`, `customers`, `backups` vb. için yalnızca `request.auth != null` koşulu var. `users/{userId}` kuralı kullanıcının kendi dokümanına yazmasına izin verdiği için, kullanıcı kendi `role` alanını `admin` yapabilir (yetki yükseltme). Rol alanı yalnızca yöneticiler veya Cloud Functions tarafından yazılabilmeli. Koleksiyonlara rol bazlı `allow write` koşulları eklenmeli.

**Y3. `index.htmll`: eski ve kullanılmayan bir uygulama sürümü repoda duruyor.**
Dosyanın uzantısı hatalı (`.htmll`) ve sunulmuyor. İçeriği:
- Kayıt ekranında kullanıcının kendi rolünü (`admin` dahil) seçmesine izin veriyor.
- Profil dokümanı yoksa kullanıcıya varsayılan olarak `role:"admin"` atıyor.

Y2'deki kuralla birlikte, bu sürüm yeniden yayına alınırsa herkes admin olabilir. Dosya ayrıca Firebase yapılandırmasını içeriyor. Silinmesi veya ayrı bir arşive taşınması önerilir. *Yedek olarak tutuluyor olabileceği için silinmedi.*

**Y4. Firestore ürünleri her girişte yerel ürün listesinin üzerine yazılıyor.**
`initApp()` her açılışta `APP.products` listesini Firestore verisiyle tamamen değiştiriyor ve id'leri sıradan (`1001+`) yeniden üretiyor. Sonuçlar:
- Yerelde eklenen veya düzenlenen ürünler kayboluyor.
- Siparişler, üretim emirleri ve reçetelerdeki `productId` referansları başka ürünlere kayabiliyor.
- Firestore'daki sıra değişirse referanslar yanlış ürünü gösteriyor.

Firestore doküman id'si kalıcı anahtar olarak kullanılmalı ve iki yönlü senkronizasyon tasarlanmalı.

### 🟡 ORTA

**O1. Üçüncü taraf betikler sürümsüz ve SRI'sız yükleniyor.**
- `cdn.tailwindcss.com` Tailwind'in yalnızca geliştirme için olan "Play CDN" adresi ve canlı ortamda kullanılması önerilmiyor.
- Chart.js ve YouTube IFrame API'sinde `integrity` (SRI) yok.

CDN'lerden biri ele geçirilirse sayfada ve localStorage'daki tüm veride kod çalıştırılabilir. Tailwind derleme adımıyla kullanılmalı (mevcut `tailwind.config.js` zaten hazır), diğer betikler sürüm + SRI ile yüklenmeli ve bir Content-Security-Policy eklenmeli.

**O2. Girişten sonra YouTube müziği otomatik çalıyor.**
Kurumsal bir uygulamada beklenmeyen bir davranış. Ayrıca her ziyaretçide YouTube'a (Google) istek gidiyor (çerez ve izleme, KVKK açısından değerlendirilmeli). Kaldırılması veya kullanıcı tercihine bağlanması önerilir.

**O3. Kullanıcı yönetimi kalıcı değil.**
`saveUser` yalnızca bellekteki `USERS` dizisini değiştiriyor. Eklenen kullanıcı ve değiştirilen şifre/rol sayfa yenilenince kayboluyor. Rol seçim kutusunda `dis_ticaret` ve `ic_pazar` rolleri de yok. K1/K2 ile birlikte yeniden tasarlanmalı.

**O4. Raporlardaki "Toplam Satış Geliri" her zaman ₺0 gösteriyor.**
`renderReports` içinde `p?0:0` ifadesi kullanılıyor ve ürünlerde fiyat alanı yok. Doğru hesap için siparişe veya ürüne fiyat alanı eklenmesi gerekiyor. Bu bir iş kuralı kararı olduğu için değiştirilmedi.

**O5. Proforma çıktısında yer tutucu ve tutarsız metinler var.**
`printQuote` başlığında "UGURAL / GEOSER" yazıyor, banka bilgisi `IBAN: TR...` biçiminde bir yer tutucu. Resmi belgede yanlış veya eksik bilgi çıkıyor. Doğru firma unvanı ve IBAN ayarlardan okunmalı.

**O6. Silme ve düzenleme işlemlerinde yetki kontrolü tutarsız.**
- Pazarlama kullanıcısının kendi teklifini silme butonu, `applyRoleRestrictions` "delete" içeren tüm butonları gizlediği için bazen görünmüyor, liste yeniden çizilince geri geliyor.
- `deleteCustomer` fonksiyonunun kendisinde rol kontrolü yok (yalnızca buton gizleniyor).

K2 ile birlikte ele alınmalı.

**O7. Tarihlerde UTC/yerel saat karışıklığı var.**
`new Date().toISOString().split('T')[0]` UTC tarihini veriyor. Türkiye'de 00:00–03:00 arasında oluşturulan sipariş, KK ve teklifler bir önceki günün tarihiyle kaydediliyor.

### 🟢 DÜŞÜK

- **D1. Kullanılmayan veya uyumsuz proje dosyaları var.** `package.json` (React, Firebase, react-router vb.), `vite.config.js` ve `tailwind.config.js` bulunmayan bir `src/` yapısına göre hazırlanmış, `index.html` bunları kullanmıyor. `.gitignore` dosyası yok. Projeye `.env` eklenirse yanlışlıkla commit edilebilir. Bir `.gitignore` (`node_modules`, `.env`, `dist`) eklenmesi önerilir.
- **D2. Firebase web API anahtarı** `index.htmll` dosyasında ve git geçmişinde duruyor. Firebase web anahtarları gizli bilgi sayılmaz, ancak Google Cloud Console'da HTTP referrer kısıtlaması ve App Check ile sınırlandırılması önerilir.
- **D3. Varsayılan KDV oranı %18.** Türkiye'de genel oran Temmuz 2023'ten beri %20. Ayarlardan değiştirilebiliyor, varsayılan değer güncellenebilir.
- **D4. Kalite Kontrol tablosunda "👁️ detay" butonu hiç çıkmıyor.** `_injectEyeBtns` fonksiyonu `editQuality` butonunu arıyor, ama bu buton yok.
- **D5. Kodda sabit değerler var.** Döviz kurları (USD 32.50 / EUR 35.20), Dashboard'daki "Aylık Üretim & Satış" grafiği verisi ve reçete ön ayarları sabit kodlanmış. Grafik gerçek veriyi göstermiyor.
- **D6. ESC tuşu CRM modallarını kapatmıyor.** Yalnızca `.modal.open` hedefleniyor.
- **D7. Bakım zorluğu.** Kodun büyük kısmı tek satıra sıkıştırılmış. Aynı fonksiyonlar sonradan sarmalanıyor (`renderProducts=function(){…}`) ve `onclick` metni regex ile ayrıştırılıyor (`applyRoleRestrictions`, `_injectEyeBtns`). Hataya çok açık bir yapı. Modüllere bölünmesi ve bir derleme adımı eklenmesi önerilir.
- **D8. Düzenleme yapılmayan kayıtlar için ayrı bir detay görünümü yok.** Örneğin kalite kaydı düzenlenemiyor. Bu bir özellik eksikliği.
