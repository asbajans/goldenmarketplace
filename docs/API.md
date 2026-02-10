# Golden Marketplace - API Belgelendirmesi

## Base URL

```
Development: http://localhost:3000/api
Production: https://api.goldenmarketplace.com/api
```

## Authentication

Tüm korumalı endpoints JWT token gerektirir.

### Header

```
Authorization: Bearer <JWT_TOKEN>
```

### Token Elde Etme

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "seller@example.com",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "seller@example.com",
    "userType": "seller"
  }
}
```

---

## 👤 Auth Endpoints

### Register (Kayıt)

```http
POST /auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "seller"
}

Response (201):
{
  "message": "User registered successfully",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "newuser@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "seller",
    "createdAt": "2026-02-05T10:30:00Z"
  }
}
```

### Login (Giriş)

```http
POST /auth/login
Content-Type: application/json

{
  "email": "seller@example.com",
  "password": "password123"
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "seller@example.com",
    "userType": "seller"
  }
}
```

### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🏪 Store Endpoints

### Mağaza Oluştur

```http
POST /stores
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "storeName": "My Awesome Store",
  "storeSlug": "my-awesome-store",
  "description": "Premium handmade products"
}

Response (201):
{
  "id": "store-uuid",
  "userId": "user-uuid",
  "storeName": "My Awesome Store",
  "storeSlug": "my-awesome-store",
  "description": "Premium handmade products",
  "isActive": true,
  "createdAt": "2026-02-05T10:30:00Z"
}
```

### Mağazayı Getir

```http
GET /stores/:storeId
Authorization: Bearer <TOKEN>

Response (200):
{
  "id": "store-uuid",
  "storeName": "My Awesome Store",
  "storeSlug": "my-awesome-store",
  "description": "Premium handmade products",
  "logo": "https://...",
  "banner": "https://...",
  "rating": 4.8,
  "totalProducts": 125,
  "isActive": true
}
```

### Mağaza Güncelle

```http
PUT /stores/:storeId
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "storeName": "Updated Store Name",
  "description": "New description"
}

Response (200):
{
  "message": "Store updated successfully",
  "store": { ... }
}
```

---

## 📦 Product Endpoints

### Ürün Listele

```http
GET /products?storeId=<STORE_ID>&category=<CATEGORY>&page=1&limit=20
Authorization: Bearer <TOKEN>

Response (200):
{
  "data": [
    {
      "id": "product-uuid",
      "storeId": "store-uuid",
      "title": "Gold Ring",
      "description": "18K Gold Ring",
      "category": "Jewelry",
      "basePrice": 1500,
      "goldIndexPrice": 0.75,
      "currency": "XAU",
      "quantity": 10,
      "images": ["https://...", "https://..."],
      "isActive": true,
      "createdAt": "2026-02-05T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 125,
    "pages": 7
  }
}
```

### Ürün Oluştur

```http
POST /products
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "storeId": "store-uuid",
  "title": "Gold Ring",
  "description": "18K Gold Ring",
  "category": "Jewelry",
  "sku": "RING-001",
  "basePrice": 1500,
  "quantity": 10,
  "images": ["https://image1.jpg", "https://image2.jpg"]
}

Response (201):
{
  "id": "product-uuid",
  "storeId": "store-uuid",
  "title": "Gold Ring",
  "basePrice": 1500,
  "goldIndexPrice": 0.75,
  "currency": "XAU",
  "quantity": 10,
  "isActive": true
}
```

### Ürün Güncelle

```http
PUT /products/:productId
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "title": "Updated Gold Ring",
  "basePrice": 1600,
  "quantity": 15
}

Response (200):
{
  "message": "Product updated successfully",
  "product": { ... }
}
```

### Ürünü Sil

```http
DELETE /products/:productId
Authorization: Bearer <TOKEN>

Response (200):
{
  "message": "Product deleted successfully"
}
```

### Altın Fiyatını Hesapla

```http
POST /products/calculate-gold-price
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "basePrice": 1500
}

Response (200):
{
  "basePrice": 1500,
  "goldPrice": 2050.25,
  "goldOunces": 0.7317,
  "currency": "XAU"
}
```

---

## 🔗 Integration Endpoints

### Entegrasyon Listele

```http
GET /integrations/:storeId
Authorization: Bearer <TOKEN>

Response (200):
{
  "data": [
    {
      "id": "integration-uuid",
      "storeId": "store-uuid",
      "marketplace": "etsy",
      "isConnected": true,
      "lastSyncDate": "2026-02-05T09:30:00Z",
      "syncStatus": "completed"
    }
  ]
}
```

### Entegrasyon Bağla (OAuth)

```http
POST /integrations/connect/:marketplace
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "storeId": "store-uuid",
  "authCode": "oauth-auth-code-from-marketplace"
}

Response (201):
{
  "id": "integration-uuid",
  "marketplace": "etsy",
  "isConnected": true,
  "createdAt": "2026-02-05T10:30:00Z"
}
```

### Entegrasyon Senkronize Et

```http
POST /integrations/:integrationId/sync
Authorization: Bearer <TOKEN>

Response (200):
{
  "message": "Sync started",
  "syncStatus": "in-progress"
}
```

### Entegrasyon Kaldır

```http
DELETE /integrations/:integrationId
Authorization: Bearer <TOKEN>

Response (200):
{
  "message": "Integration removed successfully"
}
```

### Pazaryeri Sipariş Çek

```http
GET /integrations/:integrationId/orders
Authorization: Bearer <TOKEN>

Response (200):
{
  "data": [
    {
      "orderId": "order-123",
      "marketplace": "etsy",
      "buyerName": "John Doe",
      "items": [
        {
          "productId": "product-uuid",
          "quantity": 2,
          "price": 1500
        }
      ],
      "totalAmount": 3000,
      "status": "pending",
      "createdAt": "2026-02-05T10:30:00Z"
    }
  ]
}
```

---

## 💳 Subscription Endpoints

### Abonelik Oluştur

```http
POST /subscriptions
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "marketplace": "etsy",
  "plan": "professional",
  "paymentMethodId": "pm_stripe_payment_method_id"
}

Response (201):
{
  "id": "subscription-uuid",
  "marketplace": "etsy",
  "plan": "professional",
  "status": "active",
  "price": 99.99,
  "currency": "USD",
  "startDate": "2026-02-05T10:30:00Z",
  "endDate": "2026-03-05T10:30:00Z"
}
```

### Abonelik Getir

```http
GET /subscriptions/:subscriptionId
Authorization: Bearer <TOKEN>

Response (200):
{
  "id": "subscription-uuid",
  "marketplace": "etsy",
  "plan": "professional",
  "status": "active",
  "price": 99.99,
  "startDate": "2026-02-05T10:30:00Z",
  "endDate": "2026-03-05T10:30:00Z"
}
```

### Abonelik İptal Et

```http
DELETE /subscriptions/:subscriptionId
Authorization: Bearer <TOKEN>

Response (200):
{
  "message": "Subscription cancelled successfully"
}
```

### Stripe Webhook

```http
POST /subscriptions/webhook
Content-Type: application/json
Stripe-Signature: <SIGNATURE>

// Stripe'dan gönderilen webhook payload
{
  "type": "invoice.payment_succeeded",
  "data": { ... }
}

Response (200):
{
  "received": true
}
```

---

## 👨‍💼 Admin Endpoints

### Tüm Kullanıcıları Listele

```http
GET /admin/users?page=1&limit=20
Authorization: Bearer <ADMIN_TOKEN>

Response (200):
{
  "data": [
    {
      "id": "user-uuid",
      "email": "seller@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "userType": "seller",
      "isActive": true,
      "createdAt": "2026-02-05T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

### Kullanıcı Deaktif Et

```http
PATCH /admin/users/:userId/deactivate
Authorization: Bearer <ADMIN_TOKEN>

Response (200):
{
  "message": "User deactivated successfully",
  "user": { ...}
}
```

### Sistem İstatistikleri

```http
GET /admin/stats
Authorization: Bearer <ADMIN_TOKEN>

Response (200):
{
  "totalUsers": 1500,
  "totalSellers": 450,
  "totalProducts": 25000,
  "totalRevenue": 500000,
  "activeSubscriptions": 380,
  "topMarketplaces": [
    { "name": "etsy", "count": 250 },
    { "name": "amazon", "count": 180 }
  ]
}
```

---

## 🔍 Hata Kodları

| Kod | Anlamı | Çözüm |
|-----|--------|-------|
| 400 | Bad Request | İstek parametrelerini kontrol edin |
| 401 | Unauthorized | Token göndermeniz gerekiyor |
| 403 | Forbidden | Bu işlemi yapmak için yetkiye sahip değilsiniz |
| 404 | Not Found | Aranan kaynak bulunamadı |
| 500 | Server Error | Sunucu hatası - tekrar deneyin |

### Hata Yanıtı Örneği

```json
{
  "error": {
    "message": "Product not found",
    "status": 404,
    "code": "PRODUCT_NOT_FOUND"
  }
}
```

---

## 📝 Rate Limiting

- Genel limit: 100 requests / 15 minutes
- Authenticated users: 500 requests / 15 minutes  
- Admin users: No limit

Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 89
X-RateLimit-Reset: 1644062400
```

---

Son Güncelleme: Şubat 5, 2026
