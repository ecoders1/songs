// User management has been removed — the app no longer requires accounts.
export default function AdminUsersPage() {
  return (
    <div className="text-center py-20">
      <p className="text-2xl mb-2">👥</p>
      <p className="text-gray-500 text-sm">User management has been removed.</p>
      <p className="text-gray-400 text-xs mt-1">This app is now fully public — no accounts required.</p>
    </div>
  );
}
