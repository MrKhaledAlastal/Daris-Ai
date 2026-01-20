import { Logo } from "@/components/icons/logo";

export default function SplashScreen() {
  const isSSR = typeof window === "undefined";

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-8">
      <div className="flex-grow flex items-center justify-center">
        <div role="status" aria-live="polite">
          <Logo
            className={`h-20 w-auto ${
              isSSR ? "" : "animate-pulse"
            } text-primary`}
          />
        </div>
      </div>
      <div className="text-center pb-4">
        <p className="text-sm text-muted-foreground">from</p>
        <p className="text-lg font-bold tracking-wider text-foreground">
          VEXTRONIC
        </p>
      </div>
    </div>
  );
}
