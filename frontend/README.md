# 🎨 Frontend - Material Log System

Modern, mobile-first web application for material control and management, built with Next.js 16 (App Router).

## 🚀 Features

### ✅ Core Features
- **Authentication**: JWT-based login with role-based access control (Admin/Staff)
- **Dashboard**: Real-time statistics, quick search, and recent activity
- **Movement Log**: Full CRUD operations with advanced search and filters
- **Material Management**: Manage material master data
- **User Management**: Admin-only user management
- **Documentation**: Upload, view, and manage files per transaction
- **Mobile-First**: Responsive design optimized for field use

### 🔥 Advanced Features
- **Quick Search**: Instant search by Transaction ID, DO, or Driver
- **Advanced Filters**: Date range, material, and movement type filters
- **Auto Transaction ID**: Automatic generation of unique transaction IDs
- **File Upload**: Multiple file upload with category support
- **Image Gallery**: Beautiful grid layout with preview mode
- **Pagination**: Efficient data loading with pagination
- **Role-Based UI**: Different menus and access for Admin vs Staff

## 🛠️ Tech Stack

- **Framework**: Next.js 16.2.2 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 📁 Project Structure

```
frontend/src/
├── /app                      # Next.js App Router pages
│   ├── /login               # Login page
│   ├── /dashboard           # Dashboard with stats
│   ├── /movement-log        # Movement log list
│   │   ├── /[id]           # Movement log detail/edit
│   │   └── /new            # Create new movement log
│   ├── /material            # Material management
│   ├── /users               # User management (admin)
│   ├── /documents/[transactionId]  # Documentation page
│   ├── layout.tsx           # Root layout with providers
│   └── page.tsx             # Root redirect
├── /components
│   ├── /layout              # Layout components
│   │   ├── Sidebar.tsx      # Responsive sidebar
│   │   ├── Header.tsx       # Top header bar
│   │   └── DashboardLayout.tsx
│   ├── /forms               # Form components
│   │   └── MovementLogForm.tsx
│   └── /Providers.tsx       # React Query provider
├── /lib                     # Utilities and API
│   ├── api.ts               # Axios API client
│   ├── auth.ts              # Auth utilities
│   └── utils.ts             # Helper functions
├── /store                   # State management
│   └── authStore.ts         # Zustand auth store
├── /types                   # TypeScript types
│   └── index.ts             # All type definitions
└── /middleware.ts           # Route protection
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Backend API running (see `/backend` README)

### Installation

1. **Install dependencies**:
```bash
cd frontend
npm install
```

2. **Set up environment variables**:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

3. **Run development server**:
```bash
npm run dev
```

4. **Open browser**:
Navigate to `http://localhost:3001`

### Production Build

```bash
npm run build
npm start
```

## 📄 Pages Overview

### 🔐 Login (`/login`)
- Email and password authentication
- JWT token storage in cookies
- Auto-redirect to intended page

### 📊 Dashboard (`/dashboard`)
- Today's transaction count
- Total transactions
- Recent activity table
- Quick search by Transaction ID

### 📦 Movement Log (`/movement-log`)
- **List View**: Paginated table with all movement logs
- **Search**: By Transaction ID, DO, or Driver
- **Filters**: Date range, Material, Movement Type
- **Create New**: Button to add new movement log
- **Documentation Indicator**: ✅/❌ icon showing document status

### ➕ Create/Edit Movement Log (`/movement-log/new`, `/movement-log/[id]`)
- Auto-generated Transaction ID
- Dropdowns for Material, Locations, Movement Type
- Auto-fill material specifications
- Full form validation
- Link to documentation upload

### 📦 Material Management (`/material`)
- List all materials
- Create, edit, delete materials
- Modal forms for quick input
- Fields: Code, Name, Specification, Unit

### 👤 User Management (`/users`) - Admin Only
- List all users
- Create, edit, delete users
- Role assignment (Admin/Staff)
- Password management

### 📂 Documentation (`/documents/[transactionId]`)
- Gallery view with grid layout
- Upload multiple files (max 10)
- Image preview modal
- Category filtering
- File size and type display
- Delete functionality

## 🔐 Authentication Flow

1. User logs in at `/login`
2. Backend returns JWT token and user data
3. Token stored in httpOnly cookie (7 days)
4. Middleware protects all routes
5. Auto-redirect if not authenticated
6. Role-based access (Admin sees `/users`)

## 🎨 Design Principles

### Mobile-First
- Touch-friendly buttons (min 44px)
- Responsive tables (stacked on mobile)
- Hamburger menu for navigation
- Optimized for field use

### UX Best Practices
- Minimal clicks for common actions
- Auto-fill where possible
- Clear visual feedback
- Loading states
- Error messages

### Color Scheme
- **Primary**: Blue (#2563eb)
- **Success**: Green
- **Danger**: Red
- **Neutral**: Slate grays

## 🔗 API Integration

All API calls use Axios with:
- Automatic JWT token attachment
- 401 handling (auto-logout)
- Error interceptors
- React Query caching

### Base API Client
```typescript
// src/lib/api.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});
```

## 📱 Mobile Optimizations

- **Responsive Sidebar**: Drawer on mobile, fixed on desktop
- **Touch Targets**: Minimum 44px for all interactive elements
- **Stacked Layouts**: Forms stack vertically on small screens
- **Quick Actions**: Primary actions easily accessible
- **Camera Upload**: Native file picker supports camera

## 🔒 Security

- **JWT in Cookies**: HttpOnly, secure flags
- **Route Protection**: Middleware-based
- **Role-Based Access**: Admin vs Staff permissions
- **Input Validation**: Zod schemas
- **XSS Protection**: React's built-in protection

## 🧪 Testing

```bash
# Run linter
npm run lint

# Build for production
npm run build
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Performance

- **Code Splitting**: Automatic with Next.js
- **Image Optimization**: Next.js Image component
- **Data Caching**: React Query with 5min stale time
- **Lazy Loading**: Components loaded on demand
- **Pagination**: Limit data fetching

## 🐛 Troubleshooting

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `npm ci`
- Check TypeScript: `npm run lint`

### API Connection Issues
- Verify backend is running
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check CORS settings in backend

### Authentication Issues
- Clear browser cookies
- Check JWT expiration
- Verify backend JWT_SECRET

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3000` |

## 🔮 Future Enhancements

- [ ] Offline support with service workers
- [ ] Push notifications
- [ ] Export to Excel/PDF
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Bulk operations
- [ ] Audit trail view

## 📖 API Documentation

See backend README for complete API documentation.

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📄 License

Internal use only.

---

**Built with ❤️ using Next.js and Tailwind CSS**
