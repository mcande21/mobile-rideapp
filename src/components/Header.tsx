"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

export function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "User", icon: User },
    { href: "/driver", label: "Driver", icon: Car },
  ];

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="p-2 bg-primary rounded-full">
            <Car className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Ride Queue</h1>
        </Link>
        <nav className="flex items-center gap-2 rounded-full bg-background p-1 border">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Button
              key={href}
              asChild
              variant={pathname === href ? "default" : "ghost"}
              className={cn(
                "rounded-full transition-all",
                pathname === href &&
                  "bg-primary text-primary-foreground shadow-md"
              )}
              size="sm"
            >
              <Link href={href} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}
