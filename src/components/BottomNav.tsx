import { Link, useLocation } from "@tanstack/react-router";
import { UtensilsCrossed, ShoppingBag, ClipboardList, Settings, ChefHat } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useStaff } from "@/lib/staff-store";

type NavItem = { to: string; label: string; icon: typeof UtensilsCrossed; badge?: boolean; staffOnly?: boolean };
const ALL_ITEMS: NavItem[] = [
  { to: "/", label: "Cardápio", icon: UtensilsCrossed },
  { to: "/carrinho", label: "Carrinho", icon: ShoppingBag, badge: true },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/funcionario", label: "Cozinha", icon: ChefHat, staffOnly: true },
  { to: "/admin", label: "Admin", icon: Settings, staffOnly: true },
];

export function BottomNav() {
  const loc = useLocation();
  const { count } = useCart();
  const { isStaff } = useStaff();
  const items = ALL_ITEMS.filter((i) => !i.staffOnly || isStaff);
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2 py-2 safe-area-pb">
        {items.map((it) => {
          const active = loc.pathname === it.to || (it.to !== "/" && loc.pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to as "/"}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="relative">
                  <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                  {it.badge && count > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {count}
                    </span>
                  )}
                </span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border/60 py-1.5 text-center text-[10px] text-muted-foreground">
        Criado por <span className="font-semibold text-foreground">PrositeStudio</span>
      </div>
    </nav>
  );
}
