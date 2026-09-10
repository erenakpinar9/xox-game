# XOX Arcade Edition v2

Klasik XOX (Tic-Tac-Toe) prototipinin, araştırılan varyantlarla genişletilmiş hâli.
Temel motor ve görsel dil korunarak üstüne yeni oyun modları, zamanlayıcı, geri alma,
kalıcı skor ve tema seçenekleri eklendi.

## Yeni varyantlar

- **Klasik** — orijinal 3×3 tahta, 3 sıra
- **Büyük Tahta 4×4** — 4×4 tahta, kazanmak için 4 taş art arda
- **Büyük Tahta 5×5** — 5×5 tahta, kazanmak için 4 taş art arda (5 şart değil, tempo önemli)
- **Sınırsız** — her oyuncunun tahtada en fazla 3 taşı kalır; 4. taşı koyunca
  en eski taşı otomatik kaybolur (parçalanmış sıralar dahil). Tahta hiçbir
  zaman dolmadığı için beraberlik imkansızdır — biri kazanana kadar oynanır.
- **Misère** — kurallar aynı, kazanan tersine döner: 3 sırayı ilk tamamlayan KAYBEDER
- **Ultimate XOX** — 3×3 düzende dizilmiş 9 mini XOX tahtası. Oynadığınız hücrenin
  konumu, rakibin bir sonraki hamlede hangi mini tahtaya mecbur kalacağını belirler.
  Meta tahtada 3 mini tahtayı art arda kazanan oyunu kazanır.

Her varyant hem iki oyunculu hem bilgisayara karşı modda oynanabilir. Klasik 3×3'te
"zor" AI tam minimax ile yenilmezdir; büyük tahtalarda, Sınırsız modda ve
Ultimate'te performans için derinlik sınırlı sezgisel bir AI kullanılır
(kazanma/engelleme önceliklidir; Sınırsız modda taşların kaybolacağını da hesaba katar).

## Yeni özellikler

- **Hamle zamanlayıcısı** — isteğe bağlı, 5/10/15 saniye. Süre dolarsa sıra otomatik
  rakibe geçer (AI'nın sırasında zamanlayıcı çalışmaz).
- **Geri al (undo)** — son hamleyi geri alır. Bilgisayara karşı modda tek tıkla hem
  kendi hamlenizi hem AI'nın cevabını birlikte geri alır.
- **Kalıcı skor tablosu** — skorlar artık `localStorage`'da, varyant + rakip
  kombinasyonuna göre ayrı ayrı saklanır; sayfa yenilense de kaybolmaz.
- **Tema seçici** — menüdeki daire simgesine tıklayarak Neon (varsayılan), Sunset,
  Forest ve Mono paletleri arasında geçiş yapılabilir; seçim kaydedilir.

Önceki sürümdeki kazanma çizgisi animasyonu, el çizimi X/O ikonları, konfeti,
Web Audio ses efektleri ve erişilebilirlik desteği (klavye odağı,
`prefers-reduced-motion`, ekran okuyucu etiketleri) tüm varyantlarda korunmuştur.

## Dosya yapısı

```
index.html   Ekran iskeleti (menü + oyun ekranı, tüm varyantlar için ortak)
style.css    Görsel tasarım (neon arcade teması + 3 alternatif palet)
app.js       Oyun motoru: klasik/büyük tahta/wild/misère ortak motor,
             Ultimate için ayrı alt motor, minimax + sezgisel AI, zamanlayıcı,
             undo, localStorage entegrasyonu, ses, konfeti
```

## Çalıştırma

Herhangi bir bağımlılık gerekmez. `index.html` dosyasını tarayıcıda açman
yeterli — tercihen basit bir yerel sunucu ile (ör. VS Code Live Server),
çünkü bazı tarayıcılar `file://` üzerinden font/ses/localStorage davranışlarını
kısıtlayabilir.

## Not

Skorlar `localStorage` ile cihazda saklanır (varyant + rakip başına ayrı).
Tarayıcı verilerini temizlersen sıfırlanır.
