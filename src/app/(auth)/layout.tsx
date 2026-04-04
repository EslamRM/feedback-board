// src/app/(auth)/layout.tsx
// Auth pages don't show the main header — standalone layout
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
