import { Avatar, AvatarFallback } from "../../../@/components/ui/avatar";

export function Header({
  title,
  userName,
}: {
  title: string;
  userName: string;
}) {
  return (
    <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md">
      <h1 className="text-sm font-bold uppercase tracking-widest text-slate-500">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs font-bold text-slate-300">{userName}</p>
          <p className="text-[10px] text-slate-500">User</p>
        </div>
        <Avatar className="h-8 w-8 border border-slate-700">
          <AvatarFallback className="bg-blue-600 text-xs">
            {userName[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
