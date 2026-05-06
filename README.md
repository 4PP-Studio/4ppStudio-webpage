# 4PP Studio Webpage

Bu repo, 4PP Studio'nun Astro ile geliştirilen statik web sitesidir.

## Komutlar

Tüm komutlar proje kök dizininde çalıştırılır:

- `npm install` - Bağımlılıkları yükler.
- `npm run dev` - Lokal geliştirme sunucusunu başlatır.
- `npm run build` - Üretim derlemesini `dist/` klasörüne alır.
- `npm run preview` - Build çıktısını lokal olarak önizler.
- `npm run deploy` - Build alır ve sadece `dist` çıktısını `prod` branch'ine deploy eder.

## Deploy Akışı (GitHub Pages, Action olmadan)

Bu projede deploy işlemi `deploy.js` ile yapılır:

1. `main` (veya bulunduğun branch) üzerinde `npm run build` çalıştırılır.
2. Geçici bir git worktree ile `prod` branch hazırlanır.
3. `prod` branch içinde `.git` hariç tüm dosyalar temizlenir.
4. `dist/` içeriği `prod` branch köküne kopyalanır.
5. Değişiklik varsa commit ve push yapılır.

Bu sayede:

- `main` branch dosyaları silinmez/değiştirilmez.
- `.git` klasörü silinmez.
- `prod` branch'te yalnızca yayınlanacak statik dosyalar bulunur.

## GitHub Pages Ayarı

Repository ayarlarında:

- **Settings > Pages**
- **Source**: `Deploy from a branch`
- **Branch**: `prod`
- **Folder**: `/ (root)`
