import { Link, useLocation } from "wouter";
import { Award, ClipboardSignature, FileCheck, Home, Settings, Users, FileBarChart } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ShellProps {
  children: ReactNode;
}

export default function Shell({ children }: ShellProps) {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/judges", label: "Judges", icon: Users },
    { href: "/score", label: "Score Entry", icon: ClipboardSignature },
    { href: "/tabulation/group", label: "Group Tab", icon: FileCheck },
    { href: "/tabulation/solo", label: "Solo Tab", icon: FileBarChart },
    { href: "/admin", label: "Admin", icon: Settings },
  ];

  return (
      <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      {/* Decorative noise/texture background */}
        <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

       <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/85 shadow-sm">
        <div className="container mx-auto flex h-16 items-center px-4 md:px-8">
          <div className="flex items-center gap-2 mr-8">
            <Award className="h-6 w-6 text-primary" />
            <Link href="/" className="font-serif font-bold text-lg tracking-tight tracking-wide text-foreground">
              <span className="text-primary">TAGOBTOB</span><span className="hidden sm:inline-block ml-1 opacity-80 text-sm">Competition</span>
            </Link>
          </div>
          
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent",
                  location === link.href ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <link.icon className="h-4 w-4" />
                <span className="whitespace-nowrap hidden md:inline-block">{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      
      <main className="flex-1 relative z-10 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
