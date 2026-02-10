# Contributing to Golden Marketplace

Katkılarda bulunmak için lütfen aşağıdaki adımları izleyin.

## 🚀 Başlangıç

### 1. Fork et
Repository'i fork edin ve klonlayın.

```bash
git clone https://github.com/yourusername/golden-marketplace.git
cd golden-marketplace
```

### 2. Branch Oluştur
Yeni bir feature branch oluşturun.

```bash
git checkout -b feature/amazing-feature
```

### 3. Değişiklikleri Yapın
Kodunuzu yazın ve testler ekleyin.

```bash
# Linting
npm run lint

# Testler
npm test

# Buildleme
npm run build
```

### 4. Commit Et
Anlamlı bir mesajla commit edin.

```bash
git commit -m "feat: amazing feature description"
```

### 5. Push Et
Branch'i push edin.

```bash
git push origin feature/amazing-feature
```

### 6. Pull Request Açın
GitHub'dan Pull Request açın.

## 📋 Kod Stilı

### Naming Conventions

**Classes:**
```typescript
export class ProductService { }
export class AuthController { }
```

**Functions:**
```typescript
export function getUserById(id: string) { }
export const createProduct = (data) => { }
```

**Variables:**
```typescript
const isActive = true;
let productId = '123';
```

**Constants:**
```typescript
const MAX_PRODUCT_TITLE_LENGTH = 255;
const DEFAULT_PAGE_SIZE = 20;
```

### File Naming

```
src/
├── models/
│   └── User.ts          (PascalCase)
├── controllers/
│   └── authController.ts (camelCase + Suffix)
├── services/
│   └── goldPriceService.ts
├── utils/
│   └── validation.ts
└── types/
    └── interfaces.ts
```

## 🧪 Testing

Tüm yeni özelliklerin test edilmesi gereklidir.

```bash
# Unit Tests
npm test -- src/services/__tests__/goldPriceService.test.ts

# Integration Tests
npm test -- src/controllers/__tests__/authController.test.ts

# Coverage
npm test -- --coverage
```

## 📝 Commit Mesajları

Semantik versiyonlamayı kullanın:

```
feat: yeni özellik ekle
fix: hata düzelt
docs: dokümantasyon güncellemesi
style: kod style değişikliği
refactor: kod yeniden düzenleme
test: test ekleme/düzeltme
chore: proje yapısı değişikliği
```

### Örnekler:
```
feat: add gold-indexed pricing calculation
fix: resolve stripe webhook validation error
docs: update API documentation for products
refactor: extract marketplace integration logic
test: add unit tests for authentication
```

## 🔄 Pull Request Süreci

1. **PR Description Yazın**
   - Değişiklikleri açıkla
   - İlgili issues'ı mention et (#123)
   - Önemli kararları belirt

2. **Checklist**
   - [ ] Kodu test ettim
   - [ ] Dokümantasyon güncelledim
   - [ ] Hiç breaking change yok
   - [ ] Kod stiline uydum

3. **Review Almak**
   - En az 1 review gerekli
   - Feedback'lere cevap ver
   - Requested changes'ları yap

## 🐛 Bug Reportlama

### Template

```markdown
**Açıklama**
Hata hakkında kısa açıklama

**Adımlar**
1. Adım 1
2. Adım 2
3. Adım 3

**Beklenen Davranış**
Ne olması gerektiği

**Gerçek Davranış**
Ne olduğu

**Ortam**
- OS: Windows/Linux/Mac
- Node: v18.0.0
- npm: v9.0.0
```

## 💡 Feature Request

```markdown
**Açıklama**
Yeni özellik hakkında açıklama

**Faydaları**
Bu özellik neden gerekli?

**Alternatifler**
Başka çözümler?

**Ek Bilgi**
Diğer önemli bilgiler?
```

## 📚 Dokümantasyon

Yeni özellikleri dokümante edin:

1. **Code Comments**
   ```typescript
   /**
    * Calculate gold indexed price
    * @param basePrice - Base price in USD
    * @returns Gold price in ounces (XAU)
    */
   export async function calculateGoldPrice(basePrice: number): Promise<number> {
   ```

2. **README Updates**
   ```markdown
   ### New Feature
   Description and usage examples
   ```

3. **API Documentation**
   - Endpoints'i docs/API.md'ye ekle
   - Request/Response örnekleri ver

## 🚀 Release Process

1. Version bump (semantic versioning)
2. Changelog update
3. Tag oluştur
4. Release oluştur

## ❓ Sorular?

- Discord'da soru sor
- GitHub Issues'da discussion aç
- Email: dev@goldenmarketplace.com

---

**Teşekkürler katkılarınız için! ❤️**
