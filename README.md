# AegisFlow — سامانه زنده کشف تقلب بانکی و پایش ریسک شاپرک و شتاب
### Real-Time Iranian FinTech & Shaparak/Shetab Fraud Detection Workbench

**AegisFlow (ایجیس‌فلو)** یک میز کار عملیاتی (Workbench) در سطح سازمانی برای تیم‌های مدیریت ریسک، پرداخت‌یارها (PSP)، نئوبانک‌ها و صرافی‌های رمزارز است که با **Next.js 16 (App Router)**، **TypeScript سخت‌گیرانه**، **Web Workers**، **Tailwind CSS v4** و **Framer Motion** توسعه داده شده است.

این سامانه جریان لحظه‌ای تراکنش‌های شبکه شتاب و شاپرک را **خارج از Main Thread مرورگر** با نرخ **۶۰ فریم بر ثانیه** پردازش می‌کند، داده‌های حساس هویتی (شماره کارت، شبا و کد ملی) را پشت لاگ ممیزی تغییرناپذیر محافظت می‌کند و فرآیند ۴ مرحله‌ای **تعلیق تسویه شاپرکی و ارسال گزارش معاملات مشکوک به مرکز اطلاعات مالی (FIU)** را با معماری **Optimistic UI + Automatic Rollback** اجرا می‌کند.

---

## قابلیت‌های کلیدی مهندسی و بومی‌سازی فین‌تک ایران

### ۱. موتور کشف تقلب بومی شبکه بانکی (Off-Thread Web Worker)
- **تشخیص خودکار بانک‌های عضو شتاب (BIN Lookup):** شناسایی آنی بانک صادرکننده (ملت، ملی، سامان، پاسارگاد، صادرات، پارسیان، آینده، بلوبانک) و نمایش شماره پیگیری شاپرک (**RRN**).
- **الگوهای تخصصی تقلب در ایران:**
  - **حساب اجاره‌ای (Rented Mule Account):** تشخیص گردش سریع ورودی و خروجی در بازه زمانی کوتاه.
  - **دور زدن سقف شتابی (Structuring):** شناسایی خرد کردن مبالغ نزدیک به سقف ۱۰ میلیون تومان کارت‌به‌کارت.
  - **ناهمخوانی استعلام شاهکار:** هشدار فوری در صورت عدم تطابق کد ملی، مالک سیم‌کارت و صاحب کارت.
  - **تراکنش با VPN / IP دیتاسنتر خارجی:** شناسایی تغییر ناگهانی آی‌پی از ایران به سرورهای خارجی روی دستگاه جدید.
  - **درگاه‌های پرریسک و صرافی‌ها:** پایش واریزهای سنگین و غیرمتعارف روی درگاه‌های پرداخت و صرافی‌های رمزارز.
- **توقف هوشمند جریان و بافر صف (`pendingQueue`):** با کلیک روی هر تراکنش یا فشردن کلید `Space`، جدول فوراً متوقف می‌شود تا ردیف‌ها زیر نشانگر کاربر جابه‌جا نشوند و تراکنش‌های جدید در صف انتظار ذخیره می‌شوند.

### ۲. واحد پولی دوگانه (تومان $\leftrightarrow$ ریال) و تقویم هجری شمسی
- **تبدیل آنی تومان (`IRT`) و ریال (`IRR`):** سوئیچ لحظه‌ای در هدر برای نمایش مبالغ مطابق رابط کاربری مشتری (تومان) یا هسته شاپرک و بانک مرکزی (ریال).
- **تقویم رسمی شمسی (`fa-IR-u-ca-persian`):** نمایش دقیق تاریخ و ساعت شمسی در نسخه فارسی و میلادی در نسخه انگلیسی بدون وابستگی خارجی.

### ۳. امنیت سازمانی، اعتبارسنجی کد ملی و کنترل دسترسی (RBAC)
- **اعتبارسنجی رقم کنترل کد ملی ایران:** بررسی الگوریتم رسمی پیمانه ۱۱ (`Modulo-11`) روی کد ملی ۱۰ رقمی دارنده حساب.
- **مخفی‌سازی اطلاعات محرمانه (Audit-Logged PII Masking):** شماره کامل کارت، شماره شبا (`IR...`)، کد ملی و آی‌پی به‌طور پیش‌فرض پوشانده شده‌اند و مشاهده آن‌ها رکورد تغییرناپذیر `PII_UNMASKED` در لاگ نشست ثبت می‌کند.
- **تفکیک سطح دسترسی (`RBAC`):** امکان جابه‌جایی آنی بین نقش **بازرس ارشد مبارزه با پول‌شویی** و **کارشناس پایش ریسک** برای بررسی محدودیت‌های مسدودسازی تسویه.
- **هدرهای امنیتی و محافظت CSRF/XSS:** پیکربندی `Content-Security-Policy (CSP)`، `X-Frame-Options: DENY`، هدر اختصاصی `x-aegis-csrf` در API Route (`/api/sar`) و پاک‌سازی ورودی‌های متنی.

### ۴. ویزارد ۴ مرحله‌ای گزارش FIU با شبیه‌ساز خطای سرور
- اعتبارسنجی شرطی فرم‌ها با **React Hook Form + Zod (`superRefine`)** بر اساس نوع تخلف.
- مجهز به **شبیه‌ساز تاب‌آوری (Fault Injection)** برای تست پاسخ‌های `200 OK`، خطای `500 Server Error` و `Timeout` و مشاهده بازگشت خودکار وضعیت تراکنش (**Optimistic Rollback**).

---

## تکنولوژی‌های استفاده‌شده (Tech Stack)

- **Framework:** Next.js 16 (App Router, SSG/SSR, Route Handlers, Proxy Middleware)
- **Language:** TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`, zero `any`)
- **Styling & Motion:** Tailwind CSS v4 (CSS Logical Properties for native RTL/LTR), Framer Motion, Lucide Icons, `next-themes`
- **State & Virtualization:** Zustand (Ring Buffer & Audit Store), TanStack Query, TanStack Virtual
- **Validation:** React Hook Form + Zod
- **Testing & CI:** Vitest, React Testing Library, Playwright E2E, GitHub Actions

---

## راه‌اندازی و اجرای تست‌ها

```bash
# 1. Install dependencies
npm install

# 2. Run development server (opens at http://localhost:3000/fa)
npm run dev

# 3. Run strict TypeScript type-checking
npm run typecheck

# 4. Run unit & integration tests (Vitest)
npm run test

# 5. Run end-to-end browser tests (Playwright)
npm run test:e2e