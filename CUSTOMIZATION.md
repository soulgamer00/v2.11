# Customization Guide

Quick guide to customize VBD-DB v2.0 for your needs.

## 🎨 Branding

### 1. Logo & Favicon
Replace the placeholder favicon:
```
static/favicon.png  ← Replace with your logo (32x32 or 64x64)
```

### 2. Application Title
Edit `src/app.html`:
```html
<title>Your App Name - VBD-DB v2.0</title>
```

### 3. Sidebar Branding
Edit `src/routes/dashboard/+layout.svelte`:
```svelte
<div>
  <p class="font-bold">Your Org Name</p>
  <p class="text-xs text-base-content/60">Version 2.0</p>
</div>
```

## 🎨 Theme Customization

### Change Theme
Edit `tailwind.config.js`:
```javascript
daisyui: {
  themes: ['light', 'dark', 'cupcake', 'corporate'],  // Add more
  darkTheme: 'dark',
}
```

Available themes: light, dark, cupcake, bumblebee, emerald, corporate, synthwave, retro, cyberpunk, valentine, halloween, garden, forest, aqua, lofi, pastel, fantasy, wireframe, black, luxury, dracula, cmyk, autumn, business, acid, lemonade, night, coffee, winter

### Custom Colors
Edit `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      primary: '#your-color',
      secondary: '#your-color',
    }
  }
}
```

## 🌍 Language Customization

Currently in Thai. To add English:

### 1. Create Translation Files
```
src/lib/i18n/
├── th.json
└── en.json
```

### 2. Use Translation Library
Install i18n:
```bash
npm install svelte-i18n
```

### 3. Wrap Text
```svelte
<script>
  import { _ } from 'svelte-i18n';
</script>

<h1>{$_('dashboard.title')}</h1>
```

## 📝 Form Fields

### Add Custom Patient Fields
1. Update Prisma schema (`prisma/schema.prisma`):
```prisma
model Patient {
  // ... existing fields
  customField String?
}
```

2. Update form schema (`src/lib/schemas/case.ts`):
```typescript
customField: z.string().optional()
```

3. Add to form (`src/routes/dashboard/cases/new/+page.svelte`):
```svelte
<div class="form-control">
  <label>Custom Field</label>
  <input bind:value={$form.patient.customField} />
</div>
```

4. Run migration:
```bash
npm run db:generate
npm run db:push
```

## 📊 Custom Reports

### Add New Chart
Edit `src/routes/dashboard/reports/+page.svelte`:
```svelte
<script>
  let myChartCanvas: HTMLCanvasElement;
  
  onMount(() => {
    new Chart(myChartCanvas, {
      type: 'bar',
      data: { /* your data */ },
      options: { /* your options */ }
    });
  });
</script>

<canvas bind:this={myChartCanvas}></canvas>
```

### Add Custom Metric
Edit `src/routes/dashboard/reports/+page.server.ts`:
```typescript
// Calculate your metric
const myMetric = await prisma.caseReport.count({
  where: { /* your condition */ }
});

return {
  // ... existing data
  myMetric
};
```

## 🏥 Hospital-Specific Features

### Add Hospital Logo
1. Store logo URL in Hospital table:
```prisma
model Hospital {
  // ... existing fields
  logoUrl String?
}
```

2. Display in UI:
```svelte
{#if hospital.logoUrl}
  <img src={hospital.logoUrl} alt={hospital.name} />
{/if}
```

## 🔔 Notifications

### Discord Webhook (Already supported)
Set in `.env`:
```env
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

Use in code:
```typescript
const webhook = process.env.DISCORD_WEBHOOK_URL;
if (webhook) {
  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'New case reported!'
    })
  });
}
```

## 📱 Add New Master Data Category

1. Seed with new category:
```typescript
await prisma.masterData.createMany({
  data: [
    { category: 'YOUR_CATEGORY', value: 'Value 1' },
    { category: 'YOUR_CATEGORY', value: 'Value 2' },
  ]
});
```

2. Use in forms:
```svelte
{#each masterData.YOUR_CATEGORY as item}
  <option value={item.value}>{item.value}</option>
{/each}
```

## 🔐 Custom Roles

### Add New Role
1. Update Prisma enum:
```prisma
enum Role {
  SUPERADMIN
  ADMIN
  USER
  DOCTOR  // New role
}
```

2. Update permissions in `src/lib/server/auth.ts`

3. Run migration

## 📧 Email Integration

### Install Nodemailer
```bash
npm install nodemailer
```

### Send Email
```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

await transporter.sendMail({
  from: 'noreply@example.com',
  to: 'user@example.com',
  subject: 'New Case Alert',
  html: '<p>New case reported...</p>'
});
```

## 🎯 Custom Validation Rules

### Add Thai Address Validation
Edit `src/lib/utils/validation.ts`:
```typescript
export function validateThaiAddress(address: string): boolean {
  // Your custom logic
  return true;
}
```

Use in Zod schema:
```typescript
address: z.string().refine(validateThaiAddress, {
  message: 'Invalid Thai address format'
})
```

## 📊 Custom Export Formats

### Add CSV Export
```typescript
import { writeFileXLSX, utils } from 'xlsx';

// Convert to CSV
const csv = utils.sheet_to_csv(worksheet);

// Download
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
// ... trigger download
```

## 🔍 Advanced Search

### Add Full-Text Search
1. Install extension:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

2. Create index:
```sql
CREATE INDEX patient_search_idx ON "Patient" 
USING gin ((firstName || ' ' || lastName) gin_trgm_ops);
```

3. Use in query:
```typescript
const patients = await prisma.$queryRaw`
  SELECT * FROM "Patient"
  WHERE (firstName || ' ' || lastName) % ${search}
  ORDER BY similarity(firstName || ' ' || lastName, ${search}) DESC
`;
```

## 🎨 Custom Themes

### Create Your Own Theme
Add to `tailwind.config.js`:
```javascript
daisyui: {
  themes: [
    {
      mytheme: {
        "primary": "#your-color",
        "secondary": "#your-color",
        "accent": "#your-color",
        "neutral": "#your-color",
        "base-100": "#your-color",
      },
    },
  ],
}
```

## 🌐 Multi-Tenant Support

### Add Organization Model
```prisma
model Organization {
  id        Int       @id @default(autoincrement())
  name      String
  subdomain String    @unique
  users     User[]
  hospitals Hospital[]
}
```

### Filter by Organization
```typescript
const cases = await prisma.caseReport.findMany({
  where: {
    hospital: {
      organizationId: user.organizationId
    }
  }
});
```

## 🔧 Environment Variables

Add to `.env`:
```env
# Custom settings
APP_NAME="Your Hospital Name"
APP_LOGO_URL="https://..."
SUPPORT_EMAIL="support@example.com"
ENABLE_OFFLINE_MODE="true"
DEFAULT_THEME="corporate"
```

Use in code:
```typescript
const appName = process.env.APP_NAME || 'VBD-DB';
```

## 📱 PWA Setup (Progressive Web App)

### Install Vite PWA
```bash
npm install @vite-pwa/sveltekit
```

### Configure
```javascript
// vite.config.ts
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default {
  plugins: [
    SvelteKitPWA({
      manifest: {
        name: 'VBD-DB',
        short_name: 'VBD',
        theme_color: '#ffffff'
      }
    })
  ]
};
```

## 🎯 Performance Tuning

### Add Caching
```typescript
// Server-side caching
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 600 });

export async function load() {
  const cached = cache.get('key');
  if (cached) return cached;
  
  const data = await fetchData();
  cache.set('key', data);
  return data;
}
```

## 📱 Push Notifications

### Install Web Push
```bash
npm install web-push
```

### Setup Service Worker
```javascript
// static/service-worker.js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon.png'
  });
});
```

## 🎓 Further Customization

For complex customizations:
1. Review the source code
2. Check component documentation
3. Test in development first
4. Document your changes
5. Update tests

---

Need help? Check the source code or contact the development team!








