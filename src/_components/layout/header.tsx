import { LogoutButton } from "./logout-button";

type Props = {
  username: string;
};

export function Header({ username }: Props) {
  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Typecomp</h1>
        <p className="text-sm text-white/40 mt-0.5">
          Racing as <span className="text-white/80">{username}</span>
        </p>
      </div>
      <LogoutButton />
    </header>
  );
}
