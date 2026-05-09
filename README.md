# Dengeli Dijital Çocuk Platformu (Balanced Digital Children's Platform)

Çocuklar için özel olarak tasarlanmış güvenli, bağımlılık yapmayan ve dengeli bir dijital öğrenme platformu.

---

## 🎯 Misyonumuz (Our Mission)
Bu platformun amacı, çocuklara dengeli ve kontrollü bir dijital öğrenme ortamı sunmaktır. Çocukların dijital bağımlılık tuzağına düşmeden öğrenmelerini ve eğlenmelerini sağlamak için nicelikten çok niteliğe öncelik veriyoruz.

---

## 🧩 Problem Tanımı ve Kapsam (Problem Definition & Scope)

**Problem:**
Çocuklar ekran karşısında saatlerce gözetimsiz kalıyor, bu da dijital bağımlılığa ve odaklanma zorluğuna yol açıyor. Çoğu uygulama, sonsuz kaydırma (Infinite Scroll) ve otomatik oynatma gibi bağımlılık yapıcı mekanizmalara dayanıyor. Bu durum ebeveynleri içerik ve zaman kontrolü konusunda çaresiz bırakıyor.

**Platformun Hedefi:**
Kaliteli zamana (belirli seanslara) odaklanan, ebeveynlere kapsamlı kontrol ve izleme araçları (Ebeveyn Kontrol Paneli) sunan güvenli bir eğitim ve eğlence platformu oluşturmak.

### Kapsam (Scope):
✅ **Uygulamaya dahil edilecekler:**
- **Güvenli Çocuk Modu:** Sonsuz kaydırma ve otomatik oynatma içermeyen basit arayüz.
- **Seans Belirleme:** Ebeveynler tarafından belirlenen katı zaman sınırlarına sahip seanslar.
- **Etkileşimli İçerik:** Hikayeler, zeka oyunları, mantıksal düşünme ve yaratıcı etkinlikler.
- **Sınırlı Öneriler:** Her etkinlikten sonra en fazla 3 farklı seçenek.
- **Ekran Dışı Zaman:** Seanslar arasında gerçek dünyada oyun oynamak için öneriler.

### 👨‍👩‍👧‍👦 Comprehensive Parent Panel
- **Screen Time Control:** Set and manage daily screen time limits.
- **Session Management:** Control the number of allowed sessions per day.
- **Instant Access Control:** Ability to pause or completely halt access at any time.
- **Secure Authentication:** Account creation requires SMS OTP verification to prevent unauthorized parent accounts.
- **Advanced Content Filtering (Safe Browsing):** 
  - Create a safe environment for your children to navigate the internet.
  - Set healthy boundaries by blocking inappropriate apps and games.
  - Restrict browsing on supported browsers (like Edge or Chrome) to child-friendly websites only.
  - Manage "Content Filtering Requests" from children when they try to access blocked content.
- **Usage Reports:** Monitor activities and view detailed usage analytics.
- **Ebeveyn Kontrol Paneli:** Ekran süresini, seans sayısını, içerik türünü ve kullanım raporlarını kontrol etmek için.

❌ **Uygulamaya dahil edilmeyecekler:**
- Sosyal ağlar veya herhangi bir sohbet özelliği.
- Reklamlar veya uygulama içi satın alımlar.
- Bağımlılık yapıcı mekanizmalar (sonsuz kaydırma, otomatik oynatma).
- Çocuğun ekranda kalma süresini uzatmak için Yapay Zeka (AI) kullanımı.

---

## 🛠️ Teknolojiler ve Araçlar (Tech Stack)

Uygulamanın verimli bir şekilde aynı kaynak kodundan (Web, iOS ve Android mobilde) başlatılmasını sağlamak için aşağıdaki araçlar seçilmiştir:

- **Temel Diller:** TypeScript / JavaScript / JSX / TSX
- **Tasarım ve Animasyonlar:** CSS, StyleSheet, React Native Reanimated, Lottie Files (dikkat dağıtmayan, eğlenceli animasyonlar için).
- **Geliştirme Ortamı (Framework):** React Native & Expo.
- **Yönlendirme ve Ekran Koruması (Routing):** Expo Router (çocuk modunu ebeveyn modundan şifre ile ayırmak için).
- **Durum Yönetimi ve Depolama (State):** Zustand & AsyncStorage.
- **Veritabanı ve Gerçek Zamanlı Senkronizasyon (Backend):** Supabase veya Firebase (ebeveyn kontrollerini çocuk cihazlarıyla senkronize etmek için).

---

## 👨‍👩‍👧‍👦 Kullanıcı Senaryoları (User Scenarios)

1. **Ebeveynlerin ekran süresini belirlemesi:**
   Ebeveyn kendi cihazını açar ve çocuk için günlük en fazla 45 dakikalık, 3 seansa bölünmüş bir süre belirler. Değişiklikler anında kaydedilir.
2. **Çocuğun hikaye dinlemesi:**
   Çocuk dikkat dağıtıcı unsurların olmadığı bir arayüzde bir hikaye seçer ve etkileşime girer. Hikaye bittiğinde, otomatik oynatma olmadan sadece 3 yeni seçenek sunulur.
3. **Çocuk performans raporu:**
   Birkaç gün sonra ebeveyn, kontrol panelini açarak çocuğun zamanının %60'ını hikayelerde, %40'ını zeka oyunlarında geçirdiğini ve belirlenen süreyi hiç aşmadığını gösteren grafikler görür.
4. **Ekran dışı oyun önerisi:**
   Seans süresi bittiğinde, ekran nazikçe durur ve çocuğa şu öneriyi sunan hareketli bir animasyon gösterilir: "Ekran süren doldu! Şimdi biraz bloklarla oynama veya bahçede koşma zamanı!". Uygulama otomatik olarak kapanır ve bir sonraki seans zamanına kadar çalışmaz.

---

## 📅 Çalışma ve Geliştirme Planı (15 Haftalık Plan)
Projenin sprintler halinde sorunsuz ilerlemesini sağlamak için **Çevik (Agile)** metodolojisini kullanıyoruz:

- **1. - 2. Hafta:** Projenin oluşturulması (Expo + React Native), dosya yapısının planlanması, uygulama yönlendirme mimarisinin (Navigation) tasarlanması ve çocuklar için PIN Kodu kilit ekranının oluşturulması.
- **3. - 5. Hafta:** Ebeveyn kullanıcı arayüzünün (Parent Dashboard) programlanması, ayarların kaydedilmesi için Zustand üzerinden durumun (State) bağlanması ve güvenli, çekici çocuk arayüzünün (Child Mode) ilk çekirdeğinin tasarlanması.
- **6. - 8. Hafta:** Seans ve zamanlayıcı sistemlerinin programlanması, çocuklar için ilk etkileşimli içeriğin eklenmesi ve Lottie/Reanimated ile animasyonların yapılması. Kullanım raporları ve ayar senkronizasyonu için bulut veritabanının bağlanmaya başlanması.
- **9. - 11. Hafta:** Çocukların kullanım verilerinin güvenli bir şekilde izlenmesine ve bu verilerin ebeveynler için ebeveyn gösterge panelinde güzel ve renkli grafiklerle detaylı raporlar halinde sunulmasına odaklanılması. Kararlılık testleri yapılması. (Alpha sürümü)
- **12. - 15. Hafta:** Gerçek kullanım testleri (Alpha & Beta Testing), hataların analiz edilmesi ve performans iyileştirmeleri, son belgelerin oluşturulması ve nihai teslimat.

---

## 🔗 Kaynaklar ve Referanslar (References)
* [Yazılım Gereksinim Analizi - Atlassian](https://www.atlassian.com/agile/requirements)
* [React Native Belgeleri](https://reactnative.dev/docs/getting-started)
* [Expo Paket Yöneticisi ve Sağlayıcısı Resmi Belgeleri](https://docs.expo.dev/)
* [Supabase Hizmetleri (Firebase'in açık kaynaklı alternatifi)](https://supabase.com/docs)
* [Expo Router Yönlendirme Sistemi](https://docs.expo.dev/routing/introduction/)
