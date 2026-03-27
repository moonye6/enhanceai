export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent mb-4"></div>
        <p className="text-slate-300">加载中...</p>
      </div>
    </div>
  );
}
